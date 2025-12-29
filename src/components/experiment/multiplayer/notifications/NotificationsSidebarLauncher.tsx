"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { NotificationsSidebar } from "./NotificationsSidebar";
import { useAllMultiplayerNotifications } from "@/queries/experiment/multiplayer/useMultiplayerNotifications";
import type { MultiplayerNotification } from "./types";
import { useMarkAllMultiplayerNotificationsRead, useMarkMultiplayerNotificationRead } from "@/mutations/experiment/multiplayer/useMarkMultiplayerNotificationsRead";
import { recordOpen } from "@/actions/experimental/rationales";
import { logger } from "@/lib/logger";
import { isFeatureEnabled } from "@/lib/featureFlags";

interface NotificationsSidebarLauncherProps {
  enabled?: boolean;
}

const aggregateNotificationsByBoard = (
  notifications: MultiplayerNotification[],
  localReadIds: Set<string>
): MultiplayerNotification[] => {
  const byBoard = new Map<
    string,
    {
      boardId: string;
      boardTitle?: string | null;
      ids: Set<string>;
      count: number;
      unreadCount: number;
      actorNames: Set<string>;
      avatarUrls: Set<string>;
      latestCreatedAt: Date | null;
      latestNotification: MultiplayerNotification | null;
    }
  >();

  notifications.forEach((notification) => {
    const boardId = notification.boardId;
    if (!boardId) return;
    const ids = notification.ids && notification.ids.length > 0
      ? notification.ids
      : [notification.id];
    const localReadCount = ids.reduce((count, id) => count + (localReadIds.has(id) ? 1 : 0), 0);
    const baseUnread = notification.unreadCount
      ?? (notification.isRead ? 0 : (notification.count ?? ids.length ?? 1));
    let effectiveUnread = baseUnread;
    if (localReadCount > 0 && baseUnread >= localReadCount) {
      effectiveUnread = baseUnread - localReadCount;
    }
    const effectiveNotification = {
      ...notification,
      ids,
      isRead: effectiveUnread === 0,
      unreadCount: effectiveUnread,
    };
    const entry =
      byBoard.get(boardId) ??
      {
        boardId,
        boardTitle: effectiveNotification.boardTitle ?? null,
        ids: new Set<string>(),
        count: 0,
        unreadCount: 0,
        actorNames: new Set<string>(),
        avatarUrls: new Set<string>(),
        latestCreatedAt: null,
        latestNotification: null,
      };

    ids.forEach((id) => entry.ids.add(id));
    const increment = effectiveNotification.count ?? ids.length ?? 1;
    entry.count += increment;
    const unreadIncrement = effectiveNotification.unreadCount
      ?? (effectiveNotification.isRead ? 0 : increment);
    entry.unreadCount += unreadIncrement;

    const names = effectiveNotification.actorNames && effectiveNotification.actorNames.length > 0
      ? effectiveNotification.actorNames
      : effectiveNotification.userName
        ? [effectiveNotification.userName]
        : [];
    names.forEach((name) => {
      if (name) entry.actorNames.add(name);
    });
    effectiveNotification.avatarUrls?.forEach((url) => {
      if (url) entry.avatarUrls.add(url);
    });

    if (!entry.boardTitle && effectiveNotification.boardTitle) {
      entry.boardTitle = effectiveNotification.boardTitle;
    }

    const createdAt = effectiveNotification.createdAt ? new Date(effectiveNotification.createdAt) : null;
    if (!entry.latestNotification) {
      entry.latestNotification = effectiveNotification;
      entry.latestCreatedAt = createdAt;
    }
    if (createdAt && (!entry.latestCreatedAt || createdAt > entry.latestCreatedAt)) {
      entry.latestCreatedAt = createdAt;
      entry.latestNotification = effectiveNotification;
    }

    byBoard.set(boardId, entry);
  });

  return Array.from(byBoard.values())
    .map((entry) => {
      const latest = entry.latestNotification;
      const actorNames = Array.from(entry.actorNames).filter(Boolean).slice(0, 3);
      const avatarUrls = Array.from(entry.avatarUrls).filter(Boolean).slice(0, 3);

    return {
      id: entry.boardId,
      ids: Array.from(entry.ids),
      boardId: entry.boardId,
      boardTitle: entry.boardTitle ?? null,
      type: latest?.type ?? "comment",
        userName: actorNames[0] ?? latest?.userName ?? "Someone",
      action: latest?.action ?? "updated",
      pointTitle: latest?.pointTitle ?? "this",
      pointId: latest?.pointId ?? entry.boardId,
      timestamp: latest?.timestamp ?? "",
      isRead: entry.unreadCount === 0,
      unreadCount: entry.unreadCount,
      createdAt: entry.latestCreatedAt ?? latest?.createdAt ?? null,
      commentPreview: undefined,
      avatarUrls: avatarUrls.length ? avatarUrls : undefined,
      actorNames: actorNames.length ? actorNames : undefined,
      count: entry.count,
    };
  })
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
};

