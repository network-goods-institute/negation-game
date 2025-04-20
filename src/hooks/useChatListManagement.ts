import { useState, useEffect, useCallback, useRef } from "react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { SavedChat, ChatMessage } from "@/types/chat";
import {
  updateDbChat,
  createDbChat,
  markChatAsDeleted,
} from "@/actions/chatSyncActions";
import { computeChatStateHash } from "@/lib/chatUtils";

const PUSH_DEBOUNCE_MS = 2500;

interface UseChatListManagementProps {
  currentSpace: string | null;
  isAuthenticated: boolean | null;
  onBackgroundCreateSuccess?: (chatId: string) => void;
  onBackgroundCreateError?: (chatId: string, error: string) => void;
  onBackgroundUpdateSuccess?: (chatId: string) => void;
  onBackgroundUpdateError?: (chatId: string, error: string) => void;
  onBackgroundDeleteSuccess?: (chatId: string) => void;
  onBackgroundDeleteError?: (chatId: string, error: string) => void;
}

type FullChatData = Omit<SavedChat, "createdAt" | "state_hash"> & {
  createdAt?: string;
  state_hash: string;
};

export function useChatListManagement({
  currentSpace,
  isAuthenticated,
  onBackgroundCreateSuccess,
  onBackgroundCreateError,
  onBackgroundUpdateSuccess,
  onBackgroundUpdateError,
  onBackgroundDeleteSuccess,
  onBackgroundDeleteError,
}: UseChatListManagementProps) {
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [chatToRename, setChatToRename] = useState<string | null>(null);
  const [newChatTitle, setNewChatTitle] = useState("");
  const [showDeleteAllConfirmation, setShowDeleteAllConfirmation] =
    useState(false);
  const [pendingPushIds, setPendingPushIds] = useState<Set<string>>(new Set());
  const pushDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChatUpdatesRef = useRef<Map<string, SavedChat>>(new Map());

  const executePush = useCallback(
    async (chatData: SavedChat) => {
      if (!isAuthenticated || !currentSpace) return;
      if (!chatData || !chatData.id) {
        console.warn("[ExecutePush] Invalid chat data provided:", chatData);
        return;
      }

      const chatId = chatData.id;
      console.log(`[ExecutePush] Attempting push for chat ${chatId}...`);

      setPendingPushIds((prev) => new Set(prev).add(chatId));

      let success = false;
      let op = "update";

      try {
        const currentHash = await computeChatStateHash(
          chatData.title,
          chatData.messages
        );
        const chatToSend = { ...chatData, state_hash: currentHash };

        let result = await updateDbChat(chatToSend);
        success = result.success;

        if (!success) {
          op = "create";
          console.log(
            `[ExecutePush] Update failed for ${chatId}, attempting create...`
          );
          const createPayload = { ...chatToSend, spaceId: currentSpace };
          result = await createDbChat(createPayload);
          success = result.success;
        }

        if (success) {
          console.log(
            `[ExecutePush] Successfully pushed (${op}) chat ${chatId} to server.`
          );
          if (op === "create") {
            onBackgroundCreateSuccess?.(chatId);
          } else {
            onBackgroundUpdateSuccess?.(chatId);
          }
        } else {
          const errorMessage = result.error || "Unknown push failure";
          console.error(
            `[ExecutePush] Failed to push chat ${chatId} to server (tried ${op}). Error: ${errorMessage}`
          );
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
        console.error(
          `[ExecutePush] Network/unexpected error during push (${op}) for chat ${chatId}:`,
          error
        );
        toast.error(
          `Error saving chat "${chatData.title.substring(0, 20)}...". Check connection.`
        );
        if (op === "create") {
          onBackgroundCreateError?.(chatId, errorMessage);
        } else {
          onBackgroundUpdateError?.(chatId, errorMessage);
        }
      } finally {
        setPendingPushIds((prev) => {
          const next = new Set(prev);
          next.delete(chatId);
          return next;
        });
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
        console.log(
          `[DebouncedPush] Executing push for ${updatesToPush.length} chats.`
        );
        updatesToPush.forEach((chatData) => executePush(chatData));
      } else {
        console.log("[DebouncedPush] No pending updates to push.");
      }
    }, PUSH_DEBOUNCE_MS);
  }, [executePush]);

  const queuePushUpdate = useCallback(
    (chatData: SavedChat) => {
      pendingChatUpdatesRef.current.set(chatData.id, chatData);
      debouncedPush();
    },
    [debouncedPush]
  );

  useEffect(() => {
    console.log("[ChatList] Auth/Space Effect Triggered:", {
      isAuthenticated,
      currentSpace,
    });
    setIsInitialized(false);
    if (
      isAuthenticated === null ||
      isAuthenticated === undefined ||
      !currentSpace
    ) {
      console.log("[ChatList] Waiting for auth status and space...");
      setSavedChats([]);
      setCurrentChatId(null);
      return;
    }

    if (isAuthenticated === false) {
      console.log("[ChatList] User not authenticated. Clearing local state.");
      localStorage.removeItem(`saved_chats_${currentSpace}`);
      setSavedChats([]);
      setCurrentChatId(null);
      setIsInitialized(true);
      return;
    }

    console.log(
      `[ChatList] Authenticated. Loading chats for space: ${currentSpace}`
    );
    const savedChatsStr = localStorage.getItem(`saved_chats_${currentSpace}`);
    let chats: SavedChat[] = [];
    if (savedChatsStr) {
      try {
        const parsedChats = JSON.parse(savedChatsStr);
        if (Array.isArray(parsedChats)) {
          chats = parsedChats.map((chat: any) => ({
            id: chat.id || nanoid(),
            title: chat.title || "Untitled Chat",
            messages: Array.isArray(chat.messages)
              ? chat.messages.map((msg: any) => ({
                  role: msg.role,
                  content: msg.content,
                  sources: msg.sources,
                }))
              : [],
            createdAt: chat.createdAt || new Date().toISOString(),
            updatedAt: chat.updatedAt || new Date().toISOString(),
            space: chat.space || currentSpace,
            state_hash: chat.state_hash || "",
          }));
        }
        chats.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      } catch (e) {
        console.error("[ChatList] Error parsing saved chats:", e);
        localStorage.removeItem(`saved_chats_${currentSpace}`);
        chats = [];
      }
    }
    setSavedChats(chats);
    console.log(`[ChatList] Loaded ${chats.length} chats from localStorage.`);

    if (chats.length > 0) {
      const lastChatId = localStorage.getItem(`last_chat_id_${currentSpace}`);
      const validLastChat =
        lastChatId && chats.some((c) => c.id === lastChatId);
      if (validLastChat) {
        setCurrentChatId(lastChatId);
        console.log(
          `[ChatList] Set current chat ID from last used: ${lastChatId}`
        );
      } else if (chats[0].space === currentSpace) {
        setCurrentChatId(chats[0].id);
        console.log(
          `[ChatList] Set current chat ID to most recent: ${chats[0].id}`
        );
        localStorage.setItem(`last_chat_id_${currentSpace}`, chats[0].id);
      } else {
        console.warn(
          `[ChatList] Most recent chat space (${chats[0].space}) doesn't match current (${currentSpace}). Not setting current ID.`
        );
        setCurrentChatId(null);
      }
    } else {
      setCurrentChatId(null);
      console.log("[ChatList] No chats loaded, setting current ID to null.");
    }

    setIsInitialized(true);
    console.log("[ChatList] Initialization complete.");
  }, [currentSpace, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && currentSpace && currentChatId) {
      localStorage.setItem(`last_chat_id_${currentSpace}`, currentChatId);
    }
  }, [currentChatId, currentSpace, isAuthenticated]);

  const updateChat = useCallback(
    async (
      chatId: string,
      messages: ChatMessage[],
      title?: string,
      isNewChat = false
    ) => {
      if (!currentSpace) return;

      let updatedChatDataForPush: SavedChat | null = null;

      setSavedChats((prev) => {
        let chatExists = false;
        const now = new Date().toISOString();
        let updatedChats = [...prev];

        const chatIndex = updatedChats.findIndex((c) => c.id === chatId);

        if (chatIndex !== -1) {
          chatExists = true;
          const currentChat = updatedChats[chatIndex];
          const messagesToSave = messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
            ...(msg.sources && { sources: msg.sources }),
          }));
          const newTitle = title || currentChat.title;

          updatedChats[chatIndex] = {
            ...currentChat,
            title: newTitle,
            messages: messagesToSave,
            updatedAt: now,
          };
          updatedChatDataForPush = updatedChats[chatIndex];
        } else if (isNewChat) {
          console.warn(
            `updateChat called for non-existent chatId: ${chatId} with isNewChat=true. Creating.`
          );
          const newChat: SavedChat = {
            id: chatId,
            title: title || "New Chat",
            messages: messages.map((msg) => ({
              role: msg.role,
              content: msg.content,
              ...(msg.sources && { sources: msg.sources }),
            })),
            createdAt: now,
            updatedAt: now,
            space: currentSpace,
            state_hash: "",
          };
          updatedChats.unshift(newChat);
          updatedChatDataForPush = newChat;
          chatExists = true;
        } else {
          console.error(
            `updateChat called for non-existent chatId: ${chatId} without isNewChat flag. Aborting update.`
          );
          return prev;
        }

        if (chatExists && updatedChatDataForPush) {
          updatedChats.sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
          localStorage.setItem(
            `saved_chats_${currentSpace}`,
            JSON.stringify(updatedChats)
          );

          console.log(`[ChatList Update] Queuing push for chat ${chatId}.`);
          queuePushUpdate(updatedChatDataForPush);

          return updatedChats;
        } else {
          return prev;
        }
      });
    },
    [currentSpace, queuePushUpdate]
  );

  const createNewChat = useCallback(async () => {
    if (!currentSpace || !isAuthenticated) {
      console.error(
        "Cannot create chat: No space selected or not authenticated"
      );
      return null;
    }

    const newChatId = nanoid();
    const now = new Date().toISOString();
    const newChat: SavedChat = {
      id: newChatId,
      title: "New Chat",
      messages: [],
      createdAt: now,
      updatedAt: now,
      space: currentSpace,
      state_hash: await computeChatStateHash("New Chat", []),
    };

    setSavedChats((prev) => {
      const updated = [newChat, ...prev];
      localStorage.setItem(
        `saved_chats_${currentSpace}`,
        JSON.stringify(updated)
      );
      return updated;
    });

    setCurrentChatId(newChatId);

    setPendingPushIds((prev) => new Set(prev).add(newChatId));

    (async () => {
      try {
        console.log(
          `[ChatList] Attempting background server create for new chat ${newChatId}...`
        );
        const result = await createDbChat({
          ...newChat,
          spaceId: currentSpace,
        });

        if (!result.success) {
          console.error(
            `[ChatList] Background server create failed for ${newChatId}: ${result.error}`
          );
          toast.error(
            `Sync Error: Failed to save new chat "${newChat.title}" to server.`
          );
          onBackgroundCreateError?.(
            newChatId,
            result.error || "Failed to save new chat to server."
          );
        } else {
          console.log(
            `[ChatList] Background server create successful for ${newChatId}.`
          );
          onBackgroundCreateSuccess?.(newChatId);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown network error";
        console.error(
          `[ChatList] Network error during background server create for ${newChatId}:`,
          error
        );
        toast.error(
          `Sync Error: Could not contact server to save new chat "${newChat.title}".`
        );
        onBackgroundCreateError?.(newChatId, errorMessage);
      } finally {
        setPendingPushIds((prev) => {
          const next = new Set(prev);
          next.delete(newChatId);
          return next;
        });
      }
    })();

    return newChatId;
  }, [
    currentSpace,
    isAuthenticated,
    onBackgroundCreateSuccess,
    onBackgroundCreateError,
  ]);

  const deleteChat = useCallback(
    async (chatId: string) => {
      if (!currentSpace || !isAuthenticated) return;

      const chatToDeleteLocally = savedChats.find((c) => c.id === chatId);
      if (!chatToDeleteLocally) return;

      const shortTitle =
        chatToDeleteLocally.title.substring(0, 20) +
        (chatToDeleteLocally.title.length > 20 ? "..." : "");

      console.log(`[ChatList] Deleting chat locally immediately: ${chatId}`);
      let nextChatId: string | null = null;
      const updatedChats = savedChats.filter((chat) => chat.id !== chatId);

      if (chatId === currentChatId) {
        if (updatedChats.length > 0) {
          const deletedIndex = savedChats.findIndex((c) => c.id === chatId);
          const nextIndex = deletedIndex > 0 ? deletedIndex - 1 : 0;
          nextChatId = updatedChats[nextIndex]?.id ?? null;
        } else {
          nextChatId = null;
        }
      }

      setSavedChats(updatedChats);
      localStorage.setItem(
        `saved_chats_${currentSpace}`,
        JSON.stringify(updatedChats)
      );

      if (chatId === currentChatId) {
        setCurrentChatId(nextChatId);
        if (!nextChatId) {
          localStorage.removeItem(`last_chat_id_${currentSpace}`);
        }
      }
      setChatToDelete(null);
      toast.success(`Chat "${shortTitle}" removed locally.`);

      setPendingPushIds((prev) => new Set(prev).add(chatId));

      (async () => {
        try {
          console.log(
            `[ChatList] Attempting background server delete for ${chatId}...`
          );
          const result = await markChatAsDeleted(chatId);

          if (!result.success) {
            console.error(
              `[ChatList] Background server delete failed for ${chatId}: ${result.error}`
            );
            toast.error(
              `Sync Error: Failed to delete "${shortTitle}" on server. It might reappear on next sync.`
            );
            onBackgroundDeleteError?.(
              chatId,
              result.error || "Failed to delete on server."
            );
          } else {
            console.log(
              `[ChatList] Background server delete successful for ${chatId}.`
            );
            onBackgroundDeleteSuccess?.(chatId);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown network error";
          console.error(
            `[ChatList] Network error during background server delete for ${chatId}:`,
            error
          );
          toast.error(
            `Sync Error: Could not contact server to delete "${shortTitle}". It might reappear.`
          );
          onBackgroundDeleteError?.(chatId, errorMessage);
        } finally {
          setPendingPushIds((prev) => {
            const next = new Set(prev);
            next.delete(chatId);
            return next;
          });
        }
      })();
    },
    [
      currentSpace,
      currentChatId,
      savedChats,
      isAuthenticated,
      onBackgroundDeleteSuccess,
      onBackgroundDeleteError,
    ]
  );

  const switchChat = useCallback(
    (chatId: string | null) => {
      if (chatId === null) {
        setCurrentChatId(null);
        console.log("[ChatList] Cleared current chat selection.");
        return;
      }
      const chat = savedChats.find((c) => c.id === chatId);
      if (chat) {
        setCurrentChatId(chatId);
        console.log(`[ChatList] Switched to chat ID: ${chatId}`);
      } else {
        console.warn(
          `[ChatList] Attempted to switch to non-existent chat ID: ${chatId}`
        );
      }
    },
    [savedChats]
  );

  const renameChat = useCallback(
    async (chatId: string, newTitle: string) => {
      const trimmedTitle = newTitle.trim();
      if (!trimmedTitle || !currentSpace || !isAuthenticated) return;

      let updatedChatDataForPush: SavedChat | null = null;

      setSavedChats((prev) => {
        let chatFound = false;
        const updated = prev.map((chat) => {
          if (chat.id === chatId) {
            chatFound = true;
            return {
              ...chat,
              title: trimmedTitle,
              updatedAt: new Date().toISOString(),
            };
          }
          return chat;
        });

        if (!chatFound) {
          console.warn(`[Rename Chat] Chat ID ${chatId} not found.`);
          return prev;
        }

        updated.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        localStorage.setItem(
          `saved_chats_${currentSpace}`,
          JSON.stringify(updated)
        );
        updatedChatDataForPush = updated.find((c) => c.id === chatId) || null;
        return updated;
      });

      if (updatedChatDataForPush) {
        console.log(`[ChatList Rename] Queuing push for chat ${chatId}.`);
        queuePushUpdate(updatedChatDataForPush);
      }

      setChatToRename(null);
      setNewChatTitle("");
    },
    [currentSpace, isAuthenticated, queuePushUpdate]
  );

  const deleteAllChats = useCallback(async () => {
    if (!currentSpace || !isAuthenticated || savedChats.length === 0) return;

    const chatIdsToDelete = savedChats.map((chat) => chat.id);
    const spaceName = currentSpace;
    console.log(
      `[ChatList] Deleting all ${chatIdsToDelete.length} chats locally for space: ${spaceName}`
    );

    setPendingPushIds((prev) => new Set([...prev, ...chatIdsToDelete]));

    localStorage.removeItem(`saved_chats_${spaceName}`);
    setSavedChats([]);
    setCurrentChatId(null);
    setShowDeleteAllConfirmation(false);
    toast.success(
      `All ${chatIdsToDelete.length} chats removed locally from space '${spaceName}'.`
    );

    console.log(
      `[ChatList] Attempting background server delete for ${chatIdsToDelete.length} chats...`
    );
    const deletePromises = chatIdsToDelete.map((id) =>
      markChatAsDeleted(id)
        .then((result) => ({ ...result, id }))
        .catch((err: any) => ({
          success: false,
          id,
          error: err instanceof Error ? err.message : String(err),
        }))
    );

    try {
      const results = await Promise.allSettled(deletePromises);
      const failedDeletions: string[] = [];

      results.forEach((result) => {
        if (result.status === "fulfilled" && !result.value.success) {
          failedDeletions.push(result.value.id);
          const errorMsg = result.value.error || "Unknown reason";
          console.error(
            `[ChatList DeleteAll] Server delete failed for ${result.value.id}: ${errorMsg}`
          );
          onBackgroundDeleteError?.(result.value.id, errorMsg);
        } else if (result.status === "rejected") {
          console.error(
            `[ChatList DeleteAll] Promise rejected during delete:`,
            result.reason
          );
        }
      });

      setPendingPushIds((prev) => {
        const next = new Set(prev);
        chatIdsToDelete.forEach((id) => next.delete(id));
        return next;
      });

      if (failedDeletions.length > 0) {
        console.error(
          `[ChatList] Background server delete failed for ${failedDeletions.length} chats.`
        );
        toast.error(
          `Sync Error: Failed to delete ${failedDeletions.length} chat(s) on the server. They might reappear.`
        );
        failedDeletions.forEach((id) =>
          onBackgroundDeleteError?.(id, "Failed during bulk delete.")
        );
      } else {
        console.log(
          `[ChatList] Background server delete successful for all ${chatIdsToDelete.length} chats.`
        );
        chatIdsToDelete
          .filter((id) => !failedDeletions.includes(id))
          .forEach((id) => onBackgroundDeleteSuccess?.(id));
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error during bulk delete";
      console.error(
        "[ChatList] Unexpected error during background delete all:",
        error
      );
      toast.error(
        "Sync Error: An unexpected issue occurred while deleting chats on the server."
      );
      setPendingPushIds((prev) => {
        const next = new Set(prev);
        chatIdsToDelete.forEach((id) => next.delete(id));
        return next;
      });
    }
  }, [
    currentSpace,
    isAuthenticated,
    savedChats,
    onBackgroundDeleteSuccess,
    onBackgroundDeleteError,
  ]);

  const replaceChat = useCallback(
    (chatId: string, serverChatData: SavedChat) => {
      if (!currentSpace) return;

      setSavedChats((prev) => {
        let chatExists = false;
        const updatedChats = prev.map((chat) => {
          if (chat.id === chatId) {
            chatExists = true;
            return { ...serverChatData, space: currentSpace };
          }
          return chat;
        });

        if (!chatExists) {
          const newChatFromServer: SavedChat = {
            ...serverChatData,
            space: currentSpace,
          };
          updatedChats.unshift(newChatFromServer);
        }

        updatedChats.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

        localStorage.setItem(
          `saved_chats_${currentSpace}`,
          JSON.stringify(updatedChats)
        );
        return updatedChats;
      });

      if (chatId === currentChatId) {
        console.log(
          `[Sync Replace] Replaced currently active chat ${chatId}. UI should update.`
        );
      }
    },
    [currentSpace, currentChatId]
  );

  const deleteChatLocally = useCallback(
    (chatId: string) => {
      if (!currentSpace) return;
      console.log(
        `[ChatList Sync Delete] Deleting chat locally only: ${chatId}`
      );
      let nextChatId: string | null = null;
      let originalChats: SavedChat[] = [];

      setSavedChats((prev) => {
        originalChats = [...prev];
        const updated = prev.filter((chat) => chat.id !== chatId);
        localStorage.setItem(
          `saved_chats_${currentSpace}`,
          JSON.stringify(updated)
        );
        return updated;
      });

      if (chatId === currentChatId) {
        const updatedChats = originalChats.filter((chat) => chat.id !== chatId);
        if (updatedChats.length > 0) {
          const deletedIndex = originalChats.findIndex((c) => c.id === chatId);
          const nextIndex = deletedIndex > 0 ? deletedIndex - 1 : 0;
          nextChatId = updatedChats[nextIndex]?.id ?? null;
        } else {
          nextChatId = null;
        }
        setCurrentChatId(nextChatId);
        if (!nextChatId) {
          localStorage.removeItem(`last_chat_id_${currentSpace}`);
        }
      }
    },
    [currentSpace, savedChats, currentChatId]
  );

  return {
    savedChats,
    currentChatId,
    isInitialized,
    chatToRename,
    setChatToRename,
    newChatTitle,
    setNewChatTitle,
    chatToDelete,
    setChatToDelete,
    showDeleteAllConfirmation,
    setShowDeleteAllConfirmation,
    pendingPushIds,
    updateChat,
    createNewChat,
    deleteChat,
    deleteAllChats,
    renameChat,
    switchChat,
    replaceChat,
    deleteChatLocally,
  };
}
