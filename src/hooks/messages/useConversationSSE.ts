import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/queries/users/useUser";
import { usePrivy } from "@privy-io/react-auth";

interface ConversationStatus {
  unreadCount: number;
}

interface UseConversationSSEProps {
  otherUserId: string;
  spaceId: string;
  enabled?: boolean;
  lastSequence?: string;
}

export const useConversationSSE = ({
  otherUserId,
  spaceId,
  enabled = true,
  lastSequence,
}: UseConversationSSEProps) => {
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  const [status, setStatus] = useState<ConversationStatus | null>(null);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const invalidateQueries = useCallback(() => {
    const conversationKey = ["conversation", user?.id, otherUserId, spaceId];
    const conversationsKey = ["conversations", user?.id, spaceId];

    if (!queryClient.isFetching({ queryKey: conversationKey })) {
      queryClient.invalidateQueries({ queryKey: conversationKey });
    }
    if (!queryClient.isFetching({ queryKey: conversationsKey })) {
      queryClient.invalidateQueries({ queryKey: conversationsKey });
    }
  }, [queryClient, user?.id, otherUserId, spaceId]);

  const connect = useCallback(() => {
    if (!enabled || !otherUserId || !user?.id || eventSourceRef.current) {
      return;
    }

    const url = new URL(
      `/api/spaces/${encodeURIComponent(spaceId)}/messages/events`,
      window.location.origin
    );
    url.searchParams.set("otherUserId", otherUserId);
    if (lastSequence) {
      url.searchParams.set("lastSequence", lastSequence);
    }

    const eventSource = new EventSource(url.toString());
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    eventSource.addEventListener("update", (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "messages" && data.messages.length > 0) {
        setHasNewMessages(true);
        invalidateQueries();
      }
    });

    eventSource.addEventListener("status", (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "status") {
        setStatus({ unreadCount: data.unreadCount });
      }
    });

    eventSource.addEventListener("heartbeat", () => {
      // Keep connection alive
    });

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      setIsConnected(false);
      eventSource.close();
      eventSourceRef.current = null;

      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttemptsRef.current),
          30000
        );
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      }
    };

    return eventSource;
  }, [
    enabled,
    otherUserId,
    user?.id,
    spaceId,
    lastSequence,
    invalidateQueries,
  ]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (enabled && otherUserId && user?.id) {
      connect();
    } else {
      disconnect();
    }

    return disconnect;
  }, [enabled, otherUserId, user?.id, connect, disconnect]);

  const markAsViewed = useCallback(() => {
    setHasNewMessages(false);
  }, []);

  const restartConnection = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connect();
  }, [disconnect, connect]);

  return {
    status,
    hasNewMessages,
    markAsViewed,
    restartConnection,
    isConnected,
    reconnectAttempts: reconnectAttemptsRef.current,
  };
};
