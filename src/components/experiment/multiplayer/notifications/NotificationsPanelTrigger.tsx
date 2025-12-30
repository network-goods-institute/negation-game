"use client";

import { useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NotificationsPanel } from "./NotificationsPanel";
import { useMultiplayerNotificationSummaries } from "@/queries/experiment/multiplayer/useMultiplayerNotifications";
import { isFeatureEnabled } from "@/lib/featureFlags";

export function NotificationsPanelTrigger() {
  const mpNotificationsEnabled = isFeatureEnabled("mpNotifications");
  const [isOpen, setIsOpen] = useState(false);
  const { data: summaries } = useMultiplayerNotificationSummaries();
  const summariesToShow = useMemo(
    () => summaries ?? [],
    [summaries]
  );
  const totalNotifications = useMemo(
    () =>
      summariesToShow.reduce(
        (sum, board) =>
          sum +
          (board.unreadCount ?? board.totalCount ?? board.notifications.length),
        0
      ),
    [summariesToShow]
  );

  if (!mpNotificationsEnabled) return null;

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(true)}
      >
        <Bell className="h-4 w-4" />
        {totalNotifications > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {totalNotifications}
          </Badge>
        )}
      </Button>

      <NotificationsPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        summaries={summariesToShow}
      />
    </>
  );
}
