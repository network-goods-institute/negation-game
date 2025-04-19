import { useState, useEffect, useCallback } from "react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { SavedChat, ChatMessage } from "@/types/chat";
import {
  updateDbChat,
  createDbChat,
  markChatAsDeleted,
} from "@/actions/chatSyncActions";

interface UseChatListManagementProps {
  currentSpace: string | null;
  isAuthenticated: boolean | null;
}

type FullChatData = Omit<SavedChat, "createdAt" | "state_hash"> & {
  createdAt?: string;
  state_hash: string;
};

export function useChatListManagement({
  currentSpace,
  isAuthenticated,
}: UseChatListManagementProps) {
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [chatToRename, setChatToRename] = useState<string | null>(null);
  const [newChatTitle, setNewChatTitle] = useState("");
  const [showDeleteAllConfirmation, setShowDeleteAllConfirmation] =
    useState(false);

  // Define pushChatUpdateToServer earlier
  const pushChatUpdateToServer = useCallback(
    async (chatData: SavedChat) => {
      if (!isAuthenticated) return;
      console.log(
        `[Sync] Attempting to push changes for chat ${chatData.id}...`
      );
      const shortTitle =
        chatData.title.substring(0, 20) +
        (chatData.title.length > 20 ? "..." : "");
      let success = false;
      let op = "update";

      try {
        let result = await updateDbChat(chatData);
        success = result.success;

        if (!success) {
          op = "create";
          console.log(
            `[Sync] Update failed for ${chatData.id}, attempting create...`
          );
          result = await createDbChat({ ...chatData, spaceId: currentSpace });
          success = result.success;
        }

        if (success) {
          console.log(
            `[Sync] Successfully pushed (${op}) chat ${chatData.id} to server.`
          );
        } else {
          console.error(
            `[Sync] Failed to push chat ${chatData.id} to server (tried ${op}).`
          );
          toast.error(`Failed to save chat "${shortTitle}" to server.`);
        }
      } catch (error) {
        console.error(
          `[Sync] Network/unexpected error during push sync (${op}) for chat ${chatData.id}:`,
          error
        );
        toast.error(`Error saving chat "${shortTitle}".`);
      }
    },
    [isAuthenticated, currentSpace]
  );

  useEffect(() => {
    console.log("[ChatList] Auth/Space Effect Triggered:", {
      isAuthenticated,
      currentSpace,
    });
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
      if (chats[0].space === currentSpace) {
        setCurrentChatId(chats[0].id);
        console.log(`[ChatList] Set current chat ID to: ${chats[0].id}`);
      } else {
        console.warn(
          `[ChatList] First chat space (${chats[0].space}) doesn't match current (${currentSpace}). Not setting current ID.`
        );
        setCurrentChatId(null);
      }
    } else {
      setCurrentChatId(null);
      console.log("[ChatList] No chats loaded, setting current ID to null.");
    }
  }, [currentSpace, isAuthenticated]);

  const updateChat = useCallback(
    async (chatId: string, messages: ChatMessage[], title?: string) => {
      if (!currentSpace) return;

      let updatedChatData: SavedChat | null = null;

      setSavedChats((prev) => {
        let chatExists = false;
        const updatedChats = prev.map((chat) => {
          if (chat.id === chatId) {
            chatExists = true;
            const messagesToSave = messages.map((msg) => ({
              role: msg.role,
              content: msg.content,
              ...(msg.sources && { sources: msg.sources }),
            }));
            return {
              ...chat,
              title: title || chat.title,
              messages: messagesToSave,
              updatedAt: new Date().toISOString(),
            };
          }
          return chat;
        });

        if (!chatExists) {
          console.warn(
            `updateChat called for non-existent chatId: ${chatId}. Creating.`
          );
          const newChat: SavedChat = {
            id: chatId,
            title: title || "New Chat",
            messages: messages.map((msg) => ({
              role: msg.role,
              content: msg.content,
              ...(msg.sources && { sources: msg.sources }),
            })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            space: currentSpace,
            state_hash: "",
          };
          updatedChats.unshift(newChat);
        }

        updatedChatData = updatedChats.find((c) => c.id === chatId) || null;

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

      if (updatedChatData) {
        console.log(
          `[ChatList] Immediately attempting push for chat ${chatId} after update.`
        );
        await pushChatUpdateToServer(updatedChatData);
      } else {
        console.warn(
          `[ChatList] Could not find updated chat data for ${chatId} to queue push.`
        );
      }
    },
    [currentSpace, pushChatUpdateToServer]
  );

  const createNewChat = useCallback(async () => {
    if (!currentSpace || !isAuthenticated) {
      console.error(
        "Cannot create chat: No space selected or not authenticated"
      );
      return null;
    }

    const newChatId = nanoid();
    const newChat: SavedChat = {
      id: newChatId,
      title: "New Chat",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      space: currentSpace,
      state_hash: "",
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

    try {
      console.log(
        `[ChatList] Attempting background server create for new chat ${newChatId}...`
      );
      const result = await createDbChat({ ...newChat, spaceId: currentSpace });

      if (!result.success) {
        console.error(
          `[ChatList] Background server create failed for ${newChatId}.`
        );
        toast.error(
          `Sync Error: Failed to save new chat "${newChat.title}" to server.`
        );
      } else {
        console.log(
          `[ChatList] Background server create successful for ${newChatId}.`
        );
      }
    } catch (error) {
      console.error(
        `[ChatList] Network error during background server create for ${newChatId}:`,
        error
      );
      toast.error(
        `Sync Error: Could not contact server to save new chat "${newChat.title}".`
      );
    }

    return newChatId;
  }, [currentSpace, isAuthenticated]);

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
          const nextIndex = Math.min(deletedIndex, updatedChats.length - 1);
          nextChatId = updatedChats[nextIndex].id;
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
      }
      setChatToDelete(null);
      toast.success(`Chat "${shortTitle}" removed locally.`);

      try {
        console.log(
          `[ChatList] Attempting background server delete for ${chatId}...`
        );
        const result = await markChatAsDeleted(chatId);

        if (!result.success) {
          console.error(
            `[ChatList] Background server delete failed for ${chatId}.`
          );
          toast.error(
            `Sync Error: Failed to delete "${shortTitle}" on server. It might reappear on next sync.`
          );
        } else {
          console.log(
            `[ChatList] Background server delete successful for ${chatId}.`
          );
        }
      } catch (error) {
        console.error(
          `[ChatList] Network error during background server delete for ${chatId}:`,
          error
        );
        toast.error(
          `Sync Error: Could not contact server to delete "${shortTitle}". It might reappear.`
        );
      }
    },
    [currentSpace, currentChatId, savedChats, isAuthenticated]
  );

  const switchChat = useCallback(
    (chatId: string) => {
      const chat = savedChats.find((c) => c.id === chatId);
      if (chat) {
        setCurrentChatId(chatId);
      }
    },
    [savedChats]
  );

  const renameChat = useCallback(
    (chatId: string, newTitle: string) => {
      if (!newTitle.trim() || !currentSpace || !isAuthenticated) return;

      let updatedChatData: SavedChat | null = null;

      setSavedChats((prev) => {
        const updated = prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                title: newTitle.trim(),
                updatedAt: new Date().toISOString(),
              }
            : chat
        );
        updated.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        localStorage.setItem(
          `saved_chats_${currentSpace}`,
          JSON.stringify(updated)
        );
        updatedChatData = updated.find((c) => c.id === chatId) || null;
        return updated;
      });

      if (updatedChatData) {
        console.log(
          `[ChatList] Immediately attempting push for chat ${chatId} after rename.`
        );
        pushChatUpdateToServer(updatedChatData);
      } else {
        console.warn(
          `[ChatList] Could not find renamed chat data for ${chatId} to push.`
        );
      }

      setChatToRename(null);
      setNewChatTitle("");
    },
    [currentSpace, isAuthenticated, pushChatUpdateToServer]
  );

  const deleteAllChats = useCallback(async () => {
    if (!currentSpace || !isAuthenticated || savedChats.length === 0) return;

    const chatIdsToDelete = savedChats.map((chat) => chat.id);
    const spaceName = currentSpace;
    console.log(
      `[ChatList] Deleting all ${chatIdsToDelete.length} chats locally for space: ${spaceName}`
    );

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
      markChatAsDeleted(id).catch((err) => ({
        success: false,
        id,
        error: err,
      }))
    );

    try {
      const results = await Promise.allSettled(deletePromises);
      const failedDeletions = results.filter(
        (result) =>
          result.status === "rejected" ||
          (result.status === "fulfilled" && !result.value.success)
      );

      if (failedDeletions.length > 0) {
        console.error(
          `[ChatList] Background server delete failed for ${failedDeletions.length} chats.`
        );
        toast.error(
          `Sync Error: Failed to delete ${failedDeletions.length} chat(s) on the server. They might reappear.`
        );
      } else {
        console.log(
          `[ChatList] Background server delete successful for all ${chatIdsToDelete.length} chats.`
        );
      }
    } catch (error) {
      console.error(
        "[ChatList] Unexpected error during background delete all:",
        error
      );
      toast.error(
        "Sync Error: An unexpected issue occurred while deleting chats on the server."
      );
    }
  }, [currentSpace, isAuthenticated, savedChats]);

  const replaceChat = useCallback(
    (chatId: string, serverChatData: FullChatData) => {
      if (!currentSpace) return;

      setSavedChats((prev) => {
        let chatExists = false;
        const updatedChats = prev.map((chat) => {
          if (chat.id === chatId) {
            chatExists = true;
            return {
              id: chatId,
              title: serverChatData.title,
              messages: serverChatData.messages,
              state_hash: serverChatData.state_hash,
              space: serverChatData.space,
              createdAt: serverChatData.createdAt || new Date().toISOString(),
              updatedAt: serverChatData.updatedAt,
            };
          }
          return chat;
        });

        if (!chatExists) {
          const newChat: SavedChat = {
            id: chatId,
            title: serverChatData.title,
            messages: serverChatData.messages,
            state_hash: serverChatData.state_hash,
            space: serverChatData.space,
            createdAt: serverChatData.createdAt || new Date().toISOString(),
            updatedAt: serverChatData.updatedAt,
          };
          updatedChats.unshift(newChat);
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
          `[Sync] Replaced currently active chat ${chatId}. UI should refresh.`
        );
      }
    },
    [currentSpace, currentChatId]
  );

  const deleteChatLocally = useCallback(
    (chatId: string) => {
      if (!currentSpace) return;
      console.log(`[ChatList] Deleting chat locally only: ${chatId}`);
      setSavedChats((prev) => {
        const updated = prev.filter((chat) => chat.id !== chatId);
        localStorage.setItem(
          `saved_chats_${currentSpace}`,
          JSON.stringify(updated)
        );
        return updated;
      });
      if (chatId === currentChatId) {
        const updatedChats = savedChats.filter((chat) => chat.id !== chatId);
        if (updatedChats.length > 0) {
          const currentIndex = savedChats.findIndex((c) => c.id === chatId);
          const nextIndex = Math.max(
            0,
            Math.min(currentIndex, updatedChats.length - 1)
          );
          setCurrentChatId(updatedChats[nextIndex].id);
        } else {
          setCurrentChatId(null);
        }
      }
    },
    [currentSpace, savedChats, currentChatId]
  );

  return {
    savedChats,
    currentChatId,
    setCurrentChatId,
    chatToDelete,
    setChatToDelete,
    chatToRename,
    setChatToRename,
    newChatTitle,
    setNewChatTitle,
    showDeleteAllConfirmation,
    setShowDeleteAllConfirmation,
    updateChat,
    createNewChat,
    deleteChat,
    switchChat,
    renameChat,
    deleteAllChats,
    pushChatUpdateToServer,
    replaceChat,
    deleteChatLocally,
  };
}
