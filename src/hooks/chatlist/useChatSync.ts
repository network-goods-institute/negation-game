import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { SavedChat } from "@/types/chat";
import { updateDbChat, createDbChat } from "@/actions/chat/chatSyncActions";
import { computeChatStateHash } from "@/lib/negation-game/chatUtils";
import {
  ChatListManagementProps,
  ChatSyncState,
} from "@/hooks/chatlist/chatListTypes";
import { setPrivyToken } from "@/lib/privy/setPrivyToken";

const PUSH_DEBOUNCE_MS = 2500;

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

  const executePush = useCallback(
    async (chatData: SavedChat) => {
      if (!isAuthenticated || !currentSpace) return;
      if (!chatData || !chatData.id) {
        return;
      }
      // Refresh token before sync to handle potential token expiration
      try {
        const tokenRefreshed = await setPrivyToken();
        if (!tokenRefreshed) {
          console.warn("Token refresh returned false before chat sync");
        }
      } catch (error) {
        console.warn("Failed to refresh Privy token before chat sync:", error);
      }

      const chatId = chatData.id;

      // No need to add to pendingPushIds here if queuePushUpdate handles it before calling executePush
      // However, if executePush can be called directly, this might still be needed.
      // For now, assuming queuePushUpdate is the entry point that sets pendingPushIds.

      let success = false;
      let op = "update";

      try {
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

        console.log("[executePush] Prepared chat data for sync:", {
          chatId,
          distillRationaleId: chatToSend.distillRationaleId,
          operation: "update",
        });

        let result = await updateDbChat(chatToSend);
        success = result.success;

        if (!success) {
          op = "create";
          console.log("[executePush] Update failed, attempting create:", {
            chatId,
            distillRationaleId: chatToSend.distillRationaleId,
          });
          const createPayload = { ...chatToSend, spaceId: currentSpace };
          result = await createDbChat(createPayload);
          success = result.success;
        }

        if (success) {
          console.log("[executePush] Sync successful:", {
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
          console.error("[executePush] Sync failed:", {
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
          console.log(
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
              try {
                let retryResult = await updateDbChat(chatData);
                retrySuccess = retryResult.success;

                if (!retrySuccess) {
                  const createPayload = { ...chatData, spaceId: currentSpace };
                  retryResult = await createDbChat(createPayload);
                  retrySuccess = retryResult.success;
                  op = "create";
                }

                if (retrySuccess) {
                  console.log(
                    "[executePush] Retry after token refresh successful:",
                    {
                      chatId,
                      operation: op,
                    }
                  );
                  if (op === "create") {
                    onBackgroundCreateSuccess?.(chatId);
                  } else {
                    onBackgroundUpdateSuccess?.(chatId);
                  }
                  return; // Exit successfully
                }
              } catch (retryError) {
                console.warn("[executePush] Retry failed:", retryError);
              }
            }
          } catch (tokenError) {
            console.warn(
              "[executePush] Token refresh failed during retry:",
              tokenError
            );
          }
        }

        console.error("[executePush] Sync error:", {
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
        setPendingPushIds((prev) => {
          const next = new Set(prev);
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          next.delete(chatId);
          return next;
        });
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        pendingChatUpdatesRef.current.delete(chatId);
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
        updatesToPush.forEach((chatData) => {
          setPendingPushIds((prev) => new Set(prev).add(chatData.id)); // Add to pending before push
          executePush(chatData);
        });
      }
    }, PUSH_DEBOUNCE_MS);
  }, [executePush]);

  const queuePushUpdate = useCallback(
    (chatData: SavedChat, immediate = false) => {
      if (!chatData || !chatData.id) return;

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

  return {
    pendingPushIds,
    setPendingPushIds,
    pushDebounceTimeoutRef,
    pendingChatUpdatesRef,
    queuePushUpdate,
    executePush,
  };
}
