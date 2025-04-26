import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { generateDistillRationaleChatBotResponse } from "@/actions/generateDistillRationaleChatBotResponse";
import { generateSuggestionChatBotResponse } from "@/actions/generateSuggestionChatBotResponse";
import { PointInSpace } from "@/actions/fetchAllSpacePoints";
import { generateChatName } from "@/actions/generateChatName";
import { extractSourcesFromMarkdown } from "@/lib/negation-game/chatUtils";
import {
  ChatMessage,
  SavedChat,
  ChatRationale,
  DiscourseMessage,
  ChatSettings,
} from "@/types/chat";

type FlowType = "distill" | "build" | "generate" | "default";

interface UseChatStateProps {
  currentChatId: string | null;
  currentSpace: string | null;
  isAuthenticated: boolean;
  settings: ChatSettings;
  allPointsInSpace: PointInSpace[];
  ownedPointIds: Set<number>;
  endorsedPointIds: Set<number>;
  userRationales: ChatRationale[];
  availableRationales: ChatRationale[];
  storedMessages: DiscourseMessage[];
  savedChats: SavedChat[];
  updateChat: (
    chatId: string,
    messages: ChatMessage[],
    title?: string,
    distillRationaleId?: string | null
  ) => void;
  createNewChat: () => Promise<string | null>;
}

