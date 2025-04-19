import { useState, useEffect, useCallback } from "react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { SavedChat, ChatMessage } from "@/types/chat";

interface UseChatListManagementProps {
  currentSpace: string | null;
  isAuthenticated: boolean;
}

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

  useEffect(() => {
    if (!currentSpace) {
      setSavedChats([]);
      setCurrentChatId(null);
      return;
    }

    const savedChatsStr = localStorage.getItem(`saved_chats_${currentSpace}`);
    let chats: SavedChat[] = [];
    if (savedChatsStr) {
      try {
        const parsedChats = JSON.parse(savedChatsStr);
        if (Array.isArray(parsedChats)) {
          chats = parsedChats.map((chat) => ({
            ...chat,
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
          }));
        }
        chats.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      } catch (e) {
        console.error("Error parsing saved chats:", e);
        localStorage.removeItem(`saved_chats_${currentSpace}`);
        chats = [];
      }
    }
    setSavedChats(chats);

    if (chats.length > 0) {
      setCurrentChatId(chats[0].id);
    } else {
      setCurrentChatId(null);
    }
  }, [currentSpace]);

  const updateChat = useCallback(
    (chatId: string, messages: ChatMessage[], title?: string) => {
      if (!currentSpace) return;

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
    },
    [currentSpace]
  );

  const createNewChat = useCallback(() => {
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
    return newChatId;
  }, [currentSpace, isAuthenticated]);

  const deleteChat = useCallback(
    (chatId: string) => {
      if (!currentSpace || !isAuthenticated) return;

      let nextChatId: string | null = null;
      const updatedChats = savedChats.filter((chat) => chat.id !== chatId);

      if (chatId === currentChatId) {
        if (updatedChats.length > 0) {
          const deletedIndex = savedChats.findIndex((c) => c.id === chatId);
          nextChatId =
            updatedChats[Math.min(deletedIndex, updatedChats.length - 1)].id;
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
        return updated;
      });

      setChatToRename(null);
      setNewChatTitle("");
    },
    [currentSpace, isAuthenticated]
  );

  const deleteAllChats = useCallback(() => {
    if (!currentSpace || !isAuthenticated) return;

    localStorage.removeItem(`saved_chats_${currentSpace}`);
    setSavedChats([]);
    setCurrentChatId(null);
    setShowDeleteAllConfirmation(false);
    toast.success("All chats in this space deleted successfully.");
  }, [currentSpace, isAuthenticated]);

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
  };
}
