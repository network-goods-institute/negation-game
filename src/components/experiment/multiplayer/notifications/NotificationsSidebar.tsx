"use client";

import type React from "react";
import { useState, useCallback, useRef, useEffect, useMemo, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  X,
  ChevronRight,
  EyeOff,
  ArrowUp,
  Plus,
  Minus,
  Slash,
  MessageCircle,
} from "lucide-react";
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
  showBoardContext?: boolean;
  linkLabel?: string;
}

const isNegativeActivity = (type: MultiplayerNotification["type"]) => {
  return type === "negation" || type === "objection";
};

const isSupportActivity = (type: MultiplayerNotification["type"]) => {
  return type === "support" || type === "upvote";
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
  showBoardContext = false,
  linkLabel,
}: NotificationsSidebarProps) {
  const [notifications, setNotifications] = useState<MultiplayerNotification[]>(
    notificationsProp ?? []
  );
  const [rendered, setRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [showNegative, setShowNegative] = useState(false);
  const [lastHiddenOpenedAt, setLastHiddenOpenedAt] = useState<Date | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const hiddenNegativeMeasureRef = useRef<HTMLDivElement>(null);
  const [hiddenNegativeBlockHeight, setHiddenNegativeBlockHeight] = useState(0);
  const [hiddenNegativeItemHeights, setHiddenNegativeItemHeights] = useState<number[]>([]);
  const [hiddenNegativeToggleHeight, setHiddenNegativeToggleHeight] = useState(0);

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

  const supportNotifications = useMemo(
    () => notifications.filter((n) => isSupportActivity(n.type)),
    [notifications]
  );
  const negativeNotifications = useMemo(
    () => notifications.filter((n) => isNegativeActivity(n.type)),
    [notifications]
  );
  const otherNotifications = useMemo(
    () =>
      notifications.filter(
        (n) => !isNegativeActivity(n.type) && !isSupportActivity(n.type)
      ),
    [notifications]
  );

  const unreadSupportNotifications = useMemo(
    () => supportNotifications.filter((n) => !n.isRead),
    [supportNotifications]
  );
  const unreadOtherNotifications = useMemo(
    () => otherNotifications.filter((n) => !n.isRead),
    [otherNotifications]
  );
  const unreadNegativeNotifications = useMemo(
    () => negativeNotifications.filter((n) => !n.isRead),
    [negativeNotifications]
  );

  const earlierSupportNotifications = useMemo(
    () => supportNotifications.filter((n) => n.isRead),
    [supportNotifications]
  );
  const earlierOtherNotifications = useMemo(
    () => otherNotifications.filter((n) => n.isRead),
    [otherNotifications]
  );
  const earlierNegativeNotifications = useMemo(
    () => negativeNotifications.filter((n) => n.isRead),
    [negativeNotifications]
  );

  const hiddenNegativeUnreadNotifications = unreadNegativeNotifications;
  const hiddenNegativeNotifications = negativeNotifications;

  const hiddenNegativeCount = useMemo(
    () => hiddenNegativeNotifications.length,
    [hiddenNegativeNotifications]
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

  const unreadCount = useMemo(() => {
    if (!showBoardContext) {
      return notifications.filter((n) => !n.isRead).length;
    }
    return notifications.reduce((sum, notification) => {
      const unread = notification.unreadCount
        ?? (notification.isRead ? 0 : (notification.count ?? notification.ids?.length ?? 1));
      return sum + unread;
    }, 0);
  }, [notifications, showBoardContext]);

  const visibleNotificationCount =
    supportNotifications.length +
    otherNotifications.length +
    (showNegative ? negativeNotifications.length : 0);
  const showHiddenNegativeToggle = hiddenNegativeCount > 0;

  const previewFallbackHeight = 104;
  const hiddenNegativeUnreadHeights = useMemo(() => {
    return unreadNegativeNotifications.map((_, idx) =>
      hiddenNegativeItemHeights[idx] ?? previewFallbackHeight
    );
  }, [unreadNegativeNotifications, hiddenNegativeItemHeights]);
  const hiddenNegativeEarlierHeights = useMemo(() => {
    const offset = unreadNegativeNotifications.length;
    return earlierNegativeNotifications.map((_, idx) =>
      hiddenNegativeItemHeights[offset + idx] ?? previewFallbackHeight
    );
  }, [earlierNegativeNotifications, unreadNegativeNotifications.length, hiddenNegativeItemHeights]);

  useLayoutEffect(() => {
    const measureEl = hiddenNegativeMeasureRef.current;
    if (!measureEl) return;
    let rafId: number | null = null;
    let attempts = 0;

    const getHeight = (el: HTMLElement) => {
      const rectHeight = el.getBoundingClientRect().height;
      return Math.max(rectHeight, el.scrollHeight, el.offsetHeight);
    };

    const measure = () => {
      const contentEl = measureEl.querySelector(
        "[data-negative-measure-content]"
      ) as HTMLElement | null;
      const targetEl = contentEl || measureEl;
      const nextHeight = getHeight(targetEl);
      if (nextHeight > 0) {
        setHiddenNegativeBlockHeight((prev) =>
          Math.abs(prev - nextHeight) > 1 ? nextHeight : prev
        );
      }

      const toggleEl = measureEl.querySelector(
        "[data-negative-measure-toggle]"
      ) as HTMLElement | null;
      if (toggleEl) {
        const toggleHeight = getHeight(toggleEl);
        setHiddenNegativeToggleHeight((prev) =>
          Math.abs(prev - toggleHeight) > 1 ? toggleHeight : prev
        );
      } else {
        setHiddenNegativeToggleHeight(0);
      }

      const itemEls = Array.from(
        measureEl.querySelectorAll("[data-negative-measure-item]")
      ) as HTMLElement[];
      if (itemEls.length > 0) {
        const heights = itemEls.map((el) => getHeight(el));
        setHiddenNegativeItemHeights((prev) => {
          if (
            prev.length === heights.length &&
            prev.every((val, idx) => Math.abs(val - heights[idx]) <= 1)
          ) {
            return prev;
          }
          return heights;
        });
      } else {
        setHiddenNegativeItemHeights([]);
      }

      return nextHeight > 0;
    };

    const scheduleMeasure = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        const hasHeight = measure();
        if (!hasHeight && attempts < 5) {
          attempts += 1;
          scheduleMeasure();
        }
      });
    };

    measure();
    scheduleMeasure();

    if (typeof ResizeObserver === "undefined") {
      return () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }
      };
    }

    const observer = new ResizeObserver(() => {
      attempts = 0;
      scheduleMeasure();
    });
    observer.observe(measureEl);
    const contentEl = measureEl.querySelector(
      "[data-negative-measure-content]"
    ) as HTMLElement | null;
    if (contentEl) {
      observer.observe(contentEl);
    }

    return () => {
      observer.disconnect();
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [
    hiddenNegativeCount,
    hiddenNegativeNotifications,
    unreadNegativeNotifications,
    earlierNegativeNotifications,
    showBoardContext,
    linkLabel,
    rendered,
  ]);

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

  const handleNotificationMarkRead = (notification: MultiplayerNotification) => {
    if (notification.isRead) return;
    const idsToMark = new Set(notification.ids ?? [notification.id]);
    updateNotifications((prev) =>
      prev.map((n) => {
        const matches =
          (n.ids && n.ids.some((id) => idsToMark.has(id))) ||
          idsToMark.has(n.id);
        return matches ? { ...n, isRead: true, unreadCount: 0 } : n;
      })
    );
    try {
      onNotificationRead?.({
        ...notification,
        ids: Array.from(idsToMark),
      });
    } catch { }
  };

  const handleNotificationNavigate = (notification: MultiplayerNotification) => {
    if (onNavigateToPoint) {
      onNavigateToPoint(notification.pointId, notification.boardId);
    }
    onClose();
  };

  const markAllAsRead = () => {
    updateNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, unreadCount: 0 }))
    );
    try {
      const unreadIds = notifications
        .filter((n) => !n.isRead)
        .flatMap((n) => n.ids ?? [n.id]);
      if (unreadIds.length > 0) {
        onMarkAllRead?.(unreadIds);
      }
    } catch { }
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

        <div className="flex-1 overflow-y-auto relative" onWheel={handleSidebarWheel}>
          <div className="p-3 space-y-2" data-testid="notifications-visible">
          {isLoading && (
            <div className="flex flex-col gap-3 p-3">
              <div className="h-4 w-24 bg-stone-200 dark:bg-stone-800 animate-pulse rounded" />
              <div className="h-16 w-full bg-stone-200 dark:bg-stone-800 animate-pulse rounded" />
              <div className="h-16 w-full bg-stone-200 dark:bg-stone-800 animate-pulse rounded" />
            </div>
          )}

          {!isLoading && visibleNotificationCount === 0 ? (
            hiddenNegativeCount > 0 ? (
              <HiddenNegativeActionsCard
                hiddenNegativeCount={hiddenNegativeCount}
                hiddenNegativeNewCount={hiddenNegativeNewCount}
                isShowing={showNegative}
                onToggle={() => {
                  setLastHiddenOpenedAt(new Date());
                  setShowNegative(true);
                }}
                blockHeight={showNegative ? undefined : hiddenNegativeBlockHeight}
                previewToggleHeight={hiddenNegativeToggleHeight}
                previewUnreadHeights={hiddenNegativeUnreadHeights}
                previewEarlierHeights={hiddenNegativeEarlierHeights}
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

          {!isLoading && visibleNotificationCount > 0 && (
            <>
              {unreadSupportNotifications.length > 0 && (
                <div data-testid="notifications-supporting-new">
                  <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2 px-2">
                    New supporting activity
                  </h3>
                  {unreadSupportNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkRead={() => handleNotificationMarkRead(notification)}
                      onNavigate={() => handleNotificationNavigate(notification)}
                      showBoardContext={showBoardContext}
                      linkLabel={linkLabel}
                    />
                  ))}
                </div>
              )}

              {unreadOtherNotifications.length > 0 && (
                <div
                  data-testid="notifications-activity-new"
                  className={unreadSupportNotifications.length > 0 ? "mt-4" : undefined}
                >
                  <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2 px-2">
                    New activity
                  </h3>
                  {unreadOtherNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkRead={() => handleNotificationMarkRead(notification)}
                      onNavigate={() => handleNotificationNavigate(notification)}
                      showBoardContext={showBoardContext}
                      linkLabel={linkLabel}
                    />
                  ))}
                </div>
              )}

              {showHiddenNegativeToggle && (
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
                  className={
                    unreadSupportNotifications.length > 0 ||
                      unreadOtherNotifications.length > 0
                      ? "mt-2"
                      : undefined
                  }
                blockHeight={showNegative ? undefined : hiddenNegativeBlockHeight}
                previewToggleHeight={hiddenNegativeToggleHeight}
                previewUnreadHeights={hiddenNegativeUnreadHeights}
                previewEarlierHeights={hiddenNegativeEarlierHeights}
              />
            )}

              {showNegative && unreadNegativeNotifications.length > 0 && (
                <div
                  data-testid="notifications-negative-new"
                  className={
                    unreadSupportNotifications.length > 0 ||
                      unreadOtherNotifications.length > 0 ||
                      showHiddenNegativeToggle
                      ? "mt-4"
                      : undefined
                  }
                >
                  <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2 px-2">
                    New negative activity
                  </h3>
                  {unreadNegativeNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkRead={() => handleNotificationMarkRead(notification)}
                      onNavigate={() => handleNotificationNavigate(notification)}
                      showBoardContext={showBoardContext}
                      linkLabel={linkLabel}
                    />
                  ))}
                </div>
              )}

              {earlierSupportNotifications.length > 0 && (
                <div
                  data-testid="notifications-supporting-earlier"
                  className="mt-4"
                >
                  <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2 px-2">
                    Earlier supporting activity
                  </h3>
                  {earlierSupportNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkRead={() => handleNotificationMarkRead(notification)}
                      onNavigate={() => handleNotificationNavigate(notification)}
                      showBoardContext={showBoardContext}
                      linkLabel={linkLabel}
                    />
                  ))}
                </div>
              )}

              {earlierOtherNotifications.length > 0 && (
                <div
                  data-testid="notifications-activity-earlier"
                  className="mt-4"
                >
                  <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2 px-2">
                    Earlier activity
                  </h3>
                  {earlierOtherNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkRead={() => handleNotificationMarkRead(notification)}
                      onNavigate={() => handleNotificationNavigate(notification)}
                      showBoardContext={showBoardContext}
                      linkLabel={linkLabel}
                    />
                  ))}
                </div>
              )}

              {showNegative && earlierNegativeNotifications.length > 0 && (
                <div
                  data-testid="notifications-negative-earlier"
                  className="mt-4"
                >
                  <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2 px-2">
                    Earlier negative activity
                  </h3>
                  {earlierNegativeNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkRead={() => handleNotificationMarkRead(notification)}
                      onNavigate={() => handleNotificationNavigate(notification)}
                      showBoardContext={showBoardContext}
                      linkLabel={linkLabel}
                    />
                  ))}
                </div>
              )}
            </>
          )}
          </div>
          {hiddenNegativeCount > 0 && (
            <div
              ref={hiddenNegativeMeasureRef}
              aria-hidden="true"
              className="absolute left-0 top-0 w-full pointer-events-none opacity-0"
            >
              <div className="p-3">
                <div className="space-y-2" data-negative-measure-content>
                  <div data-negative-measure-toggle>
                    <HiddenNegativeActionsCard
                      hiddenNegativeCount={hiddenNegativeCount}
                      hiddenNegativeNewCount={hiddenNegativeNewCount}
                      isShowing
                      onToggle={() => {}}
                    />
                  </div>
                  {unreadNegativeNotifications.length > 0 && (
                    <div
                      className={
                        hiddenNegativeCount > 0 ? "mt-4" : undefined
                      }
                    >
                      <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2 px-2">
                        New negative activity
                      </h3>
                      {unreadNegativeNotifications.map((notification) => (
                        <div
                          key={`measure-negative-${notification.id}`}
                          data-negative-measure-item
                        >
                          <NotificationItem
                            notification={notification}
                            onMarkRead={() => {}}
                            onNavigate={() => {}}
                            showBoardContext={showBoardContext}
                            linkLabel={linkLabel}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {earlierNegativeNotifications.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2 px-2">
                        Earlier negative activity
                      </h3>
                      {earlierNegativeNotifications.map((notification) => (
                        <div
                          key={`measure-negative-earlier-${notification.id}`}
                          data-negative-measure-item
                        >
                          <NotificationItem
                            notification={notification}
                            onMarkRead={() => {}}
                            onNavigate={() => {}}
                            showBoardContext={showBoardContext}
                            linkLabel={linkLabel}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(sidebar, portalTarget);
}

interface NotificationItemProps {
  notification: MultiplayerNotification;
  onMarkRead: () => void;
  onNavigate: () => void;
  showBoardContext?: boolean;
  linkLabel?: string;
}

function NotificationItem({
  notification,
  onMarkRead,
  onNavigate,
  showBoardContext = false,
  linkLabel,
}: NotificationItemProps) {
  const isComment = notification.type === "comment";
  const headline = showBoardContext
    ? getGlobalNotificationHeadline(notification)
    : getNotificationHeadline(notification);
  const badge = getNotificationBadge(notification.type);
  const boardLabel = notification.boardTitle || notification.boardId;
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
  const handleActivate = () => {
    if (notification.isRead) {
      onNavigate();
      return;
    }
    onMarkRead();
    onNavigate();
  };
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`notification-item-${notification.id}`}
      onClick={handleActivate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleActivate();
        }
      }}
      className={cn(
        "relative w-full text-left p-3 pl-12 rounded-lg border transition-all duration-200 hover:bg-white dark:hover:bg-stone-900 group cursor-pointer",
        notification.isRead
          ? "bg-stone-100 dark:bg-stone-900 border-stone-200 dark:border-stone-800 opacity-70"
          : "bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700 shadow-sm"
      )}
    >
      {badge ? (
        <span
          className={cn(
            "absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border shadow-sm",
            badge.className
          )}
        >
          <badge.Icon className="h-4 w-4" />
        </span>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 break-words">
          {headline}
        </p>
        <span className="text-xs text-stone-400 dark:text-stone-500 whitespace-nowrap">
          {notification.timestamp}
        </span>
      </div>

      {!showBoardContext && isComment && notification.commentPreview && (
        <p className="text-sm text-stone-600 dark:text-stone-400 italic line-clamp-2 mt-2 mb-2 pl-3 border-l-2 border-stone-300 dark:border-stone-700">
          {notification.commentPreview}
        </p>
      )}

      {showBoardContext && (
        <div className="mt-2 text-xs text-stone-500 dark:text-stone-400">
          <span className="uppercase tracking-wide text-[10px] text-stone-400 dark:text-stone-500">Board</span>
          <span className="ml-2 font-medium text-stone-700 dark:text-stone-300">
            {boardLabel}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mt-2">
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
      </div>

      <button
        type="button"
        data-testid={`notification-view-${notification.id}`}
        onClick={(event) => {
          event.stopPropagation();
          handleActivate();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.stopPropagation();
          }
        }}
        className="flex items-center text-xs text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform mt-2"
      >
        {linkLabel ?? "View point"}
        <ChevronRight className="h-3 w-3 ml-1" />
      </button>
    </div>
  );
}

interface HiddenNegativeActionsCardProps {
  hiddenNegativeCount: number;
  hiddenNegativeNewCount: number;
  isShowing: boolean;
  onToggle: () => void;
  className?: string;
  blockHeight?: number;
  previewToggleHeight?: number;
  previewUnreadHeights?: number[];
  previewEarlierHeights?: number[];
}

function HiddenNegativeActionsCard({
  hiddenNegativeCount,
  hiddenNegativeNewCount,
  isShowing,
  onToggle,
  className,
  blockHeight,
  previewToggleHeight = 0,
  previewUnreadHeights = [],
  previewEarlierHeights = [],
}: HiddenNegativeActionsCardProps) {
  const label = isShowing
    ? "Hide other activity"
    : `Show ${hiddenNegativeCount} other update${hiddenNegativeCount === 1 ? "" : "s"}`;
  const helper = isShowing
    ? "Click to hide other activity"
    : "Click to show other activity";

  return (
    <button
      onClick={onToggle}
      className={cn(
        "relative w-full p-3 rounded-lg border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors flex flex-col gap-2 text-left overflow-hidden",
        !isShowing && blockHeight ? "justify-start" : "justify-center",
        className
      )}
      style={blockHeight ? { minHeight: blockHeight } : undefined}
    >
      {!isShowing && blockHeight && hiddenNegativeCount > 0 && (
        <div className="absolute inset-x-3 inset-y-3 pointer-events-none overflow-hidden opacity-15">
          <div className="space-y-2">
            {previewToggleHeight > 0 && (
              <div
                className="rounded-lg border border-stone-400 dark:border-stone-600 bg-white dark:bg-stone-900"
                style={{ minHeight: previewToggleHeight }}
              />
            )}
            {previewUnreadHeights.length > 0 && (
              <div className={previewToggleHeight > 0 ? "mt-4" : undefined}>
                <div className="h-3 w-40 bg-stone-300 dark:bg-stone-700 rounded mb-2" />
                <div className="space-y-2">
                  {previewUnreadHeights.map((height, idx) => (
                    <div
                      key={`preview-unread-${idx}`}
                      className="relative w-full p-3 pl-12 rounded-lg border border-stone-400 dark:border-stone-600 bg-white dark:bg-stone-900"
                      style={{ minHeight: height }}
                    >
                      <span className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-stone-400 dark:border-stone-600 bg-stone-200 dark:bg-stone-700" />
                      <div className="flex items-start justify-between gap-3">
                        <div className="h-4 flex-1 bg-stone-300 dark:bg-stone-700 rounded" />
                        <div className="h-3 w-12 bg-stone-300 dark:bg-stone-700 rounded" />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center -space-x-2">
                          <div className="h-6 w-6 rounded-full border border-stone-400 dark:border-stone-600 bg-stone-300 dark:bg-stone-700" />
                          <div className="h-6 w-6 rounded-full border border-stone-400 dark:border-stone-600 bg-stone-300 dark:bg-stone-700" />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        <div className="h-3 w-16 bg-stone-300 dark:bg-stone-700 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {previewEarlierHeights.length > 0 && (
              <div className={previewUnreadHeights.length > 0 ? "mt-4" : undefined}>
                <div className="h-3 w-40 bg-stone-300 dark:bg-stone-700 rounded mb-2" />
                <div className="space-y-2">
                  {previewEarlierHeights.map((height, idx) => (
                    <div
                      key={`preview-earlier-${idx}`}
                      className="relative w-full p-3 pl-12 rounded-lg border border-stone-400 dark:border-stone-600 bg-white dark:bg-stone-900"
                      style={{ minHeight: height }}
                    >
                      <span className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-stone-400 dark:border-stone-600 bg-stone-200 dark:bg-stone-700" />
                      <div className="flex items-start justify-between gap-3">
                        <div className="h-4 flex-1 bg-stone-300 dark:bg-stone-700 rounded" />
                        <div className="h-3 w-12 bg-stone-300 dark:bg-stone-700 rounded" />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center -space-x-2">
                          <div className="h-6 w-6 rounded-full border border-stone-400 dark:border-stone-600 bg-stone-300 dark:bg-stone-700" />
                          <div className="h-6 w-6 rounded-full border border-stone-400 dark:border-stone-600 bg-stone-300 dark:bg-stone-700" />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        <div className="h-3 w-16 bg-stone-300 dark:bg-stone-700 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="relative z-10">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
          <EyeOff className="h-4 w-4" />
          <span>{label}</span>
        </div>
        <p className="text-xs text-amber-800/80 dark:text-amber-200/80">{helper}</p>
      </div>
    </button>
  );
}

const getNotificationHeadline = (notification: MultiplayerNotification) => {
  const title = notification.pointTitle ? `"${notification.pointTitle}"` : "this";
  if (notification.type === "upvote") {
    const count = notification.count ?? notification.ids?.length ?? 1;
    const label = count === 1 ? "upvote" : "upvotes";
    return `${count} ${label} on ${title}`;
  }
  const actor = notification.userName || "Someone";
  const action = notification.action || notification.type;
  return `${actor} ${action} ${title}`;
};

const getGlobalNotificationHeadline = (notification: MultiplayerNotification) => {
  const count = notification.count ?? notification.ids?.length ?? 1;
  const label = count === 1 ? "update" : "updates";
  const actorSummary =
    notification.actorNames && notification.actorNames.length > 0
      ? notification.actorNames.join(", ")
      : notification.userName || "Someone";
  return `${count} ${label} from ${actorSummary}`;
};

const getNotificationBadge = (type: MultiplayerNotification["type"]) => {
  switch (type) {
    case "support":
      return {
        Icon: Plus,
        className: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
      };
    case "negation":
      return {
        Icon: Minus,
        className: "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800",
      };
    case "objection":
      return {
        Icon: Slash,
        className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
      };
    case "upvote":
      return {
        Icon: ArrowUp,
        className: "bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-950 dark:text-sky-400 dark:border-sky-800",
      };
    case "comment":
      return {
        Icon: MessageCircle,
        className: "bg-stone-100 text-stone-600 border-stone-200 dark:bg-stone-900 dark:text-stone-300 dark:border-stone-700",
      };
    default:
      return null;
  }
};
