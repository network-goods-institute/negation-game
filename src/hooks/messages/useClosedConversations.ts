import { useState, useEffect, useCallback } from "react";import { logger } from "@/lib/logger";

const CLOSED_CONVERSATIONS_KEY = "closedConversations";

interface ClosedConversationData {
  conversationId: string;
  closedAt: number; // timestamp when closed
}

export const useClosedConversations = () => {
  const [closedConversations, setClosedConversations] = useState<
    Map<string, number>
  >(new Map());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CLOSED_CONVERSATIONS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Handle old format (just array of IDs) - convert to new format
          const newMap = new Map<string, number>();
          parsed.forEach((id) => {
            if (typeof id === "string") {
              newMap.set(id, Date.now()); // Use current time as fallback
            }
          });
          setClosedConversations(newMap);
          // Save in new format
          localStorage.setItem(
            CLOSED_CONVERSATIONS_KEY,
            JSON.stringify(
              Array.from(newMap.entries()).map(([id, closedAt]) => ({
                conversationId: id,
                closedAt,
              }))
            )
          );
        } else if (parsed && typeof parsed === "object") {
          const newMap = new Map<string, number>();
          parsed.forEach((item: ClosedConversationData) => {
            if (item.conversationId && typeof item.closedAt === "number") {
              newMap.set(item.conversationId, item.closedAt);
            }
          });
          setClosedConversations(newMap);
        }
      }
    } catch (error) {
      logger.error(
        "Failed to load closed conversations from localStorage:",
        error
      );
    }
  }, []);

  const saveToStorage = useCallback((conversationMap: Map<string, number>) => {
    try {
      const data: ClosedConversationData[] = Array.from(
        conversationMap.entries()
      ).map(([conversationId, closedAt]) => ({
        conversationId,
        closedAt,
      }));
      localStorage.setItem(CLOSED_CONVERSATIONS_KEY, JSON.stringify(data));
    } catch (error) {
      logger.error(
        "Failed to save closed conversations to localStorage:",
        error
      );
    }
  }, []);

  // Close a conversation
  const closeConversation = useCallback(
    (conversationId: string) => {
      const closedAt = Date.now();
      logger.log(
        "Closing conversation:",
        conversationId,
        "at:",
        new Date(closedAt).toISOString()
      );
      setClosedConversations((prev) => {
        const newMap = new Map(prev);
        newMap.set(conversationId, closedAt);
        saveToStorage(newMap);
        return newMap;
      });
    },
    [saveToStorage]
  );

  // Reopen a conversation (when user clicks on it or new message arrives)
  const reopenConversation = useCallback(
    (conversationId: string) => {
      logger.log("Reopening conversation:", conversationId);
      setClosedConversations((prev) => {
        const newMap = new Map(prev);
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        newMap.delete(conversationId);
        saveToStorage(newMap);
        return newMap;
      });
    },
    [saveToStorage]
  );

  // Check if a conversation is closed
  const isConversationClosed = useCallback(
    (conversationId: string) => {
      return closedConversations.has(conversationId);
    },
    [closedConversations]
  );

  const getConversationClosedAt = useCallback(
    (conversationId: string) => {
      return closedConversations.get(conversationId) || null;
    },
    [closedConversations]
  );

  // Check if a conversation should be visible (closed but has new messages after closure)
  const shouldShowClosedConversation = useCallback(
    (conversationId: string, lastMessageAt: string | Date) => {
      const closedAt = closedConversations.get(conversationId);
      if (!closedAt) {
        return true; // Not closed, should show
      }

      const lastMessageTime = new Date(lastMessageAt).getTime();
      const hasNewMessagesSinceClosure = lastMessageTime > closedAt;

      if (hasNewMessagesSinceClosure) {
        logger.log(
          "Closed conversation has messages after closure:",
          conversationId,
          {
            closedAt: new Date(closedAt).toISOString(),
            lastMessageAt: new Date(lastMessageTime).toISOString(),
            shouldShow: true,
          }
        );
      }

      return hasNewMessagesSinceClosure;
    },
    [closedConversations]
  );

  const getClosedConversations = useCallback(() => {
    return Array.from(closedConversations.keys());
  }, [closedConversations]);

  return {
    closedConversations,
    closeConversation,
    reopenConversation,
    isConversationClosed,
    getConversationClosedAt,
    shouldShowClosedConversation,
    getClosedConversations,
  };
};
