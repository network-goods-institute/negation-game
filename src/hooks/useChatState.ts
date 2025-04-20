import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  generateChatBotResponse,
  EndorsedPoint,
} from "@/actions/generateDistillRationaleChatBotResponse";
import { generateSuggestionChatBotResponse } from "@/actions/generateSuggestionChatBotResponse";
import { PointInSpace } from "@/actions/fetchAllSpacePoints";
import { generateChatName } from "@/actions/generateChatName";
import { extractSourcesFromMarkdown } from "@/utils/chatUtils";
import {
  ChatMessage,
  SavedChat,
  ChatRationale,
  DiscourseMessage,
  ChatSettings,
  InitialOption,
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
  storedMessages: DiscourseMessage[];
  savedChats: SavedChat[];
  updateChat: (chatId: string, messages: ChatMessage[], title?: string) => void;
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
  userRationales,
  storedMessages,
  savedChats,
  updateChat,
  createNewChat,
}: UseChatStateProps) {
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetchingContext, setIsFetchingContext] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [currentFlowType, setCurrentFlowType] = useState<FlowType>("default");

  useEffect(() => {
    const chats = savedChats;
    if (currentChatId) {
      const currentChat = chats.find((c) => c.id === currentChatId);
      console.log(
        `[useEffect currentChatId Change] Loading messages for new chat ID: ${currentChatId}. ` +
          `Found chat: ${!!currentChat}. ` +
          `Messages: ${currentChat?.messages?.length ?? "N/A"}.`
      );

      setChatMessages((prevMessages) => {
        const newMessages = currentChat?.messages || [];
        if (
          prevMessages.length === newMessages.length &&
          prevMessages.every(
            (msg, i) =>
              msg.content === newMessages[i]?.content &&
              msg.role === newMessages[i]?.role
          )
        ) {
          return prevMessages;
        }
        return newMessages;
      });
      setCurrentFlowType("default");
    } else {
      console.log(
        "[useEffect currentChatId Change] No currentChatId, clearing messages."
      );
      setChatMessages([]);
      setCurrentFlowType("default");
    }
  }, [currentChatId, savedChats]);

  useEffect(() => {
    if (chatMessages.length > 0 || streamingContent) {
      const timer = setTimeout(() => {
        chatEndRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [chatMessages, streamingContent]);

  const generateAndSetTitle = useCallback(
    async (chatId: string, finalMessages: ChatMessage[]) => {
      const chatToUpdate = savedChats.find((c) => c.id === chatId);
      const needsTitle = !chatToUpdate || chatToUpdate.title === "New Chat";

      console.log(
        `[generateAndSetTitle] Called for chat ${chatId}. Needs title: ${needsTitle}`
      );

      if (!needsTitle) {
        console.log(
          `[generateAndSetTitle] Chat ${chatId} already has title '${chatToUpdate?.title}'. Calling updateChat without title change.`
        );
        updateChat(chatId, finalMessages);
        return;
      }

      try {
        const titleStream = await generateChatName(finalMessages);
        if (!titleStream) throw new Error("Failed to get title stream");

        let title = "";
        const reader = titleStream.getReader();
        try {
          console.log(
            `[generateAndSetTitle] Reading title stream for chat ${chatId}...`
          );
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log("[generateAndSetTitle] Title stream finished.");
              break;
            }
            if (typeof value === "string") {
              title += value;
            } else if (value !== null && value !== undefined) {
              console.warn(
                "[generateAndSetTitle] Received unexpected chunk type:",
                value
              );
            }
          }
        } catch (titleStreamError) {
          console.error(
            "[generateAndSetTitle] Error reading title stream:",
            titleStreamError instanceof Error
              ? titleStreamError.message
              : String(titleStreamError),
            titleStreamError
          );
        } finally {
          reader.releaseLock();
          console.log("[generateAndSetTitle] Title reader lock released.");
        }
        title = title.trim();

        if (title) {
          console.log(
            `[generateAndSetTitle] Generated title for ${chatId}: '${title}'. Calling updateChat.`
          );
          updateChat(chatId, finalMessages, title);
        } else {
          const assistantMsgContent =
            finalMessages.find((m) => m.role === "assistant")?.content ||
            "Chat";
          const fallbackTitle =
            assistantMsgContent.split("\n")[0].slice(0, 47) +
            (assistantMsgContent.length > 47 ? "..." : "");
          console.log(
            `[generateAndSetTitle] Title generation failed or empty for ${chatId}. Using fallback: '${fallbackTitle}'. Calling updateChat.`
          );
          updateChat(chatId, finalMessages, fallbackTitle || "Chat");
        }
      } catch (titleError) {
        console.error(
          `[generateAndSetTitle] Error during title generation for ${chatId}:`,
          titleError
        );
        const assistantMsgContent =
          finalMessages.find((m) => m.role === "assistant")?.content || "Chat";
        const fallbackTitle =
          assistantMsgContent.split("\n")[0].slice(0, 47) +
          (assistantMsgContent.length > 47 ? "..." : "");
        console.log(
          `[generateAndSetTitle] Error caught for ${chatId}. Using fallback: '${fallbackTitle}'. Calling updateChat.`
        );
        updateChat(chatId, finalMessages, fallbackTitle || "Chat");
      }
    },
    [savedChats, updateChat]
  );

  const handleResponse = useCallback(
    async (
      messagesForApi: ChatMessage[],
      chatIdToUse: string,
      flowType: FlowType
    ) => {
      if (isGenerating) {
        console.warn(
          `[handleResponse ${flowType}] Already generating, skipping call.`
        );
        return;
      }

      setIsGenerating(true);
      setStreamingContent("");
      setIsFetchingContext(true);
      console.log(
        `[handleResponse ${flowType}] START: isGenerating=true, isFetchingContext=true`
      );
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
          console.log(
            `[handleResponse generate] Calling generateSuggestionChatBotResponse for chat ${chatIdToUse}`
          );
          responseStream = await generateSuggestionChatBotResponse(
            mappedMessages,
            settings,
            allPointsInSpace,
            ownedPointIds,
            endorsedPointIds,
            settings.includeDiscourseMessages ? storedMessages : []
          );
        } else if (flowType === "distill") {
          console.log(
            `[handleResponse distill] Calling generateChatBotResponse for chat ${chatIdToUse}`
          );
          responseStream = await generateChatBotResponse(
            mappedMessages,
            settings,
            userRationales,
            settings.includeDiscourseMessages ? storedMessages : []
          );
        } else {
          console.log(
            `[handleResponse ${flowType}] Calling generateChatBotResponse for chat ${chatIdToUse}`
          );
          responseStream = await generateChatBotResponse(
            mappedMessages,
            settings,
            userRationales,
            settings.includeDiscourseMessages ? storedMessages : []
          );
        }

        if (!responseStream)
          throw new Error(
            "Failed to get response stream from the selected action"
          );

        console.log(
          `[handleResponse ${flowType}] Received response object from action.`
        );
        console.log("[handleResponse] Starting stream processing loop...");

        const reader = responseStream.getReader();
        let firstChunkReceived = false;
        try {
          console.log(
            `[handleResponse ${flowType} Stream ${chatIdToUse}] Entering getReader() loop.`
          );
          while (true) {
            const { done, value } = await reader.read();
            console.log(
              `[handleResponse ${flowType} Stream ${chatIdToUse}] read() returned: done=${done}, value type=${typeof value}`
            );

            if (!firstChunkReceived && !done) {
              setIsFetchingContext(false);
              firstChunkReceived = true;
              console.log(
                `[handleResponse ${flowType} Stream ${chatIdToUse}] First chunk received, isFetchingContext=false`
              );
            }

            if (done) {
              console.log(
                `[handleResponse ${flowType} Stream ${chatIdToUse}] Stream finished (done=true).`
              );
              break;
            }

            if (typeof value === "string" && value.length > 0) {
              console.log(
                `[handleResponse ${flowType} Stream ${chatIdToUse}] Processing valid string chunk (length ${value.length}).`
              );
              fullContent += value;
              setStreamingContent(fullContent);
              console.log(
                `[handleResponse ${flowType} Stream ${chatIdToUse}] Updated streamingContent.`
              );
            } else if (value !== null && value !== undefined && value !== "") {
              console.warn(
                `[handleResponse ${flowType} Stream ${chatIdToUse}] Received unexpected chunk type or empty string:`,
                value
              );
            }
            console.log(
              `[handleResponse ${flowType} Stream ${chatIdToUse}] End of loop iteration.`
            );
          }
          console.log(
            `[handleResponse ${flowType} Stream ${chatIdToUse}] Successfully finished getReader() loop.`
          );
        } catch (streamError) {
          console.error(
            `[handleResponse ${flowType} Stream ${chatIdToUse}] Error processing stream chunk with getReader():`,
            streamError instanceof Error
              ? streamError.message
              : String(streamError),
            streamError,
            {
              currentFullContent: fullContent,
              firstChunkReceived: firstChunkReceived,
            }
          );
          toast.error(`Error reading AI response stream (${flowType}).`);
          fullContent += "\n\n[Error processing stream]";
        } finally {
          reader.releaseLock();
          console.log(
            `[handleResponse ${flowType} Stream ${chatIdToUse}] Reader lock released.`
          );
        }

        console.log(
          `[handleResponse ${flowType}] Stream processing loop finished.`
        );

        if (isFetchingContext) setIsFetchingContext(false);

        console.log(
          `[handleResponse ${flowType} ${chatIdToUse}] Final fullContent before processing:`,
          JSON.stringify(fullContent)
        );
        fullContent = fullContent
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "\n")
          .trim();
        console.log(
          `[handleResponse ${flowType} ${chatIdToUse}] Final fullContent after trim/replace:`,
          JSON.stringify(fullContent)
        );
        sources = extractSourcesFromMarkdown(fullContent);

        if (fullContent === "") {
          console.log(
            "[handleResponse] Empty content detected - likely moderation."
          );
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

        setChatMessages(finalMessages);
        setStreamingContent("");
        setIsGenerating(false);
        console.log(
          `[handleResponse ${flowType}] Stream finished, UI unlocked. Starting title generation/save...`
        );

        if (chatIdToUse) {
          generateAndSetTitle(chatIdToUse, finalMessages).catch((error) => {
            console.error(
              `[handleResponse ${flowType}] Error during background title/save:`,
              error
            );
          });
        } else {
          console.warn(
            `[handleResponse ${flowType}] No chatIdToUse available for title generation.`
          );
        }

        console.log(
          `[handleResponse ${flowType}] TRY block finished (title/save running in background).`
        );
      } catch (error) {
        console.error(
          `[handleResponse ${flowType}] Error generating response (outer catch): `,
          error
        );
        toast.error(
          error instanceof Error
            ? error.message
            : `Failed to get ${flowType} response`
        );
        const errorMessage: ChatMessage = {
          role: "assistant",
          content: `I apologize, but I encountered an error processing your ${flowType} request. Please try again.`,
        };
        setChatMessages((currentMsgs) => [...messagesForApi, errorMessage]);
        if (chatIdToUse) {
          updateChat(chatIdToUse, [...messagesForApi, errorMessage]);
        }
        setStreamingContent("");
        setIsGenerating(false);
        if (isFetchingContext) setIsFetchingContext(false);
      } finally {
        console.log(`[handleResponse ${flowType}] FINALLY block reached.`);
      }
    },
    [
      settings,
      isGenerating,
      isFetchingContext,
      allPointsInSpace,
      ownedPointIds,
      endorsedPointIds,
      userRationales,
      storedMessages,
      generateAndSetTitle,
      updateChat,
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
        console.error("Failed to copy message:", err);
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
        isGenerating
      ) {
        console.warn(
          "[handleAssistantRetry] Invalid index, role, or already generating. Skipping.",
          { index, role: chatMessages[index]?.role, isGenerating }
        );
        return;
      }

      let chatIdToUse = currentChatId;
      if (!chatIdToUse) {
        toast.error("Cannot retry: Current chat ID is missing.");
        console.error("[handleAssistantRetry] No currentChatId found.");
        return;
      }

      console.log(
        `[handleAssistantRetry] Retrying generation for message index: ${index} with flow: ${currentFlowType}`
      );
      const historyForRetry = chatMessages.slice(0, index);
      setChatMessages(historyForRetry);
      updateChat(chatIdToUse, historyForRetry);
      await handleResponse(historyForRetry, chatIdToUse, currentFlowType);
    },
    [
      chatMessages,
      isGenerating,
      currentChatId,
      currentFlowType,
      handleResponse,
      updateChat,
    ]
  );

  const handleSaveEdit = useCallback(
    (index: number, newContent: string) => {
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
        console.warn(
          "[handleSaveEdit] Invalid state for saving edit. Cannot edit non-user messages, index out of bounds, content empty or unchanged."
        );
        return;
      }

      console.log(
        `[handleSaveEdit] Saving edit for index: ${index} in chat ${currentChatId} with flow: ${currentFlowType}`
      );

      const editedMessage: ChatMessage = {
        ...chatMessages[index],
        content: trimmedNewContent,
      };
      const historyForEdit = [...chatMessages.slice(0, index), editedMessage];

      setChatMessages(historyForEdit);
      updateChat(currentChatId, historyForEdit);

      console.log(
        `[handleSaveEdit] Triggering regeneration after edit with flow: ${currentFlowType}`
      );
      handleResponse(historyForEdit, currentChatId, currentFlowType);

      toast.success("Message updated & regenerating response...");
    },
    [currentChatId, chatMessages, updateChat, handleResponse, currentFlowType]
  );

  const startChatWithOption = useCallback(
    async (option: {
      id: "distill" | "build" | "generate";
      title: string;
      prompt: string;
    }) => {
      if (!option || !currentSpace || !isAuthenticated) return;
      let chatIdToUse = currentChatId;
      let isNewChat = false;

      if (!chatIdToUse || chatMessages.length > 0) {
        const newId = await createNewChat();
        if (!newId) {
          toast.error("Failed to create new chat.");
          return;
        }
        chatIdToUse = newId;
        isNewChat = true;
        setChatMessages([]);
      } else {
        setCurrentFlowType("default");
      }

      let initialUserMessage: string;
      switch (option.id) {
        case "distill":
          initialUserMessage = option.prompt;
          break;
        case "build":
          initialUserMessage = option.prompt;
          break;
        case "generate":
          initialUserMessage = option.prompt;
          break;
        default:
          console.warn("Unknown chat option ID:", option.id);
          initialUserMessage = "Let's chat.";
          break;
      }

      const initialMessages: ChatMessage[] = [
        { role: "user", content: initialUserMessage },
      ];

      setChatMessages(initialMessages);
      updateChat(chatIdToUse, initialMessages);
      setCurrentFlowType(option.id);

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

      await handleResponse(messagesForApi, chatIdToUse, option.id);
    },
    [
      currentSpace,
      isAuthenticated,
      currentChatId,
      chatMessages,
      settings,
      storedMessages,
      handleResponse,
      updateChat,
      createNewChat,
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
        isGenerating ||
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

      if (!chatIdToUse) {
        const newId = await createNewChat();
        if (!newId) {
          toast.error("Failed to create new chat.");
          setMessage(userMessageContent);
          return;
        }
        chatIdToUse = newId;
        messagesForHistory = [newMessage];
        setCurrentFlowType("default");
      }

      setChatMessages(messagesForHistory);
      updateChat(chatIdToUse, messagesForHistory);

      const flowTypeForApi = currentFlowType;
      console.log(
        `[handleSubmit] Sending message with flow: ${flowTypeForApi}`
      );

      await handleResponse(messagesForHistory, chatIdToUse, flowTypeForApi);
    },
    [
      message,
      isGenerating,
      currentSpace,
      isAuthenticated,
      currentChatId,
      chatMessages,
      currentFlowType,
      handleResponse,
      createNewChat,
      updateChat,
    ]
  );

  return {
    message,
    setMessage,
    chatMessages,
    setChatMessages,
    isGenerating,
    isFetchingContext,
    streamingContent,
    chatEndRef,
    currentFlowType,
    startChatWithOption,
    handleSubmit,
    handleCopy,
    handleRetry,
    handleSaveEdit,
  };
}
