import { useState, useEffect, useCallback, useRef } from "react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { SavedChat, ChatMessage } from "@/types/chat";
import { ViewpointGraph } from "@/atoms/viewpointAtoms";
import {
  updateDbChat,
  createDbChat,
  markChatAsDeleted,
} from "@/actions/chatSyncActions";
import { computeChatStateHash } from "@/lib/negation-game/chatUtils";

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
  const savedChatsRef = useRef<SavedChat[]>([]);

  useEffect(() => {
    savedChatsRef.current = savedChats;
  }, [savedChats]);

  const executePush = useCallback(
    async (chatData: SavedChat) => {
      if (!isAuthenticated || !currentSpace) return;
      if (!chatData || !chatData.id) {
        return;
      }

      const chatId = chatData.id;

      setPendingPushIds((prev) => new Set(prev).add(chatId));

      let success = false;
      let op = "update";

      try {
        const currentHash = await computeChatStateHash(
          chatData.title,
          chatData.messages
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
        };

        let result = await updateDbChat(chatToSend);
        success = result.success;

        if (!success) {
          op = "create";
          const createPayload = { ...chatToSend, spaceId: currentSpace };
          result = await createDbChat(createPayload);
          success = result.success;
        }

        if (success) {
          if (op === "create") {
            onBackgroundCreateSuccess?.(chatId);
          } else {
            onBackgroundUpdateSuccess?.(chatId);
          }
        } else {
          const errorMessage = result.error || "Unknown push failure";
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
        updatesToPush.forEach((chatData) => executePush(chatData));
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
    setIsInitialized(false);
    if (
      isAuthenticated === null ||
      isAuthenticated === undefined ||
      !currentSpace
    ) {
      setSavedChats([]);
      setCurrentChatId(null);
      return;
    }

    if (isAuthenticated === false) {
      localStorage.removeItem(`saved_chats_${currentSpace}`);
      setSavedChats([]);
      setCurrentChatId(null);
      setIsInitialized(true);
      return;
    }

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
            distillRationaleId: chat.distillRationaleId,
            graph: chat.graph,
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

    if (chats.length > 0) {
      const lastChatId = localStorage.getItem(`last_chat_id_${currentSpace}`);
      const validLastChat =
        lastChatId && chats.some((c) => c.id === lastChatId);
      if (validLastChat) {
        setCurrentChatId(lastChatId);
      } else if (chats[0].space === currentSpace) {
        setCurrentChatId(chats[0].id);
        localStorage.setItem(`last_chat_id_${currentSpace}`, chats[0].id);
      } else {
        setCurrentChatId(null);
      }
    } else {
      setCurrentChatId(null);
    }

    setIsInitialized(true);
  }, [currentSpace, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && currentSpace && currentChatId) {
      localStorage.setItem(`last_chat_id_${currentSpace}`, currentChatId);
    }
  }, [currentChatId, currentSpace, isAuthenticated]);

  const updateChat = useCallback(
    (
      chatId: string,
      messages: ChatMessage[],
      title?: string,
      distillRationaleId?: string | null,
      graph?: ViewpointGraph
    ) => {
      console.log(
        `[ChatList] updateChat called for ${chatId}. Title: ${title}, DistillID: ${distillRationaleId}, Graph: ${graph ? "Exists" : "Undefined"}`
      );
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
          updatedFields.graph = graph;
        } else {
          // Ensure graph is not added if not provided (important for non-rationale chats)
          // If the current chat already had a graph, we might want to preserve it
          // or explicitly set it to undefined based on desired behavior.
          // For now, let's assume we only update if graph is passed.
          // If currentChat has a graph and graph param is undefined, it remains.
          // To explicitly remove it, we'd need: updatedFields.graph = undefined;
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
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        localStorage.setItem(
          `saved_chats_${currentSpace}`,
          JSON.stringify(updatedChats)
        );

        queuePushUpdate(finalUpdatedChat);

        updatedChatDataForPush = finalUpdatedChat;

        return updatedChats;
      });

      return updatedChatDataForPush;
    },
    [currentSpace, queuePushUpdate]
  );

  const createNewChat = useCallback(
    async (initialGraph?: ViewpointGraph) => {
      console.log(
        "[ChatList] createNewChat called. initialGraph:",
        initialGraph ? "Exists" : "Undefined"
      );
      if (!currentSpace || !isAuthenticated) {
        console.log(
          "[ChatList] createNewChat aborted: No space or not authenticated."
        );
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
      console.log(
        `[ChatList] Creating new chat ${newChatId}. Graph set to:`,
        newChat.graph ? "Exists" : "Undefined"
      );

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
            newChat.title,
            newChat.messages
          );
          const payloadToServer = {
            ...newChat,
            state_hash: actualHash,
            spaceId: currentSpace,
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
      setChatToDelete(null);
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
      currentChatId,
      savedChatsRef,
      isAuthenticated,
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
    [savedChatsRef]
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

    setPendingPushIds((prev) => new Set([...prev, ...chatIdsToDelete]));

    localStorage.removeItem(`saved_chats_${spaceName}`);
    setSavedChats([]);
    setCurrentChatId(null);
    setShowDeleteAllConfirmation(false);
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
        failedDeletions.forEach((id) =>
          onBackgroundDeleteError?.(id, "Failed during bulk delete.")
        );
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
              space: currentSpace,
              graph: serverChatData.graph,
            };
          }
          return chat;
        });

        if (!chatExists) {
          const newChatFromServer: SavedChat = {
            ...serverChatData,
            space: currentSpace,
            graph: serverChatData.graph,
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
      }
    },
    [currentSpace, currentChatId]
  );

  const deleteChatLocally = useCallback(
    (chatId: string) => {
      if (!currentSpace) return;
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
    [currentSpace, currentChatId]
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
