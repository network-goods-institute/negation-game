"use client";

import type React from "react";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Bell, X, ChevronRight, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils/cn";
import type { MultiplayerNotification } from "./types";

interface NotificationsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToPoint?: (pointId: string, boardId?: string) => void;
  notifications?: MultiplayerNotification[];
  onNotificationsUpdate?: (notifications: MultiplayerNotification[]) => void;
  onNotificationRead?: (notification: MultiplayerNotification) => void;
  onMarkAllRead?: (ids: string[]) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
}

const isOtherActivity = (type: MultiplayerNotification["type"]) => {
  return type === "negation" || type === "objection";
};

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
};

export function NotificationsSidebar({
  isOpen,
  onClose,
  onNavigateToPoint,
  notifications: notificationsProp,
  onNotificationsUpdate,
  onNotificationRead,
  onMarkAllRead,
  isLoading = false,
  onRefresh,
}: NotificationsSidebarProps) {
  const [notifications, setNotifications] = useState<MultiplayerNotification[]>(
    notificationsProp ?? []
  );
  const [rendered, setRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [showNegative, setShowNegative] = useState(false);
  const [lastHiddenOpenedAt, setLastHiddenOpenedAt] = useState<Date | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      setIsClosing(false);
    } else if (rendered && !isClosing) {
      setIsClosing(true);
    }
  }, [isOpen, rendered, isClosing]);

  useEffect(() => {
    if (!isClosing) return;
    const fallbackTimer = window.setTimeout(() => {
      setRendered(false);
      setIsClosing(false);
    }, 300);
    return () => window.clearTimeout(fallbackTimer);
  }, [isClosing]);

  const handleAnimationEnd = useCallback((e: React.AnimationEvent) => {
    if (isClosing && e.animationName.includes("exit")) {
      setRendered(false);
      setIsClosing(false);
    }
  }, [isClosing]);

  useEffect(() => {
    if (notificationsProp) {
      setNotifications(notificationsProp);
    }
  }, [notificationsProp]);

  const filteredNotifications = useMemo(() => {
    if (showNegative) {
      return notifications;
    }
    return notifications.filter((n) => !isOtherActivity(n.type));
  }, [notifications, showNegative]);

  const hiddenNegativeUnreadNotifications = useMemo(
    () => notifications.filter((n) => isOtherActivity(n.type) && !n.isRead),
    [notifications]
  );

  const hiddenNegativeCount = useMemo(
    () => hiddenNegativeUnreadNotifications.length,
    [hiddenNegativeUnreadNotifications]
  );

  const hiddenNegativeNewCount = useMemo(() => {
    const lastOpenedMs = lastHiddenOpenedAt?.getTime() ?? 0;
    return hiddenNegativeUnreadNotifications.filter((n) => {
      const createdAtMs =
        n.createdAt instanceof Date
          ? n.createdAt.getTime()
          : n.createdAt
            ? new Date(n.createdAt).getTime()
            : 0;
      return createdAtMs > lastOpenedMs;
    }).length;
  }, [hiddenNegativeUnreadNotifications, lastHiddenOpenedAt]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const unreadNotifications = useMemo(
    () => filteredNotifications.filter((n) => !n.isRead),
    [filteredNotifications]
  );

  const earlierNotifications = useMemo(
    () => filteredNotifications.filter((n) => n.isRead),
    [filteredNotifications]
  );

  const handleSidebarWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
  }, []);

  const updateNotifications = (
    updater: (prev: MultiplayerNotification[]) => MultiplayerNotification[]
  ) => {
    setNotifications((prev) => {
      const next = updater(prev);
      onNotificationsUpdate?.(next);
      return next;
    });
  };

  const handleNotificationClick = (notification: MultiplayerNotification) => {
    const idsToMark = new Set(notification.ids ?? [notification.id]);
    updateNotifications((prev) =>
      prev.map((n) => {
        const matches =
          (n.ids && n.ids.some((id) => idsToMark.has(id))) ||
          idsToMark.has(n.id);
        return matches ? { ...n, isRead: true } : n;
      })
    );
    try {
      onNotificationRead?.({
        ...notification,
        ids: Array.from(idsToMark),
      });
    } catch {}

    if (onNavigateToPoint) {
      onNavigateToPoint(notification.pointId, notification.boardId);
    }

    onClose();
  };

  const markAllAsRead = () => {
    updateNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      const unreadIds = notifications
        .filter((n) => !n.isRead)
        .flatMap((n) => n.ids ?? [n.id]);
      if (unreadIds.length > 0) {
        onMarkAllRead?.(unreadIds);
      }
    } catch {}
  };

  if (!rendered) return null;

  const portalTarget = typeof document !== "undefined" ? document.body : null;
  if (!portalTarget) return null;

  const sidebar = (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-black/20 dark:bg-black/40 z-[2100] duration-200",
          isClosing ? "animate-out fade-out fill-mode-forwards pointer-events-none" : "animate-in fade-in"
        )}
        onClick={onClose}
      />
      <div
        ref={sidebarRef}
        className={cn(
          "fixed right-0 top-0 bottom-0 w-96 bg-stone-50 dark:bg-stone-950 border-l border-stone-200 dark:border-stone-800 z-[2101] flex flex-col duration-200 shadow-2xl",
          isClosing
            ? "animate-out slide-out-to-right fill-mode-forwards pointer-events-none"
            : "animate-in slide-in-from-right"
        )}
        onAnimationEnd={handleAnimationEnd}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-stone-700 dark:text-stone-300" />
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Notifications</h2>
            {isLoading ? (
              <div className="ml-2 h-4 w-4 border-2 border-red-300 border-l-transparent rounded-full animate-spin" aria-label="Loading notifications" />
            ) : unreadCount > 0 ? (
        <span className="ml-1 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-red-600 px-2 text-xs font-semibold text-white">
          {unreadCount}
        </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5">
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                className="text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                disabled={isLoading}
              >
                {isLoading ? "Refreshing..." : "Refresh"}
              </Button>
            )}
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 h-8 w-8 shrink-0 -translate-x-3 transform"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2" onWheel={handleSidebarWheel}>
          {isLoading && (
            <div className="flex flex-col gap-3 p-3">
              <div className="h-4 w-24 bg-stone-200 dark:bg-stone-800 animate-pulse rounded" />
              <div className="h-16 w-full bg-stone-200 dark:bg-stone-800 animate-pulse rounded" />
              <div className="h-16 w-full bg-stone-200 dark:bg-stone-800 animate-pulse rounded" />
            </div>
          )}

          {!isLoading && filteredNotifications.length === 0 ? (
            hiddenNegativeCount > 0 ? (
              <HiddenNegativeActionsCard
                hiddenNegativeCount={hiddenNegativeCount}
                hiddenNegativeNewCount={hiddenNegativeNewCount}
                isShowing={showNegative}
                onToggle={() => {
                    setLastHiddenOpenedAt(new Date());
                    setShowNegative(true);
                  }}
                  className="py-4"
                />
              ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-12 w-12 text-stone-300 dark:text-stone-700 mb-3" />
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  No notifications yet
                </p>
              </div>
            )
          ) : null}

          {!isLoading && filteredNotifications.length > 0 && (
            <>
              {unreadNotifications.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2 px-2">
                    New supporting activity
                  </h3>
                  {unreadNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                    />
                  ))}
                  {hiddenNegativeCount > 0 && (
                    <HiddenNegativeActionsCard
                      hiddenNegativeCount={hiddenNegativeCount}
                      hiddenNegativeNewCount={hiddenNegativeNewCount}
                      isShowing={showNegative}
                      onToggle={() =>
                        setShowNegative((prev) => {
                          const next = !prev;
                          if (next) {
                            setLastHiddenOpenedAt(new Date());
                          }
                          return next;
                        })
                      }
                      className="mt-2"
                    />
                  )}
                </div>
              )}

              {unreadNotifications.length === 0 && hiddenNegativeCount > 0 && (
                <div className="mt-2">
                  <HiddenNegativeActionsCard
                    hiddenNegativeCount={hiddenNegativeCount}
                    hiddenNegativeNewCount={hiddenNegativeNewCount}
                    isShowing={showNegative}
                    onToggle={() =>
                      setShowNegative((prev) => {
                        const next = !prev;
                        if (next) {
                          setLastHiddenOpenedAt(new Date());
                        }
                        return next;
                      })
                    }
                  />
                </div>
              )}

              {earlierNotifications.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2 px-2">
                    Earlier
                  </h3>
                  {earlierNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(sidebar, portalTarget);
}

interface NotificationItemProps {
  notification: MultiplayerNotification;
  onClick: () => void;
}

function NotificationItem({
  notification,
  onClick,
}: NotificationItemProps) {
  const isComment = notification.type === "comment";
  const actorNames =
    notification.actorNames && notification.actorNames.length > 0
      ? notification.actorNames
      : [notification.userName];
  const avatarSources =
    notification.avatarUrls && notification.avatarUrls.length > 0
      ? notification.avatarUrls
      : actorNames.map(() => undefined);
  const avatarItems = avatarSources.slice(0, 3).map((src, idx) => ({
    src,
    name: actorNames[idx] ?? notification.userName,
  }));
  const actionLabel = notification.action || notification.type;
  const actionText = actionLabel;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-all duration-200 hover:bg-white dark:hover:bg-stone-900 group",
        notification.isRead
          ? "bg-stone-100 dark:bg-stone-900 border-stone-200 dark:border-stone-800 opacity-70"
          : "bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700 shadow-sm"
      )}
    >
      <p className="text-base font-semibold text-stone-900 dark:text-stone-100 break-words mb-2">
        {notification.pointTitle}
      </p>

      {isComment && notification.commentPreview && (
        <p className="text-sm text-stone-600 dark:text-stone-400 italic line-clamp-2 mb-2 pl-3 border-l-2 border-stone-300 dark:border-stone-700">
          {notification.commentPreview}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 flex-wrap">
        <div className="flex items-center -space-x-2">
          {avatarItems.map((avatar, idx) => (
            <Avatar
              key={`${notification.id}-avatar-${idx}`}
              className="h-6 w-6 border border-white dark:border-stone-800 shadow-sm"
            >
              {avatar.src ? (
                <AvatarImage src={avatar.src} alt={avatar.name} />
              ) : (
                <AvatarFallback>{initials(avatar.name)}</AvatarFallback>
              )}
            </Avatar>
          ))}
        </div>
        <span className="font-medium text-stone-700 dark:text-stone-200">{notification.userName}</span>
        <span className="text-stone-300 dark:text-stone-600">|</span>
        <span className="text-stone-700 dark:text-stone-200">{actionText}</span>
        <span className="text-stone-300 dark:text-stone-600">|</span>
        <span className="flex-shrink-0">{notification.timestamp}</span>
      </div>

      <div className="flex items-center text-xs text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform mt-2">
        View point
        <ChevronRight className="h-3 w-3 ml-1" />
      </div>
    </button>
  );
}

interface HiddenNegativeActionsCardProps {
  hiddenNegativeCount: number;
  hiddenNegativeNewCount: number;
  isShowing: boolean;
  onToggle: () => void;
  className?: string;
}

function HiddenNegativeActionsCard({
  hiddenNegativeCount,
  hiddenNegativeNewCount,
  isShowing,
  onToggle,
  className,
}: HiddenNegativeActionsCardProps) {
  const newSuffix = hiddenNegativeNewCount > 0 ? ` (${hiddenNegativeNewCount} new)` : "";
  const label = isShowing
    ? `Hide other activity${newSuffix}`
    : `Show ${hiddenNegativeCount} other hidden update${hiddenNegativeCount === 1 ? "" : "s"}${newSuffix}`;
  const helper = isShowing
    ? "Collapse other activity."
    : "Other activity is hidden by default.";

  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-full p-3 min-h-[104px] rounded-lg border-2 border-dashed border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-900 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors flex flex-col justify-center gap-2 text-left",
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
        <EyeOff className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <p className="text-xs text-stone-500 dark:text-stone-400">{helper}</p>
    </button>
  );
}



