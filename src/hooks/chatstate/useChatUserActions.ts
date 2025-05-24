import React, { useCallback, Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import { getChatMessageAsText } from "@/lib/negation-game/getChatMessageAsText";
import { determineFlowParams } from "@/hooks/chat/useChatFlow";
import type { FlowType } from "@/hooks/chat/useChatFlow";
import type {
  ChatMessage,
  SavedChat,
  DiscourseMessage,
  ViewpointGraph,
} from "@/types/chat";

export interface UseChatUserActionsProps {
  currentChatId: string | null;
  isAuthenticated: boolean;
  chatMessages: ChatMessage[];
  generatingChats: Set<string>;
  savedChats: SavedChat[];
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
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
    selectedRationaleId?: string | null,
    description?: string,
    linkUrl?: string
  ) => Promise<void>;
  lastFlowParamsRef: React.MutableRefObject<any>;
  currentGraphRef: React.MutableRefObject<ViewpointGraph | undefined | null>;
  currentSpace: string | null;
  discourseUrl: string;
  storedMessages: DiscourseMessage[];
}

export function useChatUserActions({
  currentChatId,
  isAuthenticated,
  chatMessages,
  generatingChats,
  savedChats,
  setChatMessages,
  updateChat,
  handleResponse,
  lastFlowParamsRef,
  currentGraphRef,
  currentSpace,
  discourseUrl,
  storedMessages,
}: UseChatUserActionsProps) {
  const handleCopy = useCallback(
    async (messageIndex: number) => {
      if (
        !currentChatId ||
        !savedChats.find((c) => c.id === currentChatId) ||
        !savedChats.find((c) => c.id === currentChatId)?.messages[messageIndex]
      ) {
        toast.error("Could not find message to copy.");
        return;
      }
      const chat = savedChats.find((c) => c.id === currentChatId)!;
      const messageToCopy = chat.messages[messageIndex];
      try {
        const textarea = document.createElement("textarea");
        textarea.value = messageToCopy.content;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch (err) {
        console.error("Fallback copy failed:", err);
        toast.error("Copy failed.");
        return;
      }
      try {
        const textualRepresentation = await getChatMessageAsText(
          messageToCopy.content,
          currentSpace,
          discourseUrl,
          storedMessages
        );
        await navigator.clipboard.writeText(textualRepresentation);
        toast.success("Message copied with full details!");
      } catch (error) {
        console.error("Rich copy failed:", error);
      }
    },
    [currentChatId, savedChats, currentSpace, discourseUrl, storedMessages]
  );

  const handleRetry = useCallback(
    async (messageIndex: number) => {
      if (!currentChatId || !isAuthenticated) return;
      if (
        messageIndex <= 0 ||
        messageIndex >= chatMessages.length ||
        chatMessages[messageIndex].role !== "assistant" ||
        generatingChats.has(currentChatId)
      ) {
        return;
      }
      let chatIdToUse = currentChatId;
      const historyForRetry = chatMessages.slice(0, messageIndex);
      setChatMessages(historyForRetry);
      updateChat(chatIdToUse, historyForRetry);
      const savedChat = savedChats.find((c) => c.id === chatIdToUse);
      const {
        flowType: retryFlow,
        rationaleId: retryRationaleId,
        description: retryDescription,
        linkUrl: retryLinkUrl,
      } = lastFlowParamsRef.current ||
      determineFlowParams(savedChat, currentGraphRef.current);
      await handleResponse(
        historyForRetry,
        chatIdToUse,
        retryFlow,
        retryRationaleId ?? null,
        retryDescription,
        retryLinkUrl
      );
    },
    [
      currentChatId,
      isAuthenticated,
      chatMessages,
      generatingChats,
      savedChats,
      setChatMessages,
      updateChat,
      handleResponse,
      lastFlowParamsRef,
      currentGraphRef,
    ]
  );

  const handleSaveEdit = useCallback(
    async (messageIndex: number, newContent: string) => {
      if (!currentChatId || !isAuthenticated) return;
      if (
        messageIndex < 0 ||
        messageIndex >= chatMessages.length ||
        chatMessages[messageIndex].role !== "user" ||
        !newContent
      ) {
        return;
      }
      const editedMessage: ChatMessage = {
        ...chatMessages[messageIndex],
        content: newContent,
      };
      const historyForEdit = [
        ...chatMessages.slice(0, messageIndex),
        editedMessage,
      ];
      setChatMessages(historyForEdit);
      updateChat(currentChatId, historyForEdit);
      const savedChat = savedChats.find((c) => c.id === currentChatId);
      const {
        flowType: editFlow,
        rationaleId: editRationaleId,
        description: editDescription,
        linkUrl: editLinkUrl,
      } = lastFlowParamsRef.current ||
      determineFlowParams(savedChat, savedChat?.graph ?? null);
      await handleResponse(
        historyForEdit,
        currentChatId,
        editFlow,
        editRationaleId ?? null,
        editDescription,
        editLinkUrl
      );
      toast.success("Message updated & regenerating response...");
    },
    [
      currentChatId,
      isAuthenticated,
      chatMessages,
      savedChats,
      setChatMessages,
      updateChat,
      handleResponse,
      lastFlowParamsRef,
    ]
  );

  return { handleCopy, handleRetry, handleSaveEdit };
}
