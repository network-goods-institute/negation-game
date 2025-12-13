"use client";

import type React from "react";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Bell, X, ChevronRight, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import {
  demoNotifications,
  MultiplayerNotification,
  MultiplayerNotificationType,
} from "./demoData";

interface NotificationsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToPoint?: (pointId: string, boardId?: string) => void;
  notifications?: MultiplayerNotification[];
  onNotificationsUpdate?: (notifications: MultiplayerNotification[]) => void;
  onNotificationRead?: (id: string) => void;
  onMarkAllRead?: (ids: string[]) => void;
  isLoading?: boolean;
}

const getNotificationTypeColor = (type: MultiplayerNotificationType) => {
  switch (type) {
    case "negation":
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800";
    case "objection":
      return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800";
    case "support":
      return "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800";
    case "upvote":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800";
    case "comment":
      return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-400 dark:border-gray-800";
  }
};

const getNotificationTypeLabel = (type: MultiplayerNotificationType) => {
  switch (type) {
    case "negation":
      return "Negation";
    case "objection":
      return "Objection";
    case "support":
      return "Support";
    case "upvote":
      return "Upvote";
    case "comment":
      return "Comment";
    default:
      return type;
  }
};

const isNegativeValence = (type: MultiplayerNotificationType) => {
  return type === "negation" || type === "objection";
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
}: NotificationsSidebarProps) {
  const [notifications, setNotifications] = useState<MultiplayerNotification[]>(
    notificationsProp ?? demoNotifications
  );
  const [rendered, setRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [showNegative, setShowNegative] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      setIsClosing(false);
    } else if (rendered) {
      setIsClosing(true);
      const timer = window.setTimeout(() => {
        setRendered(false);
        setIsClosing(false);
      }, 200);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [isOpen, rendered]);

  useEffect(() => {
    if (notificationsProp) {
      setNotifications(notificationsProp);
    }
  }, [notificationsProp]);

  const filteredNotifications = useMemo(() => {
    if (showNegative) {
      return notifications;
    }
    return notifications.filter((n) => !isNegativeValence(n.type));
  }, [notifications, showNegative]);

  const hiddenNegativeCount = useMemo(
    () => notifications.filter((n) => isNegativeValence(n.type) && !n.isRead).length,
    [notifications]
  );

  const unreadCount = useMemo(
    () => filteredNotifications.filter((n) => !n.isRead).length,
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
    updateNotifications((prev) =>
      prev.map((n) =>
        n.id === notification.id ? { ...n, isRead: true } : n
      )
    );
    try {
      onNotificationRead?.(notification.id);
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
        .map((n) => n.id);
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
          isClosing ? "animate-out fade-out" : "animate-in fade-in"
        )}
        onClick={onClose}
      />
      <div
        ref={sidebarRef}
        className={cn(
          "fixed right-0 top-0 bottom-0 w-96 bg-stone-50 dark:bg-stone-950 border-l border-stone-200 dark:border-stone-800 z-[2101] flex flex-col duration-200 shadow-2xl",
          isClosing ? "animate-out slide-out-to-right" : "animate-in slide-in-from-right"
        )}
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
              <Badge variant="destructive" className="ml-1">
                {unreadCount}
              </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
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
              className="text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
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

          {!isLoading && !showNegative && hiddenNegativeCount > 0 && (
            <button
              onClick={() => setShowNegative(true)}
              className="w-full p-3 rounded-lg border-2 border-dashed border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-900 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors mb-3"
            >
              <div className="flex items-center justify-center gap-2 text-sm text-stone-600 dark:text-stone-400">
                <EyeOff className="h-4 w-4" />
                <span>Show {hiddenNegativeCount} negative notification{hiddenNegativeCount !== 1 ? 's' : ''} (negations & objections)</span>
              </div>
            </button>
          )}
          {!isLoading && showNegative && (
            <button
              onClick={() => setShowNegative(false)}
              className="w-full p-3 rounded-lg border-2 border-dashed border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-900 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors mb-3"
            >
              <div className="flex items-center justify-center gap-2 text-sm text-stone-600 dark:text-stone-400">
                <EyeOff className="h-4 w-4" />
                <span>Hide negative notifications</span>
              </div>
            </button>
          )}

          {!isLoading && filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-stone-300 dark:text-stone-700 mb-3" />
              <p className="text-sm text-stone-500 dark:text-stone-400">
                No notifications yet
              </p>
            </div>
          ) : null}

          {!isLoading && filteredNotifications.length > 0 && (
            <>
              {filteredNotifications.filter((n) => !n.isRead).length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2 px-2">
                    New
                  </h3>
                  {filteredNotifications
                    .filter((n) => !n.isRead)
                    .map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onClick={() => handleNotificationClick(notification)}
                        getTypeColor={getNotificationTypeColor}
                        getTypeLabel={getNotificationTypeLabel}
                      />
                    ))}
                </div>
              )}

              {filteredNotifications.filter((n) => n.isRead).length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2 px-2">
                    Earlier
                  </h3>
                  {filteredNotifications
                    .filter((n) => n.isRead)
                    .map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onClick={() => handleNotificationClick(notification)}
                        getTypeColor={getNotificationTypeColor}
                        getTypeLabel={getNotificationTypeLabel}
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
  getTypeColor: (type: MultiplayerNotificationType) => string;
  getTypeLabel: (type: MultiplayerNotificationType) => string;
}

function NotificationItem({
  notification,
  onClick,
  getTypeColor,
  getTypeLabel,
}: NotificationItemProps) {
  const isNegative = isNegativeValence(notification.type);
  const isComment = notification.type === "comment";

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
      {/* Point title as primary focus */}
      <p className="text-base font-semibold text-stone-900 dark:text-stone-100 line-clamp-2 mb-2">
        {notification.pointTitle}
      </p>

      {/* Comment preview if available */}
      {isComment && notification.commentPreview && (
        <p className="text-sm text-stone-600 dark:text-stone-400 italic line-clamp-2 mb-2 pl-3 border-l-2 border-stone-300 dark:border-stone-700">
          {notification.commentPreview}
        </p>
      )}

      {/* Secondary info: type, person, time */}
      <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
        <Badge
          variant="outline"
          className={cn("text-[10px] font-medium py-0 px-1.5", getTypeColor(notification.type))}
        >
          {getTypeLabel(notification.type)}
        </Badge>
        <span aria-hidden="true" className="text-stone-300 dark:text-stone-600">
          |
        </span>
        <span>{notification.userName}</span>
        <span aria-hidden="true" className="text-stone-300 dark:text-stone-600">
          |
        </span>
        <span className="flex-shrink-0">{notification.timestamp}</span>
      </div>

      <div className="flex items-center text-xs text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform mt-2">
        View point
        <ChevronRight className="h-3 w-3 ml-1" />
      </div>
    </button>
  );
}
