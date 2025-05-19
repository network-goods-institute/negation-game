import { useCallback } from "react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { SavedChat, ChatMessage } from "@/types/chat";
import { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { createDbChat, markChatAsDeleted } from "@/actions/chatSyncActions";
import { computeChatStateHash } from "@/lib/negation-game/chatUtils";
import { ChatListManagementProps } from "./chatListTypes";

interface UseChatActionsProps extends ChatListManagementProps {
  savedChats: SavedChat[];
  setSavedChats: React.Dispatch<React.SetStateAction<SavedChat[]>>;
  currentChatId: string | null;
  setCurrentChatId: React.Dispatch<React.SetStateAction<string | null>>;
  queuePushUpdate: (chatData: SavedChat, immediate?: boolean) => void;
  setPendingPushIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  savedChatsRef: React.MutableRefObject<SavedChat[]>;
  setChatToDelete: React.Dispatch<React.SetStateAction<string | null>>;
  setChatToRename: React.Dispatch<React.SetStateAction<string | null>>;
  setNewChatTitle: React.Dispatch<React.SetStateAction<string>>;
  setShowDeleteAllConfirmation: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useChatActions({
  currentSpace,
  isAuthenticated,
  savedChats,
  setSavedChats,
  currentChatId,
  setCurrentChatId,
  queuePushUpdate,
  setPendingPushIds,
  onBackgroundCreateSuccess,
  onBackgroundCreateError,
  onBackgroundDeleteSuccess,
  onBackgroundDeleteError,
  savedChatsRef,
  setChatToDelete,
  // setChatToRename, // From useChatDialogs, renameChat will call it directly
  // setNewChatTitle, // From useChatDialogs, renameChat will call it directly
  setShowDeleteAllConfirmation, // From useChatDialogs, deleteAllChats will call it
}: UseChatActionsProps) {
  const updateChat = useCallback(
    (
      chatId: string,
      messages: ChatMessage[],
      title?: string,
      distillRationaleId?: string | null,
      graph?: ViewpointGraph | null | undefined,
      immediate = false
    ): SavedChat | null => {
      if (!currentSpace) {
        return null;
      }

      let updatedChatDataForPush: SavedChat | null = null;

      setSavedChats((prev) => {
        const internalChatIndex = prev.findIndex((c) => c.id === chatId);
        if (internalChatIndex === -1) {
          return prev;
        }

        const currentChat = prev[internalChatIndex];
        const now = new Date().toISOString();
        const messagesToSave = messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          ...(msg.sources && { sources: msg.sources }),
        }));

        const updatedFields: Partial<SavedChat> = {
          messages: messagesToSave,
          updatedAt: now,
        };

        const finalTitle = title !== undefined ? title : currentChat.title;
        if (finalTitle !== currentChat.title) {
          updatedFields.title = finalTitle;
        }

        if (distillRationaleId !== undefined) {
          updatedFields.distillRationaleId = distillRationaleId;
        }

        if (graph !== undefined) {
          updatedFields.graph = graph === null ? undefined : graph;
        }

        const placeholderHash = `sync_update_${Date.now()}`;
        updatedFields.state_hash = placeholderHash;

        const updatedChats = [...prev];
        const finalUpdatedChat: SavedChat = {
          ...currentChat,
          ...updatedFields,
        };

        updatedChats[internalChatIndex] = finalUpdatedChat;

        updatedChats.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        localStorage.setItem(
          `saved_chats_${currentSpace}`,
          JSON.stringify(updatedChats)
        );

        queuePushUpdate(finalUpdatedChat, immediate);
        updatedChatDataForPush = finalUpdatedChat;
        return updatedChats;
      });
      return updatedChatDataForPush;
    },
    [currentSpace, setSavedChats, queuePushUpdate]
  );

  const createNewChat = useCallback(
    async (initialGraph?: ViewpointGraph): Promise<string | null> => {
      if (!currentSpace || !isAuthenticated) {
        return null;
      }

      const newChatId = nanoid();
      const now = new Date().toISOString();
      const newChatHash = `sync_create_${Date.now()}`;

      const newChat: SavedChat = {
        id: newChatId,
        title: "New Chat",
        messages: [],
        createdAt: now,
        updatedAt: now,
        space: currentSpace,
        distillRationaleId: null,
        state_hash: newChatHash,
        graph: initialGraph || undefined,
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
          const actualHash = await computeChatStateHash(
            "New Chat",
            [],
            initialGraph
          );
          const payloadToServer = {
            ...newChat,
            state_hash: actualHash,
            spaceId: currentSpace, // Ensure spaceId is passed for creation
          };

          const result = await createDbChat(payloadToServer);

          if (!result.success) {
            toast.error(
              `Sync Error: Failed to save new chat "${newChat.title}" to server.`
            );
            onBackgroundCreateError?.(
              newChatId,
              result.error || "Failed to save new chat to server."
            );
          } else {
            onBackgroundCreateSuccess?.(newChatId);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown network error";
          toast.error(
            `Sync Error: Could not contact server to save new chat "${newChat.title}".`
          );
          onBackgroundCreateError?.(newChatId, errorMessage);
        } finally {
          setPendingPushIds((prev) => {
            const next = new Set(prev);
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            next.delete(newChatId);
            return next;
          });
        }
      })();

      return newChatId;
    },
    [
      currentSpace,
      isAuthenticated,
      setSavedChats,
      setCurrentChatId,
      setPendingPushIds,
      onBackgroundCreateSuccess,
      onBackgroundCreateError,
    ]
  );

  const deleteChat = useCallback(
    async (chatId: string) => {
      if (!currentSpace || !isAuthenticated) return;

      const chatToDeleteLocally = savedChatsRef.current.find(
        (c) => c.id === chatId
      );
      if (!chatToDeleteLocally) return;

      const shortTitle =
        chatToDeleteLocally.title.substring(0, 20) +
        (chatToDeleteLocally.title.length > 20 ? "..." : "");

      let nextChatId: string | null = null;
      const updatedChats = savedChatsRef.current.filter(
        (chat) => chat.id !== chatId
      );

      if (chatId === currentChatId) {
        if (updatedChats.length > 0) {
          const deletedIndex = savedChatsRef.current.findIndex(
            (c) => c.id === chatId
          );
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
      setChatToDelete(null); // Managed by useChatDialogs, but called here
      toast.success(`Chat "${shortTitle}" removed locally.`);

      setPendingPushIds((prev) => new Set(prev).add(chatId));

      (async () => {
        try {
          const result = await markChatAsDeleted(chatId);

          if (!result.success) {
            toast.error(
              `Sync Error: Failed to delete "${shortTitle}" on server. It might reappear on next sync.`
            );
            onBackgroundDeleteError?.(
              chatId,
              result.error || "Failed to delete on server."
            );
          } else {
            onBackgroundDeleteSuccess?.(chatId);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown network error";
          toast.error(
            `Sync Error: Could not contact server to delete "${shortTitle}". It might reappear.`
          );
          onBackgroundDeleteError?.(chatId, errorMessage);
        } finally {
          setPendingPushIds((prev) => {
            const next = new Set(prev);
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            next.delete(chatId);
            return next;
          });
        }
      })();
    },
    [
      currentSpace,
      isAuthenticated,
      savedChatsRef,
      currentChatId,
      setSavedChats,
      setCurrentChatId,
      setChatToDelete,
      setPendingPushIds,
      onBackgroundDeleteSuccess,
      onBackgroundDeleteError,
    ]
  );

  const switchChat = useCallback(
    (chatId: string | null) => {
      if (chatId === null) {
        setCurrentChatId(null);
        return;
      }
      const chat = savedChatsRef.current.find((c) => c.id === chatId);
      if (chat) {
        setCurrentChatId(chatId);
      }
    },
    [setCurrentChatId, savedChatsRef]
  );

  const renameChat = useCallback(
    async (
      chatId: string,
      newTitle: string,
      setChatToRenameHook: Function,
      setNewChatTitleHook: Function
    ) => {
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
          return prev;
        }

        updated.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        localStorage.setItem(
          `saved_chats_${currentSpace}`,
          JSON.stringify(updated)
        );
        updatedChatDataForPush = updated.find((c) => c.id === chatId) || null;
        return updated;
      });

      if (updatedChatDataForPush) {
        queuePushUpdate(updatedChatDataForPush);
      }

      setChatToRenameHook(null);
      setNewChatTitleHook("");
    },
    [currentSpace, isAuthenticated, setSavedChats, queuePushUpdate]
  );

  const deleteAllChats = useCallback(async () => {
    if (!currentSpace || !isAuthenticated || savedChats.length === 0) return;

    const chatIdsToDelete = savedChats.map((chat) => chat.id);
    const spaceName = currentSpace;

    setPendingPushIds(
      (prev) => new Set([...Array.from(prev), ...chatIdsToDelete])
    );

    localStorage.removeItem(`saved_chats_${spaceName}`);
    setSavedChats([]);
    setCurrentChatId(null);
    setShowDeleteAllConfirmation(false); // Managed by useChatDialogs
    toast.success(
      `All ${chatIdsToDelete.length} chats removed locally from space '${spaceName}'.`
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
          onBackgroundDeleteError?.(result.value.id, errorMsg);
        }
      });

      setPendingPushIds((prev) => {
        const next = new Set(prev);
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        chatIdsToDelete.forEach((id) => next.delete(id));
        return next;
      });

      if (failedDeletions.length > 0) {
        toast.error(
          `Sync Error: Failed to delete ${failedDeletions.length} chat(s) on the server. They might reappear.`
        );
        // onBackgroundDeleteError for each failed is already called above
      } else {
        chatIdsToDelete
          .filter((id) => !failedDeletions.includes(id))
          .forEach((id) => onBackgroundDeleteSuccess?.(id));
      }
    } catch (error) {
      toast.error(
        "Sync Error: An unexpected issue occurred while deleting chats on the server."
      );
      setPendingPushIds((prev) => {
        const next = new Set(prev);
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        chatIdsToDelete.forEach((id) => next.delete(id));
        return next;
      });
    }
  }, [
    currentSpace,
    isAuthenticated,
    savedChats,
    setSavedChats,
    setCurrentChatId,
    setShowDeleteAllConfirmation,
    setPendingPushIds,
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
            return {
              ...serverChatData,
              space: currentSpace, // Ensure space is set to currentSpace
              graph: serverChatData.graph, // Preserve graph data
            };
          }
          return chat;
        });

        if (!chatExists) {
          const newChatFromServer: SavedChat = {
            ...serverChatData,
            space: currentSpace, // Ensure space is set to currentSpace
            graph: serverChatData.graph, // Preserve graph data
          };
          updatedChats.unshift(newChatFromServer); // Add to the beginning if it's new
        }

        updatedChats.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        localStorage.setItem(
          `saved_chats_${currentSpace}`,
          JSON.stringify(updatedChats)
        );
        return updatedChats;
      });

      // If the replaced chat is the current chat, no specific action needed here
      // as the content will update. If it was a new chat that became current,
      // currentChatId would already be set.
    },
    [currentSpace, setSavedChats]
  );

  const deleteChatLocally = useCallback(
    (chatId: string) => {
      if (!currentSpace) return;
      let nextChatIdToSet: string | null = null;
      let originalChatsList: SavedChat[] = [];

      setSavedChats((prev) => {
        originalChatsList = [...prev]; // Capture before filtering
        const updated = prev.filter((chat) => chat.id !== chatId);
        localStorage.setItem(
          `saved_chats_${currentSpace}`,
          JSON.stringify(updated)
        );
        return updated;
      });

      if (chatId === currentChatId) {
        // Use the captured original list to determine the next chat
        const updatedListAfterFilter = originalChatsList.filter(
          (chat) => chat.id !== chatId
        );
        if (updatedListAfterFilter.length > 0) {
          const deletedIndexOriginal = originalChatsList.findIndex(
            (c) => c.id === chatId
          );
          // Determine next index based on original list to correctly pick previous or first
          const nextIndex =
            deletedIndexOriginal > 0 ? deletedIndexOriginal - 1 : 0;
          // Find the chat at that *relative* position in the *new* list
          const chatAtOriginalRelativePos = originalChatsList.filter(
            (c) => c.id !== chatId
          )[nextIndex];
          nextChatIdToSet =
            chatAtOriginalRelativePos?.id ??
            updatedListAfterFilter[0]?.id ??
            null;
        } else {
          nextChatIdToSet = null;
        }
        setCurrentChatId(nextChatIdToSet);
        if (!nextChatIdToSet) {
          localStorage.removeItem(`last_chat_id_${currentSpace}`);
        }
      }
    },
    [currentSpace, currentChatId, setSavedChats, setCurrentChatId]
  );

  return {
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
