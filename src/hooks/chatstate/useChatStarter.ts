import React, { useCallback } from "react";
import { toast } from "sonner";
import { mapOptionToFlowType } from "@/hooks/chat/useChatFlow";
import type {
  ChatMessage,
  SavedChat,
  ChatSettings,
  ChatRationale,
  DiscourseMessage,
  ViewpointGraph,
} from "@/types/chat";
import type { FlowType } from "@/hooks/chat/useChatFlow";

export interface UseChatStarterProps {
  currentChatId: string | null;
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
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
  settings: ChatSettings;
  storedMessages: DiscourseMessage[];
  currentSpace: string | null;
  isAuthenticated: boolean;
}

export function useChatStarter({
  currentChatId,
  setChatMessages,
  createNewChat,
  updateChat,
  handleResponse,
  settings,
  storedMessages,
  currentSpace,
  isAuthenticated,
}: UseChatStarterProps) {
  const startChatWithOption = useCallback(
    async (option: {
      id: "distill" | "build" | "generate" | "create_rationale";
      title: string;
      prompt: string;
    }) => {
      if (
        !option ||
        !currentSpace ||
        !isAuthenticated ||
        option.id === "distill" ||
        option.id === "create_rationale"
      )
        return;

      let chatIdToUse = currentChatId;
      if (!chatIdToUse) {
        const newId = await createNewChat(undefined);
        if (!newId) {
          toast.error("Failed to create new chat.");
          return;
        }
        chatIdToUse = newId;
        setChatMessages([]);
      }

      let initialUserMessage: string;
      switch (option.id) {
        case "build":
        case "generate":
          initialUserMessage = option.prompt;
          break;
        default:
          initialUserMessage = "Let's chat.";
      }

      const initialMessages: ChatMessage[] = [
        { role: "user", content: initialUserMessage },
      ];
      setChatMessages(initialMessages);
      updateChat(chatIdToUse, initialMessages, undefined, null, undefined);

      let systemMessages: ChatMessage[] = [];
      if (
        option.id === "build" &&
        settings.includeDiscourseMessages &&
        storedMessages.length > 0
      ) {
        systemMessages = storedMessages.map((msg) => ({
          role: "system",
          content: `From forum post "${msg.topic_title || "Untitled"}": ${
            msg.raw || msg.content
          }`,
        }));
      }

      const messagesForApi = [...systemMessages, ...initialMessages];
      const flow = mapOptionToFlowType(option.id);
      await handleResponse(messagesForApi, chatIdToUse, flow, null);
    },
    [
      currentChatId,
      currentSpace,
      isAuthenticated,
      createNewChat,
      setChatMessages,
      updateChat,
      settings,
      storedMessages,
      handleResponse,
    ]
  );

  const startDistillChat = useCallback(
    async (
      selectedRationaleId: string,
      selectedRationaleTitle: string,
      rationale: ChatRationale
    ) => {
      if (!selectedRationaleId || !currentSpace || !isAuthenticated) {
        return;
      }

      let chatIdToUse = currentChatId;
      if (!chatIdToUse) {
        const newId = await createNewChat(undefined);
        if (!newId) {
          toast.error("Failed to create new chat for distillation.");
          return;
        }
        chatIdToUse = newId;
        setChatMessages([]);
      }
      await new Promise((resolve) => setTimeout(resolve, 0));

      const initialUserMessage = `Please help me distill my rationale titled "${selectedRationaleTitle}" (ID: ${selectedRationaleId}) into a well-structured essay. The rationale has ${
        rationale.graph.nodes.length
      } points and ${rationale.graph.edges.length} connections. Focus on organizing these points into a coherent argument. Here's the description: "${rationale.description}". Please incorporate relevant context about my endorsed points related to this topic. Do not suggest new points or negations.`;

      const initialMessages: ChatMessage[] = [
        { role: "user", content: initialUserMessage },
      ];
      setChatMessages(initialMessages);
      updateChat(
        chatIdToUse,
        initialMessages,
        undefined,
        selectedRationaleId,
        null,
        true
      );

      const flow = mapOptionToFlowType("distill");
      await handleResponse(
        initialMessages,
        chatIdToUse,
        flow,
        selectedRationaleId
      );
    },
    [
      currentChatId,
      currentSpace,
      isAuthenticated,
      createNewChat,
      setChatMessages,
      updateChat,
      handleResponse,
    ]
  );

  return { startChatWithOption, startDistillChat };
}