export function NotificationsSidebarLauncher({
  enabled = true,
}: NotificationsSidebarLauncherProps) {
  const router = useRouter();
  const mpNotificationsEnabled = isFeatureEnabled("mpNotifications");
  const [isOpen, setIsOpen] = useState(false);
  const {
    data: multiplayerNotifications = [],
    isLoading,
    isFetching,
    refetch,
  } = useAllMultiplayerNotifications({ limit: 50, pauseAutoRefresh: isOpen });
  const [notifications, setNotifications] = useState<MultiplayerNotification[]>([]);
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(new Set());
  const isLoadingState = isLoading || isFetching;
  const aggregatedNotifications = useMemo(
    () => aggregateNotificationsByBoard(multiplayerNotifications, localReadIds),
    [multiplayerNotifications, localReadIds]
  );
  const unreadCount = useMemo(() => {
    const source = notifications.length > 0 ? notifications : aggregatedNotifications;
    return source.reduce((sum, notification) => {
      const unread = notification.unreadCount
        ?? (notification.isRead ? 0 : (notification.count ?? notification.ids?.length ?? 1));
      return sum + unread;
    }, 0);
  }, [notifications, aggregatedNotifications]);
  const markNotificationReadMutation = useMarkMultiplayerNotificationRead();
  const markAllNotificationsReadMutation = useMarkAllMultiplayerNotificationsRead();

  useEffect(() => {
    setNotifications((prev) => {
      if (prev.length === aggregatedNotifications.length) {
        const same = prev.every((item, idx) => {
          const next = aggregatedNotifications[idx];
          return (
            next &&
            item.id === next.id &&
            item.boardId === next.boardId &&
            item.boardTitle === next.boardTitle &&
            item.userName === next.userName &&
            item.count === next.count &&
            item.timestamp === next.timestamp &&
            item.isRead === next.isRead &&
            item.unreadCount === next.unreadCount &&
            item.type === next.type
          );
        });
        if (same) return prev;
      }
      return aggregatedNotifications;
    });
  }, [aggregatedNotifications]);

  const handleNotificationRead = useCallback(
    async (notification: MultiplayerNotification) => {
      const targetIds = new Set(notification.ids ?? [notification.id]);
      setNotifications((prev) =>
        prev.map((n) => {
          const match =
            (n.ids && n.ids.some((id) => targetIds.has(id))) ||
            targetIds.has(n.id);
          return match ? { ...n, isRead: true, unreadCount: 0 } : n;
        })
      );
      setLocalReadIds((prev) => {
        const next = new Set(prev);
        targetIds.forEach((id) => next.add(id));
        return next;
      });
      try {
        if (targetIds.size > 1) {
          await markAllNotificationsReadMutation.mutateAsync({
            ids: Array.from(targetIds),
            showToast: false,
          });
        } else {
          const [id] = Array.from(targetIds);
          await markNotificationReadMutation.mutateAsync(id);
        }
      } catch (error) {
        logger.error("Failed to mark multiplayer notification read", error);
      }
    },
    [markAllNotificationsReadMutation, markNotificationReadMutation]
  );

  const handleMarkAllNotificationsRead = useCallback(
    async (notificationIds: string[]) => {
      if (!notificationIds.length) return;
      const targetIds = new Set(notificationIds);
      setNotifications((prev) =>
        prev.map((n) =>
          (n.ids && n.ids.some((id) => targetIds.has(id))) || targetIds.has(n.id)
            ? { ...n, isRead: true, unreadCount: 0 }
            : n
        )
      );
      setLocalReadIds((prev) => {
        const next = new Set(prev);
        targetIds.forEach((id) => next.add(id));
        return next;
      });
      try {
        await markAllNotificationsReadMutation.mutateAsync({
          ids: notificationIds,
          showToast: true,
        });
      } catch (error) {
        logger.error("Failed to mark multiplayer notifications read", error);
      }
    },
    [markAllNotificationsReadMutation]
  );

  const handleNavigateToPoint = useCallback(
    (_pointId: string, boardId?: string) => {
      if (!boardId) return;
      const targetPath = `/experiment/rationale/multiplayer/${encodeURIComponent(boardId)}`;
      recordOpen(boardId).catch((error) => logger.warn("Failed to record board open", error));
      router.push(targetPath);
    },
    [router]
  );

  if (!enabled || !mpNotificationsEnabled) return null;

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-1/3 right-0 z-[70] bg-white/95 backdrop-blur-sm border-2 border-r-0 border-stone-300 rounded-l-lg shadow-lg hover:shadow-xl hover:-translate-x-1 transition-all py-6 px-2 group"
          title="Notifications"
        >
          <div className="flex flex-col items-center gap-2">
            <Bell className="h-4 w-4 text-stone-700" />
            {isLoadingState ? (
              <div className="rounded-full w-6 h-6 border-2 border-red-300 border-l-transparent animate-spin" aria-label="Loading notifications" />
            ) : unreadCount > 0 ? (
              <div className="bg-red-500 rounded-full w-6 h-6 flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">{unreadCount}</span>
              </div>
            ) : null}
          </div>
        </button>
      )}
      <NotificationsSidebar
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        notifications={notifications}
        onNotificationsUpdate={setNotifications}
        onNotificationRead={handleNotificationRead}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onNavigateToPoint={handleNavigateToPoint}
        isLoading={isLoadingState}
        onRefresh={() => refetch()}
        showBoardContext
        linkLabel="Go to board"
      />
    </>
  );
}
