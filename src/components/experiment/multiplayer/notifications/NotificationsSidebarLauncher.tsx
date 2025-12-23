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

interface NotificationsSidebarLauncherProps {
  enabled?: boolean;
}

export function NotificationsSidebarLauncher({
  enabled = true,
}: NotificationsSidebarLauncherProps) {
  const router = useRouter();
  const {
    data: multiplayerNotifications = [],
    isLoading,
    isFetching,
    refetch,
  } = useAllMultiplayerNotifications({ limit: 50 });
  const [notifications, setNotifications] = useState<MultiplayerNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const isLoadingState = isLoading || isFetching;
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );
  const markNotificationReadMutation = useMarkMultiplayerNotificationRead();
  const markAllNotificationsReadMutation = useMarkAllMultiplayerNotificationsRead();

  useEffect(() => {
    setNotifications((prev) => {
      if (prev.length === multiplayerNotifications.length) {
        const same = prev.every((item, idx) => {
          const next = multiplayerNotifications[idx];
          return (
            next &&
            item.id === next.id &&
            item.boardId === next.boardId &&
            item.boardTitle === next.boardTitle &&
            item.userName === next.userName &&
            item.count === next.count &&
            item.timestamp === next.timestamp &&
            item.isRead === next.isRead &&
            item.pointTitle === next.pointTitle &&
            item.type === next.type &&
            item.action === next.action
          );
        });
        if (same) return prev;
      }
      return multiplayerNotifications;
    });
  }, [multiplayerNotifications]);

  const handleNotificationRead = useCallback(
    async (notification: MultiplayerNotification) => {
      const targetIds = new Set(notification.ids ?? [notification.id]);
      setNotifications((prev) =>
        prev.map((n) => {
          const match =
            (n.ids && n.ids.some((id) => targetIds.has(id))) ||
            targetIds.has(n.id);
          return match ? { ...n, isRead: true } : n;
        })
      );
      try {
        if (targetIds.size > 1) {
          await markAllNotificationsReadMutation.mutateAsync(Array.from(targetIds));
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
            ? { ...n, isRead: true }
            : n
        )
      );
      try {
        await markAllNotificationsReadMutation.mutateAsync(notificationIds);
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

  if (!enabled) return null;

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
            <div className="text-[9px] text-stone-500 [writing-mode:vertical-lr] rotate-180">NOTIFY</div>
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
        linkLabel="View board"
      />
    </>
  );
}
