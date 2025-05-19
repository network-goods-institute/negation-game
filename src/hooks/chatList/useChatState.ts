import { useState, useEffect, useRef } from "react";
import { nanoid } from "nanoid";
import { SavedChat } from "@/types/chat";
import { ChatListManagementProps, ChatState } from "./chatListTypes";

export function useChatState({
  currentSpace,
  isAuthenticated,
}: Pick<
  ChatListManagementProps,
  "currentSpace" | "isAuthenticated"
>): ChatState & {
  setSavedChats: React.Dispatch<React.SetStateAction<SavedChat[]>>;
  setCurrentChatId: React.Dispatch<React.SetStateAction<string | null>>;
  savedChatsRef: React.MutableRefObject<SavedChat[]>;
} {
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const savedChatsRef = useRef<SavedChat[]>([]);

  useEffect(() => {
    savedChatsRef.current = savedChats;
  }, [savedChats]);

  useEffect(() => {
    if (!currentSpace) {
      setSavedChats([]);
      setCurrentChatId(null);
      setIsInitialized(false);
      return;
    }

    const storedChats = localStorage.getItem(`saved_chats_${currentSpace}`);
    if (storedChats) {
      try {
        const parsedChats = JSON.parse(storedChats) as SavedChat[];
        const validChats = parsedChats.filter(
          (chat): chat is SavedChat =>
            typeof chat === "object" &&
            chat !== null &&
            typeof chat.id === "string" &&
            typeof chat.title === "string" &&
            Array.isArray(chat.messages) &&
            typeof chat.createdAt === "string" &&
            typeof chat.updatedAt === "string" &&
            typeof chat.space === "string" &&
            typeof chat.state_hash === "string" &&
            (chat.distillRationaleId === undefined ||
              chat.distillRationaleId === null ||
              typeof chat.distillRationaleId === "string")
        );

        // Ensure we preserve the distillRationaleId when loading from storage
        const chatsWithPreservedFields = validChats.map((chat) => ({
          ...chat,
          distillRationaleId: chat.distillRationaleId ?? null,
        }));

        setSavedChats(chatsWithPreservedFields);
      } catch (error) {
        console.error("Failed to parse stored chats:", error);
        setSavedChats([]);
      }
    }
    setIsInitialized(true);
  }, [currentSpace]);

  useEffect(() => {
    if (isAuthenticated && currentSpace && currentChatId) {
      localStorage.setItem(`last_chat_id_${currentSpace}`, currentChatId);
    }
  }, [currentChatId, currentSpace, isAuthenticated]);

  return {
    savedChats,
    setSavedChats,
    currentChatId,
    setCurrentChatId,
    isInitialized,
    savedChatsRef,
  };
}
