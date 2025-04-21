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
  const [generatingChats, setGeneratingChats] = useState<Set<string>>(
    new Set()
  );
  const [fetchingContextChats, setFetchingContextChats] = useState<Set<string>>(
    new Set()
  );
  const [streamingContents, setStreamingContents] = useState<
    Map<string, string>
  >(new Map());
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
      if (generatingChats.has(chatIdToUse)) {
        console.warn(
          `[handleResponse ${flowType}] Already generating for chat ${chatIdToUse}, skipping call.`
        );
        return;
      }

      setGeneratingChats((prev) => new Set(prev).add(chatIdToUse));
      setFetchingContextChats((prev) => new Set(prev).add(chatIdToUse));
      setStreamingContents((prev) => new Map(prev).set(chatIdToUse, ""));

      console.log(
        `[handleResponse ${flowType}] START for chat ${chatIdToUse}: isGenerating=true, isFetchingContext=true`
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
          `[handleResponse ${flowType}] Received response object for chat ${chatIdToUse}.`
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
              setFetchingContextChats((prev) => {
                const newSet = new Set(prev);
                newSet.delete(chatIdToUse);
                return newSet;
              });
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
              setStreamingContents((prev) =>
                new Map(prev).set(chatIdToUse, fullContent)
              );
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
          `[handleResponse ${flowType}] Stream processing loop finished for chat ${chatIdToUse}.`
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

        console.log(
          `[handleResponse ${flowType}] Saving results via generateAndSetTitle for chat ${chatIdToUse}...`
        );

        if (chatIdToUse === currentChatId) {
          setChatMessages(finalMessages);
          console.log(
            `[handleResponse ${flowType}] Updated local chatMessages state for ${chatIdToUse}`
          );
        } else {
          console.log(
            `[handleResponse ${flowType}] User switched away from chat ${chatIdToUse} before final local state update.`
          );
        }

        if (chatIdToUse) {
          generateAndSetTitle(chatIdToUse, finalMessages).catch((error) => {
            console.error(
              `[handleResponse ${flowType}] Error during background title/save for chat ${chatIdToUse}:`,
              error
            );
          });
        } else {
          console.warn(
            `[handleResponse ${flowType}] No chatIdToUse available for title generation.`
          );
        }
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
        const errorMessageContent = `I apologize, but I encountered an error processing your ${flowType} request. Please try again.`;
        const errorMessage: ChatMessage = {
          role: "assistant",
          content: errorMessageContent,
        };
        if (chatIdToUse) {
          updateChat(chatIdToUse, [...messagesForApi, errorMessage]);
        }
      } finally {
        setGeneratingChats((prev) => {
          const newSet = new Set(prev);
          newSet.delete(chatIdToUse);
          return newSet;
        });
        setFetchingContextChats((prev) => {
          const newSet = new Set(prev);
          newSet.delete(chatIdToUse);
          return newSet;
        });
        setStreamingContents((prev) => {
          const newMap = new Map(prev);
          newMap.delete(chatIdToUse);
          return newMap;
        });
        console.log(
          `[handleResponse ${flowType}] FINALLY block reached for chat ${chatIdToUse}. Cleared generation state.`
        );
      }
    },
    [
      settings,
      allPointsInSpace,
      ownedPointIds,
      endorsedPointIds,
      userRationales,
      storedMessages,
      generateAndSetTitle,
      updateChat,
      generatingChats,
      currentChatId,
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
        generatingChats.has(currentChatId || "")
      ) {
        console.warn(
          "[handleAssistantRetry] Invalid index, role, or already generating. Skipping.",
          {
            index,
            role: chatMessages[index]?.role,
            generatingChats: generatingChats.has(currentChatId || ""),
          }
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
      await handleResponse(historyForRetry, chatIdToUse, currentFlowType);
    },
    [
      chatMessages,
      generatingChats,
      currentChatId,
      currentFlowType,
      handleResponse,
    ]
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
      await handleResponse(
        historyForEdit,
        currentChatId || "",
        currentFlowType
      );

      toast.success("Message updated & regenerating response...");
    },
    [currentChatId, chatMessages, handleResponse, currentFlowType]
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

      // Set local state immediately
      setChatMessages(initialMessages);
      // Immediately save this initial message to storage/backend
      updateChat(chatIdToUse, initialMessages);
      // Set the flow type for the upcoming generation
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

      // Now start the generation
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
      createNewChat,
      updateChat,
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
      await handleResponse(messagesForHistory, chatIdToUse, currentFlowType);
    },
    [
      message,
      generatingChats,
      currentSpace,
      isAuthenticated,
      currentChatId,
      chatMessages,
      currentFlowType,
      handleResponse,
      createNewChat,
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
    currentFlowType,
    startChatWithOption,
    handleSubmit,
    handleCopy,
    handleRetry,
    handleSaveEdit,
  };
}
