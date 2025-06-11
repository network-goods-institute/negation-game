import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/queries/users/useUser";

interface ConversationStatus {
  messageCount: number;
  lastMessageId: string | null;
  lastMessageAt: string | null;
  lastSenderId: string | null;
  lastUpdatedAt: string | null;
  lastUpdatedMessageId: string | null;
  unreadCount: number;
}

interface UseConversationPollingProps {
  otherUserId: string;
  enabled?: boolean;
  interval?: number;
}

export const useConversationPolling = ({
  otherUserId,
  enabled = true,
  interval = 2000, // 2 seconds
}: UseConversationPollingProps) => {
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  const [status, setStatus] = useState<ConversationStatus | null>(null);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const lastKnownCountRef = useRef<number>(0);
  const lastKnownMessageIdRef = useRef<string | null>(null);
  const lastKnownUpdatedAtRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const errorCountRef = useRef<number>(0);
  const maxErrorsRef = useRef<number>(5);

  // Memoize the invalidation function to avoid recreating fetchStatus
  const invalidateQueries = useCallback(() => {
    // Invalidate conversation queries with the correct pattern: ["conversation", userId, otherUserId, ...]
    queryClient.invalidateQueries({
      queryKey: ["conversation", user?.id, otherUserId],
    });
    // Also invalidate the conversations list
    queryClient.invalidateQueries({
      queryKey: ["conversations"],
    });
  }, [queryClient, user?.id, otherUserId]);

  const fetchStatus = useCallback(async () => {
    if (!enabled || !otherUserId) return;

    try {
      const response = await fetch(
        `/api/messages/conversation-status?otherUserId=${encodeURIComponent(otherUserId)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const newStatus: ConversationStatus = await response.json();

      // Check if there are new messages OR if messages have been updated (edited)
      const hasNewMessages =
        newStatus.messageCount > lastKnownCountRef.current ||
        (newStatus.lastMessageId &&
          newStatus.lastMessageId !== lastKnownMessageIdRef.current);

      const hasUpdatedMessages =
        newStatus.lastUpdatedAt &&
        newStatus.lastUpdatedAt !== lastKnownUpdatedAtRef.current;

      if (hasNewMessages || hasUpdatedMessages) {
        console.log("Messages changed, invalidating queries:", {
          hasNewMessages,
          hasUpdatedMessages,
          oldCount: lastKnownCountRef.current,
          newCount: newStatus.messageCount,
          oldMessageId: lastKnownMessageIdRef.current,
          newMessageId: newStatus.lastMessageId,
          oldUpdatedAt: lastKnownUpdatedAtRef.current,
          newUpdatedAt: newStatus.lastUpdatedAt,
          userId: user?.id,
          otherUserId,
        });
        setHasNewMessages(true);
        // Invalidate queries to trigger refetch
        invalidateQueries();
      }

      // Update refs
      lastKnownCountRef.current = newStatus.messageCount;
      lastKnownMessageIdRef.current = newStatus.lastMessageId;
      lastKnownUpdatedAtRef.current = newStatus.lastUpdatedAt;
      setStatus(newStatus);

      // Reset error count on success
      errorCountRef.current = 0;
    } catch (error) {
      errorCountRef.current += 1;
      console.error(
        `Error polling conversation (attempt ${errorCountRef.current}):`,
        error
      );

      // Stop polling after too many consecutive errors to prevent infinite loops
      if (errorCountRef.current >= maxErrorsRef.current) {
        console.error("Too many consecutive polling errors, stopping polling");
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = undefined;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, otherUserId, invalidateQueries]);

  // Initialize on mount
  useEffect(() => {
    if (enabled && otherUserId) {
      fetchStatus();
    }
  }, [enabled, otherUserId, fetchStatus]);

  // Set up polling
  useEffect(() => {
    if (!enabled || !otherUserId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
      return;
    }

    // Only start polling if we haven't exceeded error limit
    if (errorCountRef.current < maxErrorsRef.current) {
      intervalRef.current = setInterval(fetchStatus, interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    };
  }, [enabled, otherUserId, interval, fetchStatus]);

  // Reset hasNewMessages when messages are read
  const markAsViewed = useCallback(() => {
    setHasNewMessages(false);
  }, []);

  // Function to restart polling if it was stopped due to errors
  const restartPolling = useCallback(() => {
    errorCountRef.current = 0;
    if (enabled && otherUserId && !intervalRef.current) {
      intervalRef.current = setInterval(fetchStatus, interval);
    }
  }, [enabled, otherUserId, interval, fetchStatus]);

  return {
    status,
    hasNewMessages,
    markAsViewed,
    restartPolling,
    isPollingActive: !!intervalRef.current,
    errorCount: errorCountRef.current,
  };
};
