"use client";

import { useMemo, useState } from "react";
import { Bell, ChevronDown, ChevronUp, X } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils/cn";
import {
  MultiplayerBoardNotificationSummary,
  MultiplayerNotificationType,
} from "./types";

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  summaries?: MultiplayerBoardNotificationSummary[];
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
  }
};

export function NotificationsPanel({
  isOpen,
  onClose,
  summaries: summariesProp,
}: NotificationsPanelProps) {
  const [expandedBoards, setExpandedBoards] = useState<Set<string>>(new Set());
  const summaries = useMemo(
    () => summariesProp ?? [],
    [summariesProp]
  );
  const totalCount = useMemo(
    () =>
      summaries.reduce(
        (sum, board) =>
          sum + (board.totalCount ?? board.notifications.length),
        0
      ),
    [summaries]
  );

  const toggleBoardExpanded = (boardId: string) => {
    setExpandedBoards((prev) => {
      if (prev.has(boardId)) {
        return new Set(Array.from(prev).filter((id) => id !== boardId));
      }
      return new Set([...prev, boardId]);
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-background border-l border-border z-50 flex flex-col animate-in slide-in-from-right duration-200 shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Board Notifications</h2>
            {totalCount > 0 && (
              <Badge variant="destructive" className="ml-1">
                {totalCount}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {summaries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No notifications from any boards
                </p>
              </div>
            ) : (
              summaries.map((board) => {
                const notificationCount =
                  board.totalCount ?? board.notifications.length;
                return (
                  <Card
                    key={board.boardId}
                    className="overflow-hidden border-border hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-0">
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/experiment/rationale/multiplayer/${board.boardId}`}
                              className="font-semibold text-sm hover:text-primary transition-colors line-clamp-1"
                            >
                              {board.boardTitle}
                            </Link>
                            <p className="text-xs text-muted-foreground mt-1">
                              {notificationCount} new{" "}
                              {notificationCount === 1
                                ? "notification"
                                : "notifications"}
                            </p>
                          </div>
                          <Badge variant="secondary" className="flex-shrink-0">
                            {notificationCount}
                          </Badge>
                        </div>

                        {board.notifications.length > 0 && (
                          <>
                            <button
                              onClick={() => toggleBoardExpanded(board.boardId)}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2"
                            >
                              {expandedBoards.has(board.boardId) ? (
                                <>
                                  <ChevronUp className="h-3 w-3" />
                                  Hide details
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3" />
                                  Show details
                                </>
                              )}
                            </button>

                            {expandedBoards.has(board.boardId) && (
                              <div className="mt-3 space-y-2">
                                {board.notifications.map((notif, idx) => (
                                  <div
                                    key={`${board.boardId}-${idx}`}
                                    className={cn(
                                      "p-2 rounded-md text-xs border",
                                      getNotificationTypeColor(notif.type)
                                    )}
                                  >
                                    {notif.message}
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}

                        <Link
                          href={`/experiment/rationale/multiplayer/${board.boardId}`}
                          className="mt-3 block"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs"
                          >
                            View Board
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border">
          <Link href="/notifications">
            <Button variant="secondary" className="w-full" size="sm">
              View All Notifications
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}
