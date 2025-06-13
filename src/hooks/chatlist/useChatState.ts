import { useState, useEffect, useRef } from "react";
import { SavedChat } from "@/types/chat";
import {
  ChatListManagementProps,
  ChatState,
} from "@/hooks/chatlist/chatListTypes";

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

    setIsInitialized(true);

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
  }, [currentSpace]);

  useEffect(() => {
    if (currentSpace && savedChats.length > 0) {
      localStorage.setItem(
        `saved_chats_${currentSpace}`,
        JSON.stringify(savedChats)
      );
    }
  }, [savedChats, currentSpace]);

  return {
    savedChats,
    setSavedChats,
    currentChatId,
    setCurrentChatId,
    isInitialized,
    savedChatsRef,
  };
}
