import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { useAuthenticatedQuery } from "@/queries/auth/useAuthenticatedQuery";
import { useUser } from "@/queries/users/useUser";
import { useAppVisibility } from "@/hooks/utils/useAppVisibility";
import {
  getMultiplayerNotifications,
  getMultiplayerNotificationSummaries,
  type MultiplayerNotificationRecord,
} from "@/actions/experiment/multiplayer/notifications";
import type {
  MultiplayerNotification,
  MultiplayerBoardNotificationSummary,
} from "@/components/experiment/multiplayer/notifications/types";

const defaultActionForType: Record<string, string> = {
  support: "supported",
  negation: "negated",
  objection: "objected to",
  comment: "commented on",
  upvote: "upvoted",
};

export const toSidebarNotification = (
  row: MultiplayerNotificationRecord
): MultiplayerNotification => {
  const createdAt = row.createdAt ? new Date(row.createdAt) : new Date();
  const timestamp = formatDistanceToNow(createdAt, { addSuffix: true });

  return {
    id: row.id,
    boardId: row.docId,
    type: row.type as MultiplayerNotification["type"],
    userName: row.actorUsername || "Someone",
    action: row.action || defaultActionForType[row.type] || "updated",
    pointTitle: row.title,
    pointId: row.nodeId || row.edgeId || row.docId,
    timestamp,
    createdAt,
    isRead: Boolean(row.readAt),
    commentPreview: row.content || undefined,
    avatarUrls: row.actorAvatarUrl ? [row.actorAvatarUrl] : undefined,
    actorNames: row.actorUsername ? [row.actorUsername] : undefined,
    ids: [row.id],
    count: 1,
  };
};

const formatActorSummary = (
  actors: string[],
  totalCount: number,
  actorCounts: Map<string, number>
) => {
  const names = actors.filter(Boolean);
  const actorCount = names.length;
  if (actorCount === 0) {
    return totalCount > 1 ? `${totalCount} people` : "Someone";
  }
  if (actorCount === 1) {
    const [name] = names;
    const repeats = actorCounts.get(name) ?? totalCount;
    if (repeats > 1) return `${name} (${repeats}x)`;
    return name;
  }
  if (actorCount === 2) {
    if (totalCount > actorCount) {
      return `${names[0]} and ${names[1]} (${totalCount}x)`;
    }
    return `${names[0]} and ${names[1]}`;
  }
  const remainder = actorCount - 2;
  const suffix =
    totalCount > actorCount ? ` (${totalCount}x)` : "";
  return `${names[0]}, ${names[1]} and ${remainder} other${remainder === 1 ? "" : "s"}${suffix}`;
};

export const aggregateMultiplayerNotifications = (
  rows: MultiplayerNotificationRecord[]
): MultiplayerNotification[] => {
  const groups = new Map<
    string,
    {
      ids: string[];
      docId: string;
      pointId: string;
      title: string;
      type: MultiplayerNotification["type"];
      actionLabel: string;
      actorNames: Set<string>;
      actorCounts: Map<string, number>;
      avatarUrls: Set<string>;
      unreadCount: number;
      latestCreatedAt: Date | null;
      latestComment?: string | null;
    }
  >();

  rows.forEach((row) => {
    const pointId = row.nodeId || row.edgeId || row.docId;
    const key = `${row.docId}:${pointId}:${row.type}`;
    const group =
      groups.get(key) ||
      {
        ids: [],
        docId: row.docId,
        pointId,
        title: row.title,
        type: row.type as MultiplayerNotification["type"],
        actionLabel: row.action || defaultActionForType[row.type] || "updated",
        actorNames: new Set<string>(),
        actorCounts: new Map<string, number>(),
        avatarUrls: new Set<string>(),
        unreadCount: 0,
        latestCreatedAt: null,
        latestComment: null,
      };

    group.ids.push(row.id);
    if (row.actorUsername) {
      group.actorNames.add(row.actorUsername);
      const prev = group.actorCounts.get(row.actorUsername) ?? 0;
      group.actorCounts.set(row.actorUsername, prev + 1);
    }
    if (row.actorAvatarUrl) {
      group.avatarUrls.add(row.actorAvatarUrl);
    }
    if (!row.readAt) {
      group.unreadCount += 1;
    }
    if (!group.latestCreatedAt || (row.createdAt && row.createdAt > group.latestCreatedAt)) {
      group.latestCreatedAt = row.createdAt ?? null;
      if (row.content) {
        group.latestComment = row.content;
      }
    }

    groups.set(key, group);
  });

  return Array.from(groups.values())
    .sort((a, b) => {
      const aTime = a.latestCreatedAt ? a.latestCreatedAt.getTime() : 0;
      const bTime = b.latestCreatedAt ? b.latestCreatedAt.getTime() : 0;
      return bTime - aTime;
    })
    .map((group) => {
      const actorList = Array.from(group.actorNames);
      const actorSummary = formatActorSummary(
        actorList,
        group.ids.length,
        group.actorCounts
      );
      const createdAt = group.latestCreatedAt ? new Date(group.latestCreatedAt) : new Date();
      const timestamp = formatDistanceToNow(createdAt, { addSuffix: true });
      const avatarList = Array.from(group.avatarUrls).filter(Boolean).slice(0, 3);
      const actorNames = actorList.slice(0, 3);

      return {
        id: group.ids[0],
        ids: group.ids,
        boardId: group.docId,
        type: group.type,
        userName: actorSummary,
        action: group.actionLabel,
        pointTitle: group.title,
        pointId: group.pointId,
        timestamp,
        createdAt,
        isRead: group.unreadCount === 0,
        commentPreview: group.type === "comment" ? group.latestComment || undefined : undefined,
        avatarUrls: avatarList.length ? avatarList : undefined,
        actorNames: actorNames.length ? actorNames : undefined,
        count: group.ids.length,
      };
    });
};

export interface UseMultiplayerNotificationsOptions {
  docId?: string | null;
  unreadOnly?: boolean;
  limit?: number;
}

export const useMultiplayerNotifications = (
  options: UseMultiplayerNotificationsOptions
) => {
  const { data: user } = useUser();
  const isVisible = useAppVisibility();
  const enabled = Boolean(user?.id && options.docId);
  const normalizedOptions = useMemo(
    () => ({
      ...options,
      docId: options.docId || undefined,
    }),
    [options]
  );

  const query = useAuthenticatedQuery({
    queryKey: ["mp-notifications", user?.id, normalizedOptions],
    queryFn: () => getMultiplayerNotifications(normalizedOptions),
    enabled,
    refetchInterval: isVisible ? 30000 : false,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const mapped = useMemo(
    () => aggregateMultiplayerNotifications(query.data || []),
    [query.data]
  );

  return { ...query, data: mapped };
};

export const useMultiplayerNotificationSummaries = () => {
  const { data: user } = useUser();
  const isVisible = useAppVisibility();
  const enabled = Boolean(user?.id);

  const query = useAuthenticatedQuery({
    queryKey: ["mp-notifications", "summaries", user?.id],
    queryFn: () => getMultiplayerNotificationSummaries(),
    enabled,
    refetchInterval: isVisible ? 30000 : false,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const mapped = useMemo<MultiplayerBoardNotificationSummary[] | undefined>(
    () =>
      query.data?.map((summary) => ({
        boardId: summary.docId,
        boardTitle: summary.docTitle || "Untitled",
        notifications: summary.notifications.map((n) => ({
          type: n.type,
          message: n.message,
        })),
        totalCount: summary.totalCount,
        unreadCount: summary.unreadCount,
      })),
    [query.data]
  );

  return { ...query, data: mapped };
};