export function useChatState({
  currentChatId,
  currentSpace,
  isAuthenticated,
  settings,
  allPointsInSpace,
  ownedPointIds,
  endorsedPointIds,
  storedMessages,
  savedChats,
  updateChat,
  createNewChat,
}: UseChatStateProps) {
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [generatingChats, setGeneratingChats] = useState<Set<string>>(
    new Set()
  );
  const [fetchingContextChats, setFetchingContextChats] = useState<Set<string>>(
    new Set()
  );
  const [streamingContents, setStreamingContents] = useState<
    Map<string, string>
  >(new Map());
  const [generatingTitles, setGeneratingTitles] = useState<Set<string>>(
    new Set()
  );
  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevChatIdRef = useRef<string | null>(null);
  const activeGeneratingChatRef = useRef<string | null>(null);

  useEffect(() => {
    const chats = savedChats;
    const didChatIdChange = currentChatId !== prevChatIdRef.current;

    if (currentChatId) {
      const currentChat = chats.find((c) => c.id === currentChatId);
      const newMessages = currentChat?.messages || [];

      setChatMessages((prevMessages) => {
        const areMessagesDifferent =
          JSON.stringify(newMessages) !== JSON.stringify(prevMessages);
        if (didChatIdChange || areMessagesDifferent) {
          return newMessages;
        } else {
          return prevMessages;
        }
      });
    } else {
      if (didChatIdChange) {
        setChatMessages([]);
      }
    }

    prevChatIdRef.current = currentChatId;
  }, [currentChatId, savedChats]);

  useEffect(() => {
    if (
      chatMessages.length > 0 ||
      streamingContents.get(currentChatId || "") ||
      streamingContents.size > 0
    ) {
      const timer = setTimeout(() => {
        chatEndRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [chatMessages, streamingContents, currentChatId]);

  const generateAndSetTitle = useCallback(
    async (chatId: string, finalMessages: ChatMessage[]) => {
      const chatToUpdate = savedChats.find((c) => c.id === chatId);
      const rationaleIdForUpdate = chatToUpdate?.distillRationaleId ?? null;
      const needsTitle = !chatToUpdate || chatToUpdate.title === "New Chat";

      if (!needsTitle) {
        updateChat(chatId, finalMessages, undefined, rationaleIdForUpdate);
        return;
      }

      try {
        setGeneratingTitles((prev) => new Set(prev).add(chatId));
        const titleStream = await generateChatName(finalMessages);
        if (!titleStream) throw new Error("Failed to get title stream");

        let title = "";
        const reader = titleStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            if (typeof value === "string") {
              title += value;
            }
          }
        } catch (titleStreamError) {
        } finally {
          reader.releaseLock();
        }
        title = title.trim();

        if (title) {
          updateChat(chatId, finalMessages, title, rationaleIdForUpdate);
        } else {
          const assistantMsgContent =
            finalMessages.find((m) => m.role === "assistant")?.content ||
            "Chat";
          const fallbackTitle =
            assistantMsgContent.split("\n")[0].slice(0, 47) +
            (assistantMsgContent.length > 47 ? "..." : "");
          updateChat(
            chatId,
            finalMessages,
            fallbackTitle || "Chat",
            rationaleIdForUpdate
          );
        }
      } catch (titleError) {
        const assistantMsgContent =
          finalMessages.find((m) => m.role === "assistant")?.content || "Chat";
        const fallbackTitle =
          assistantMsgContent.split("\n")[0].slice(0, 47) +
          (assistantMsgContent.length > 47 ? "..." : "");
        updateChat(
          chatId,
          finalMessages,
          fallbackTitle || "Chat",
          rationaleIdForUpdate
        );
      } finally {
        setGeneratingTitles((prev) => {
          const next = new Set(prev);
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          next.delete(chatId);
          return next;
        });
      }
    },
    [savedChats, updateChat]
  );

  const handleResponse = useCallback(
    async (
      messagesForApi: ChatMessage[],
      chatIdToUse: string,
      flowType: FlowType,
      selectedRationaleId?: string | null
    ) => {
      if (generatingChats.has(chatIdToUse)) {
        return;
      }

      activeGeneratingChatRef.current = chatIdToUse;
      setGeneratingChats((prev) => new Set(prev).add(chatIdToUse));
      setFetchingContextChats((prev) => new Set(prev).add(chatIdToUse));
      setStreamingContents((prev) => new Map(prev).set(chatIdToUse, ""));

      let fullContent = "";
      let sources: ChatMessage["sources"] | undefined = undefined;
      let responseStream:
        | ReadableStream<string | Uint8Array | object>
        | undefined;

      try {
        const mappedMessages: {
          id: string;
          role: "user" | "assistant" | "system";
          content: string;
        }[] = messagesForApi.map((msg, index) => ({
          ...msg,
          id: `${chatIdToUse}-${index}`,
        }));

        if (flowType === "generate") {
          responseStream = await generateSuggestionChatBotResponse(
            mappedMessages,
            settings,
            allPointsInSpace,
            ownedPointIds,
            endorsedPointIds,
            settings.includeDiscourseMessages ? storedMessages : []
          );
        } else if (flowType === "distill") {
          responseStream = await generateDistillRationaleChatBotResponse(
            mappedMessages,
            settings,
            settings.includeDiscourseMessages ? storedMessages : [],
            selectedRationaleId
          );
        } else {
          responseStream = await generateSuggestionChatBotResponse(
            mappedMessages,
            settings,
            allPointsInSpace,
            ownedPointIds,
            endorsedPointIds,
            settings.includeDiscourseMessages ? storedMessages : []
          );
        }

        if (!responseStream)
          throw new Error(
            "Failed to get response stream from the selected action"
          );

        const reader = responseStream.getReader();
        let firstChunkReceived = false;
        try {
          while (true) {
            const { done, value } = await reader.read();

            if (!firstChunkReceived && !done) {
              setFetchingContextChats((prev) => {
                const newSet = new Set(prev);
                // eslint-disable-next-line drizzle/enforce-delete-with-where
                newSet.delete(chatIdToUse);
                return newSet;
              });
              firstChunkReceived = true;
            }

            if (done) {
              break;
            }

            if (typeof value === "string" && value.length > 0) {
              fullContent += value;
              setStreamingContents((prev) =>
                new Map(prev).set(chatIdToUse, fullContent)
              );
            }
          }
        } catch (streamError) {
          toast.error(`Error reading AI response stream (${flowType}).`);
          fullContent += "\n\n[Error processing stream]";
        } finally {
          reader.releaseLock();
        }

        fullContent = fullContent
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "\n")
          .trim();
        sources = extractSourcesFromMarkdown(fullContent);

        if (fullContent === "") {
          fullContent = `## Sorry, I couldn't process that request

I wasn't able to generate a response based on the provided content. This might be due to:

1. Content policy restrictions in your rationales or points
2. Test data or placeholder content that needs to be replaced
3. Formatting issues in the source content

Please try:
- Using rationales with more substantial content
- Removing any test data, placeholders, or potentially inappropriate content
- Rephrasing your request with clearer instructions`;
          sources = undefined;
        }

        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: fullContent,
          sources,
        };
        const finalMessages = [...messagesForApi, assistantMessage];

        if (activeGeneratingChatRef.current === chatIdToUse) {
          setChatMessages(finalMessages);
        }

        if (chatIdToUse) {
          generateAndSetTitle(chatIdToUse, finalMessages).catch((error) => {});
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : `Failed to get ${flowType} response`
        );
        const errorMessageContent = `I apologize, but I encountered an error processing your ${flowType} request. Please try again.`;
        const errorMessage: ChatMessage = {
          role: "assistant",
          content: errorMessageContent,
          error: true,
        };
        const messagesWithError = [...messagesForApi, errorMessage];

        if (activeGeneratingChatRef.current === chatIdToUse) {
          setChatMessages(messagesWithError);
        }

        if (chatIdToUse) {
          updateChat(
            chatIdToUse,
            messagesWithError,
            undefined,
            flowType === "distill" ? selectedRationaleId : null
          );
        }
      } finally {
        if (activeGeneratingChatRef.current === chatIdToUse) {
          activeGeneratingChatRef.current = null;
        }
        setGeneratingChats((prev) => {
          const newSet = new Set(prev);
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          newSet.delete(chatIdToUse);
          return newSet;
        });
        setFetchingContextChats((prev) => {
          const newSet = new Set(prev);
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          newSet.delete(chatIdToUse);
          return newSet;
        });
        setStreamingContents((prev) => {
          const newMap = new Map(prev);
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          newMap.delete(chatIdToUse);
          return newMap;
        });
      }
    },
    [
      settings,
      allPointsInSpace,
      ownedPointIds,
      endorsedPointIds,
      storedMessages,
      generateAndSetTitle,
      updateChat,
      generatingChats,
    ]
  );

  const handleCopy = useCallback(
    async (index: number) => {
      if (index < 0 || index >= chatMessages.length) return;
      const contentToCopy = chatMessages[index].content;
      try {
        await navigator.clipboard.writeText(contentToCopy);
        toast.success("Message copied!");
      } catch (err) {
        toast.error("Failed to copy message.");
      }
    },
    [chatMessages]
  );

  const handleRetry = useCallback(
    async (index: number) => {
      if (
        index <= 0 ||
        index >= chatMessages.length ||
        chatMessages[index].role !== "assistant" ||
        generatingChats.has(currentChatId || "")
      ) {
        return;
      }

      let chatIdToUse = currentChatId;
      if (!chatIdToUse) {
        toast.error("Cannot retry: Current chat ID is missing.");
        return;
      }

      const historyForRetry = chatMessages.slice(0, index);
      setChatMessages(historyForRetry);

      const currentChatData = savedChats.find((c) => c.id === chatIdToUse);
      const rationaleIdForRetry = currentChatData?.distillRationaleId ?? null;
      const flowForRetry: FlowType = rationaleIdForRetry
        ? "distill"
        : "default";

      await handleResponse(
        historyForRetry,
        chatIdToUse,
        flowForRetry,
        rationaleIdForRetry
      );
    },
    [chatMessages, generatingChats, currentChatId, handleResponse, savedChats]
  );

  const handleSaveEdit = useCallback(
    async (index: number, newContent: string) => {
      const trimmedNewContent = newContent.trim();
      if (
        !currentChatId ||
        index === null ||
        index < 0 ||
        index >= chatMessages.length ||
        chatMessages[index].role !== "user" ||
        !trimmedNewContent ||
        chatMessages[index].content === trimmedNewContent
      ) {
        return;
      }

      const editedMessage: ChatMessage = {
        ...chatMessages[index],
        content: trimmedNewContent,
      };
      const historyForEdit = [...chatMessages.slice(0, index), editedMessage];

      setChatMessages(historyForEdit);

      const currentChatDataForEdit = savedChats.find(
        (c) => c.id === currentChatId
      );
      let flowForEdit: FlowType = "default";
      let rationaleIdForEdit: string | null = null;

      if (currentChatDataForEdit?.distillRationaleId) {
        flowForEdit = "distill";
        rationaleIdForEdit = currentChatDataForEdit.distillRationaleId;
      } else {
        const originalFirstMessage = chatMessages[0];
        if (
          originalFirstMessage?.role === "user" &&
          originalFirstMessage.content.includes(
            "Please help me distill my rationale"
          )
        ) {
          const regex = new RegExp("\\(ID: ([^)]+)\\)");
          const match = originalFirstMessage.content.match(regex);
          if (match && match[1]) {
            flowForEdit = "distill";
            rationaleIdForEdit = match[1];
          }
        }
      }

      await handleResponse(
        historyForEdit,
        currentChatId || "",
        flowForEdit,
        rationaleIdForEdit
      );

      toast.success("Message updated & regenerating response...");
    },
    [currentChatId, chatMessages, handleResponse, savedChats, setChatMessages]
  );

  const startChatWithOption = useCallback(
    async (option: {
      id: "distill" | "build" | "generate";
      title: string;
      prompt: string;
    }) => {
      if (
        !option ||
        !currentSpace ||
        !isAuthenticated ||
        option.id === "distill"
      )
        return;
      let chatIdToUse = currentChatId;
      let isNewChat = false;

      if (!chatIdToUse) {
        const newId = await createNewChat();
        if (!newId) {
          toast.error("Failed to create new chat.");
          return;
        }
        chatIdToUse = newId;
        isNewChat = true;
        setChatMessages([]);
      }

      let initialUserMessage: string;
      switch (option.id) {
        case "build":
          initialUserMessage = option.prompt;
          break;
        case "generate":
          initialUserMessage = option.prompt;
          break;
        default:
          initialUserMessage = "Let's chat.";
          break;
      }

      const initialMessages: ChatMessage[] = [
        { role: "user", content: initialUserMessage },
      ];

      setChatMessages(initialMessages);
      updateChat(chatIdToUse, initialMessages, undefined, null);

      let systemMessages: ChatMessage[] = [];
      if (
        option.id === "build" &&
        settings.includeDiscourseMessages &&
        storedMessages.length > 0
      ) {
        systemMessages = storedMessages.map((msg) => ({
          role: "system" as const,
          content: `From forum post "${msg.topic_title || "Untitled"}": ${msg.raw || msg.content}`,
        }));
      }

      const messagesForApi = [...systemMessages, ...initialMessages];

      await handleResponse(messagesForApi, chatIdToUse, option.id, null);
    },
    [
      currentSpace,
      isAuthenticated,
      currentChatId,
      settings,
      storedMessages,
      handleResponse,
      createNewChat,
      updateChat,
    ]
  );

  const startDistillChat = useCallback(
    async (
      selectedRationaleId: string,
      selectedRationaleTitle: string,
      rationale: ChatRationale
    ) => {
      if (!selectedRationaleId || !currentSpace || !isAuthenticated) return;

      let chatIdToUse = currentChatId;

      if (!chatIdToUse || chatMessages.length > 0) {
        const newId = await createNewChat();
        if (!newId) {
          toast.error("Failed to create new chat for distillation.");
          return;
        }
        chatIdToUse = newId;
        // Wait for the next tick to ensure chat is created in local state
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const initialUserMessage = `Please help me distill my rationale titled "${selectedRationaleTitle}" (ID: ${selectedRationaleId}) into a well-structured essay. The rationale has ${rationale.graph.nodes.length} points and ${rationale.graph.edges.length} connections. Focus on organizing these points into a coherent argument. Here's the description: "${rationale.description}". Please incorporate relevant context about my endorsed points related to this topic. Do not suggest new points or negations.`;

      const initialMessages: ChatMessage[] = [
        { role: "user", content: initialUserMessage },
      ];

      setChatMessages(initialMessages);
      updateChat(chatIdToUse, initialMessages, undefined, selectedRationaleId);

      await handleResponse(
        initialMessages,
        chatIdToUse,
        "distill",
        selectedRationaleId
      );
    },
    [
      currentSpace,
      isAuthenticated,
      handleResponse,
      createNewChat,
      updateChat,
      currentChatId,
      chatMessages,
    ]
  );

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

      const currentChatData = savedChats.find((c) => c.id === chatIdToUse);

      let flowToUse: FlowType = "generate";
      let rationaleIdToUse: string | null = null;

      if (currentChatData?.distillRationaleId) {
        flowToUse = "distill";
        rationaleIdToUse = currentChatData.distillRationaleId;
      } else if (chatMessages.length > 0) {
        const firstMessage = chatMessages[0];
        if (
          firstMessage?.content?.includes("Please help me distill my rationale")
        ) {
          const match = firstMessage.content.match(/\(ID: ([^)]+)\)/);
          if (match && match[1]) {
            flowToUse = "distill";
            rationaleIdToUse = match[1];
          }
        }
      }

      if (!chatIdToUse) {
        const newId = await createNewChat();
        if (!newId) {
          toast.error("Failed to create new chat.");
          setMessage(userMessageContent);
          return;
        }
        chatIdToUse = newId;
        messagesForHistory = [newMessage];
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      setChatMessages(messagesForHistory);
      updateChat(chatIdToUse, messagesForHistory, undefined, rationaleIdToUse);

      await handleResponse(
        messagesForHistory,
        chatIdToUse,
        flowToUse,
        rationaleIdToUse
      );
    },
    [
      message,
      generatingChats,
      currentSpace,
      isAuthenticated,
      currentChatId,
      chatMessages,
      handleResponse,
      createNewChat,
      savedChats,
      updateChat,
    ]
  );

  return {
    message,
    setMessage,
    chatMessages,
    setChatMessages,
    generatingChats,
    fetchingContextChats,
    streamingContents,
    chatEndRef,
    generatingTitles,
    startChatWithOption,
    startDistillChat,
    handleSubmit,
    handleCopy,
    handleRetry,
    handleSaveEdit,
  };
}
