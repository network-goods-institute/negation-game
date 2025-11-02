import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { SavedChat } from "@/types/chat";
import { updateDbChat, createDbChat } from "@/actions/chat/chatSyncActions";
import { computeChatStateHash } from "@/lib/negation-game/chatUtils";
import {
  ChatListManagementProps,
  ChatSyncState,
} from "@/hooks/chatlist/chatListTypes";
import { setPrivyToken } from "@/lib/privy/setPrivyToken";import { logger } from "@/lib/logger";

const PUSH_DEBOUNCE_MS = 500;

export function useChatSync({
  currentSpace,
  isAuthenticated,
  onBackgroundCreateSuccess,
  onBackgroundCreateError,
  onBackgroundUpdateSuccess,
  onBackgroundUpdateError,
}: ChatListManagementProps): ChatSyncState & {
  queuePushUpdate: (chatData: SavedChat, immediate?: boolean) => void;
  setPendingPushIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  executePush: (chatData: SavedChat) => Promise<void>;
} {
  const [pendingPushIds, setPendingPushIds] = useState<Set<string>>(new Set());
  const pushDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChatUpdatesRef = useRef<Map<string, SavedChat>>(new Map());
  const activePushesRef = useRef<Set<string>>(new Set());

  const executePush = useCallback(
    async (chatData: SavedChat) => {
      if (!isAuthenticated || !currentSpace) return;
      if (!chatData || !chatData.id) {
        return;
      }

      const chatId = chatData.id;

      if (activePushesRef.current.has(chatId)) {
        logger.log(
          `[executePush] Skipping concurrent push for chat ${chatId}`
        );
        return;
      }

      activePushesRef.current.add(chatId);

      const timeoutId = setTimeout(() => {
        logger.warn(`[executePush] Timeout for chat ${chatId}, cleaning up`);
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        activePushesRef.current.delete(chatId);
        setPendingPushIds((prev) => {
          const next = new Set(prev);
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          next.delete(chatId);
          return next;
        });
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        pendingChatUpdatesRef.current.delete(chatId);
      }, 15000); // 15 second timeout

      let success = false;
      let op = "update";

      try {
        try {
          const tokenRefreshed = await setPrivyToken();
          if (!tokenRefreshed) {
            logger.warn("Token refresh returned false before chat sync");
          }
        } catch (error) {
          logger.warn(
            "Failed to refresh Privy token before chat sync:",
            error
          );
        }

        const currentHash = await computeChatStateHash(
          chatData.title,
          chatData.messages,
          chatData.graph
        );
        const chatToSend: SavedChat & { state_hash: string } = {
          ...chatData,
          graph:
            chatData.graph &&
            (chatData.graph.nodes?.length > 0 ||
              chatData.graph.edges?.length > 0)
              ? chatData.graph
              : undefined,
          state_hash: currentHash,
          distillRationaleId: chatData.distillRationaleId ?? null,
        };

        logger.log("[executePush] Prepared chat data for sync:", {
          chatId,
          distillRationaleId: chatToSend.distillRationaleId,
          operation: "update",
        });

        let result = await updateDbChat(chatToSend);
        success = result.success;

        if (!success) {
          op = "create";
          logger.log("[executePush] Update failed, attempting create:", {
            chatId,
            distillRationaleId: chatToSend.distillRationaleId,
          });
          const createPayload = { ...chatToSend, spaceId: currentSpace };
          result = await createDbChat(createPayload);
          success = result.success;
        }

        if (success) {
          logger.log("[executePush] Sync successful:", {
            chatId,
            operation: op,
            distillRationaleId: chatToSend.distillRationaleId,
          });
          if (op === "create") {
            onBackgroundCreateSuccess?.(chatId);
          } else {
            onBackgroundUpdateSuccess?.(chatId);
          }
        } else {
          const errorMessage = result.error || "Unknown push failure";
          logger.error("[executePush] Sync failed:", {
            chatId,
            operation: op,
            error: errorMessage,
            distillRationaleId: chatToSend.distillRationaleId,
          });
          toast.error(
            `Failed to save chat "${chatData.title.substring(0, 20)}..." to server.`
          );
          if (op === "create") {
            onBackgroundCreateError?.(chatId, errorMessage);
          } else {
            onBackgroundUpdateError?.(chatId, errorMessage);
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        // Check if this is an authentication error and retry once with token refresh
        const isAuthError =
          errorMessage.toLowerCase().includes("not authenticated") ||
          errorMessage.toLowerCase().includes("authentication required") ||
          errorMessage.toLowerCase().includes("must be authenticated") ||
          errorMessage.toLowerCase().includes("user not authenticated") ||
          errorMessage.toLowerCase().includes("invalid auth token") ||
          errorMessage.toLowerCase().includes("jwt") ||
          errorMessage.toLowerCase().includes("token");

        if (isAuthError) {
          logger.log(
            "[executePush] Auth error detected, attempting token refresh and retry:",
            {
              chatId,
              error: errorMessage,
            }
          );

          try {
            const tokenRefreshed = await setPrivyToken();
            if (tokenRefreshed) {
              // Wait a moment for token to propagate
              await new Promise((resolve) => setTimeout(resolve, 300));

              // Retry the operation once
              let retrySuccess = false;
              let retryOp = "update";
              try {
                let retryResult = await updateDbChat(chatData);
                retrySuccess = retryResult.success;

                if (!retrySuccess) {
                  const createPayload = { ...chatData, spaceId: currentSpace };
                  retryResult = await createDbChat(createPayload);
                  retrySuccess = retryResult.success;
                  retryOp = "create";
                }

                if (retrySuccess) {
                  logger.log(
                    "[executePush] Retry after token refresh successful:",
                    {
                      chatId,
                      operation: retryOp,
                    }
                  );
                  if (retryOp === "create") {
                    onBackgroundCreateSuccess?.(chatId);
                  } else {
                    onBackgroundUpdateSuccess?.(chatId);
                  }
                  return; // Exit successfully
                }
              } catch (retryError) {
                logger.warn("[executePush] Retry failed:", retryError);
              }
            }
          } catch (tokenError) {
            logger.warn(
              "[executePush] Token refresh failed during retry:",
              tokenError
            );
          }
        }

        logger.error("[executePush] Sync error:", {
          chatId,
          error: errorMessage,
          distillRationaleId: chatData.distillRationaleId,
        });

        if (isAuthError) {
          toast.error(
            "Authentication expired. Please refresh the page to continue syncing chats."
          );
        } else {
          toast.error(
            `Error saving chat "${chatData.title.substring(0, 20)}..." to server. Check connection.`
          );
        }
        if (op === "create") {
          onBackgroundCreateError?.(chatId, errorMessage);
        } else {
          onBackgroundUpdateError?.(chatId, errorMessage);
        }
      } finally {
        clearTimeout(timeoutId);
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        activePushesRef.current.delete(chatId);
        setPendingPushIds((prev) => {
          const next = new Set(prev);
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          next.delete(chatId);
          return next;
        });
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        pendingChatUpdatesRef.current.delete(chatId);
        logger.log(`[executePush] Cleanup completed for chat: ${chatId}`);
      }
    },
    [
      isAuthenticated,
      currentSpace,
      onBackgroundCreateSuccess,
      onBackgroundCreateError,
      onBackgroundUpdateSuccess,
      onBackgroundUpdateError,
    ]
  );

  const debouncedPush = useCallback(() => {
    if (pushDebounceTimeoutRef.current) {
      clearTimeout(pushDebounceTimeoutRef.current);
    }
    pushDebounceTimeoutRef.current = setTimeout(() => {
      const updatesToPush = Array.from(pendingChatUpdatesRef.current.values());
      if (updatesToPush.length > 0) {
        logger.log(
          `[debouncedPush] Processing ${updatesToPush.length} pending updates`
        );
        // Process each chat sequentially to avoid race conditions
        updatesToPush.forEach((chatData) => {
          // Only start push if not already active
          if (!activePushesRef.current.has(chatData.id)) {
            setPendingPushIds((prev) => new Set(prev).add(chatData.id));
            executePush(chatData);
          } else {
            logger.log(
              `[debouncedPush] Skipping ${chatData.id} - already pushing`
            );
          }
        });
        // Clear the pending updates after starting pushes
        pendingChatUpdatesRef.current.clear();
      }
    }, PUSH_DEBOUNCE_MS);
  }, [executePush]);

  const queuePushUpdate = useCallback(
    (chatData: SavedChat, immediate = false) => {
      if (!chatData || !chatData.id) return;

      if (activePushesRef.current.has(chatData.id)) {
        logger.log(
          `[queuePushUpdate] Skipping queue for active push: ${chatData.id}`
        );
        return;
      }

      logger.log(
        `[queuePushUpdate] Queuing ${immediate ? "immediate" : "debounced"} push for: ${chatData.id}`
      );
      setPendingPushIds((prev) => new Set(prev).add(chatData.id));

      if (immediate) {
        if (pushDebounceTimeoutRef.current) {
          clearTimeout(pushDebounceTimeoutRef.current);
        }
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        pendingChatUpdatesRef.current.delete(chatData.id);
        executePush(chatData);
      } else {
        pendingChatUpdatesRef.current.set(chatData.id, chatData);
        debouncedPush();
      }
    },
    [debouncedPush, executePush]
  );

  useEffect(() => {
    const currentActivePushes = activePushesRef.current;
    const currentPendingUpdates = pendingChatUpdatesRef.current;

    return () => {
      if (pushDebounceTimeoutRef.current) {
        clearTimeout(pushDebounceTimeoutRef.current);
      }
      currentActivePushes.clear();
      currentPendingUpdates.clear();
      setPendingPushIds(new Set());
    };
  }, []);

  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setPendingPushIds((prev) => {
        const active = new Set(activePushesRef.current);
        const pending = new Set(pendingChatUpdatesRef.current.keys());
        const cleaned = new Set<string>();

        for (const id of prev) {
          if (active.has(id) || pending.has(id)) {
            cleaned.add(id);
          } else {
            logger.log(`[cleanup] Removing stale pending push ID: ${id}`);
          }
        }

        return cleaned;
      });
    }, 10000);

    return () => clearInterval(cleanupInterval);
  }, []);

  return {
    pendingPushIds,
    setPendingPushIds,
    pushDebounceTimeoutRef,
    pendingChatUpdatesRef,
    queuePushUpdate,
    executePush,
  };
}
