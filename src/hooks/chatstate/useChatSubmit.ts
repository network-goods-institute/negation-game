import React, { useCallback } from "react";
import type { FlowType } from "@/hooks/chat/useChatFlow";
import { toast } from "sonner";
import { determineFlowParams } from "@/hooks/chat/useChatFlow";
import type { ChatMessage, SavedChat, ViewpointGraph } from "@/types/chat";

export interface UseChatSubmitProps {
  message: string;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  generatingChats: Set<string>;
  currentChatId: string | null;
  currentSpace: string | null;
  isAuthenticated: boolean;
  savedChats: SavedChat[];
  createNewChat: (initialGraph?: ViewpointGraph) => Promise<string | null>;
  updateChat: (
    chatId: string,
    messages: ChatMessage[],
    title?: string,
    distillRationaleId?: string | null,
    graph?: ViewpointGraph | null,
    immediate?: boolean
  ) => void;
  handleResponse: (
    messagesForApi: ChatMessage[],
    chatId: string,
    flowType: FlowType,
    rationaleId?: string | null,
    description?: string,
    linkUrl?: string
  ) => Promise<void>;
  currentGraphRef: React.MutableRefObject<ViewpointGraph | undefined | null>;
}

export function useChatSubmit({
  message,
  setMessage,
  chatMessages,
  setChatMessages,
  generatingChats,
  currentChatId,
  currentSpace,
  isAuthenticated,
  savedChats,
  createNewChat,
  updateChat,
  handleResponse,
  currentGraphRef,
}: UseChatSubmitProps) {
  const handleSubmit = useCallback(
    async (
      e?:
        | React.FormEvent<HTMLFormElement>
        | React.KeyboardEvent<HTMLTextAreaElement>
    ) => {
      if (e) e.preventDefault();
      if (
        !message.trim() ||
        generatingChats.has(currentChatId || "") ||
        !currentSpace ||
        !isAuthenticated
      ) {
        return;
      }

      const userMessageContent = message.trim();
      setMessage("");
      const newMessage: ChatMessage = {
        role: "user",
        content: userMessageContent,
      };

      let chatIdToUse = currentChatId;
      let messagesForHistory = [...chatMessages, newMessage];
      let graphForUpdate = currentGraphRef.current;

      if (!chatIdToUse) {
        const newId = await createNewChat(undefined);
        if (!newId) {
          toast.error("Failed to create new chat.");
          setMessage(userMessageContent);
          return;
        }
        chatIdToUse = newId;
        messagesForHistory = [newMessage];
        graphForUpdate = undefined;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const currentChatData = savedChats.find((c) => c.id === chatIdToUse);
      const flowParams = determineFlowParams(currentChatData, graphForUpdate);
      const { flowType, rationaleId, description, linkUrl } = flowParams;

      setChatMessages(messagesForHistory);
      updateChat(
        chatIdToUse,
        messagesForHistory,
        undefined,
        rationaleId ?? null,
        graphForUpdate
      );

      await handleResponse(
        messagesForHistory,
        chatIdToUse,
        flowType,
        rationaleId ?? null,
        description,
        linkUrl
      );
    },
    [
      message,
      generatingChats,
      currentChatId,
      currentSpace,
      isAuthenticated,
      chatMessages,
      savedChats,
      setMessage,
      setChatMessages,
      createNewChat,
      updateChat,
      handleResponse,
      currentGraphRef,
    ]
  );

  return handleSubmit;
}
