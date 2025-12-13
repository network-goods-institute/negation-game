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
} from "@/components/experiment/multiplayer/notifications/demoData";

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
    isRead: Boolean(row.readAt),
    commentPreview: row.content || undefined,
  };
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
    () => (query.data || []).map(toSidebarNotification),
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
