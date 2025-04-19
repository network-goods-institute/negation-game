import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  generateChatBotResponse,
  EndorsedPoint,
} from "@/actions/generateChatBotResponse";
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

interface UseChatStateProps {
  currentChatId: string | null;
  currentSpace: string | null;
  isAuthenticated: boolean;
  settings: ChatSettings;
  endorsedPoints: EndorsedPoint[];
  userRationales: ChatRationale[];
  storedMessages: DiscourseMessage[];
  savedChats: SavedChat[];
  updateChat: (chatId: string, messages: ChatMessage[], title?: string) => void;
  createNewChat: () => string | null;
}

export function useChatState({
  currentChatId,
  currentSpace,
  isAuthenticated,
  settings,
  endorsedPoints,
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
  const [selectedOption, setSelectedOption] = useState<InitialOption>(null);

  useEffect(() => {
    if (currentChatId) {
      const currentChat = savedChats.find((c) => c.id === currentChatId);
      setChatMessages(currentChat?.messages || []);
      setSelectedOption(null);
    } else {
      setChatMessages([]);
      setSelectedOption(null);
    }
  }, [currentChatId, savedChats]);

  useEffect(() => {
    if (chatMessages.length > 0 || streamingContent) {
      const timer = setTimeout(() => {
        chatEndRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [chatMessages, streamingContent]);

  const generateAndSetTitle = useCallback(
    async (chatId: string, finalMessages: ChatMessage[]) => {
      const chatToUpdate = savedChats.find((c) => c.id === chatId);
      const needsTitle = !chatToUpdate || chatToUpdate.title === "New Chat";

      if (!needsTitle) {
        updateChat(chatId, finalMessages);
        return;
      }

      try {
        const titleStream = await generateChatName(finalMessages);
        if (!titleStream) throw new Error("Failed to get title stream");

        let title = "";
        for await (const chunk of titleStream) {
          if (chunk === null || chunk === undefined) continue;
          title += String(chunk);
        }
        title = title.trim();

        if (title) {
          updateChat(chatId, finalMessages, title);
        } else {
          const assistantMsgContent =
            finalMessages.find((m) => m.role === "assistant")?.content ||
            "Chat";
          const fallbackTitle =
            assistantMsgContent.split("\n")[0].slice(0, 47) +
            (assistantMsgContent.length > 47 ? "..." : "");
          updateChat(chatId, finalMessages, fallbackTitle || "Chat");
        }
      } catch (titleError) {
        console.error("Error generating chat name:", titleError);
        const assistantMsgContent =
          finalMessages.find((m) => m.role === "assistant")?.content || "Chat";
        const fallbackTitle =
          assistantMsgContent.split("\n")[0].slice(0, 47) +
          (assistantMsgContent.length > 47 ? "..." : "");
        updateChat(chatId, finalMessages, fallbackTitle || "Chat");
      }
    },
    [savedChats, updateChat]
  );

  const handleGenericResponse = useCallback(
    async (messagesForApi: ChatMessage[], chatIdToUse: string) => {
      setIsGenerating(true);
      setStreamingContent("");
      setIsFetchingContext(true);
      console.log(
        "[handleGenericResponse] START: isGenerating=true, isFetchingContext=true"
      );
      let fullContent = "";
      let sources: ChatMessage["sources"] | undefined = undefined;

      try {
        const contextEndorsements =
          settings.includeEndorsements && settings.includePoints
            ? endorsedPoints
            : undefined;
        const contextRationales = settings.includeRationales
          ? userRationales
          : undefined;
        const contextDiscourse = settings.includeDiscourseMessages
          ? storedMessages
          : [];

        const response = await generateChatBotResponse(
          messagesForApi,
          settings,
          contextEndorsements,
          contextRationales,
          contextDiscourse
        );

        if (!response) throw new Error("Failed to get response stream");

        console.log(
          "[handleGenericResponse] Received response object from action."
        );
        console.log(
          "[handleGenericResponse] Starting stream processing loop..."
        );

        try {
          let firstChunkReceived = false;
          for await (const chunk of response) {
            if (!firstChunkReceived) {
              setIsFetchingContext(false);
              firstChunkReceived = true;
              console.log(
                "[handleGenericResponse] First chunk received, isFetchingContext=false"
              );
            }
            if (chunk === null || chunk === undefined) continue;
            const chunkString = String(chunk);
            fullContent += chunkString;
            setStreamingContent(fullContent);
          }
        } catch (streamError) {
          console.error(
            "[handleGenericResponse] Error processing stream chunk:",
            streamError
          );
          toast.error("Error reading AI response stream.");
          fullContent += "\n\n[Error processing stream]";
        }
        console.log("[handleGenericResponse] Stream processing loop finished.");

        if (isFetchingContext) setIsFetchingContext(false);

        fullContent = fullContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        fullContent = fullContent.trim();
        sources = extractSourcesFromMarkdown(fullContent);

        // Handle potential content moderation or empty response
        if (fullContent === "") {
          console.log(
            "[handleGenericResponse] Empty content detected - likely moderation."
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

        await generateAndSetTitle(chatIdToUse, finalMessages);

        console.log("[handleGenericResponse] TRY block finished successfully.");
      } catch (error) {
        console.error(
          "[handleGenericResponse] Error generating response (outer catch): ",
          error
        );
        toast.error(
          error instanceof Error ? error.message : "Failed to get response"
        );
        const errorMessage: ChatMessage = {
          role: "assistant",
          content:
            "I apologize, but I encountered an error processing your request. Please check the console for details.",
        };
        const errorMessages = [...messagesForApi, errorMessage];
        setChatMessages(errorMessages);
        updateChat(chatIdToUse, errorMessages);
      } finally {
        setIsGenerating(false);
        setIsFetchingContext(false);
        if (streamingContent) setStreamingContent("");
        console.log(
          "[handleGenericResponse] FINALLY: isGenerating=false, isFetchingContext=false"
        );
      }
    },
    [
      settings,
      endorsedPoints,
      userRationales,
      storedMessages,
      generateAndSetTitle,
      updateChat,
      isFetchingContext,
      streamingContent,
    ]
  );

  const startChatWithOption = useCallback(
    async (option: InitialOption) => {
      if (!option || !currentSpace || !isAuthenticated) return;
      let chatIdToUse = currentChatId;
      let isNewChat = false;

      if (!chatIdToUse) {
        const newId = createNewChat();
        if (!newId) {
          toast.error("Failed to create new chat.");
          return;
        }
        chatIdToUse = newId;
        isNewChat = true;
      }

      let initialUserMessage: string;
      if (option === "distill") {
        initialUserMessage =
          "I'd like to distill my existing rationales into a well-structured essay. Please help me organize and refine my thoughts based on my rationales that you can see.";
      } else {
        // 'build'
        initialUserMessage =
          "I'd like to build a new rationale from my forum posts and our discussion. Please help me organize my thoughts based on my forum posts and my points.";
      }

      const initialMessages: ChatMessage[] = [
        { role: "user", content: initialUserMessage },
      ];

      setChatMessages(initialMessages);
      updateChat(chatIdToUse, initialMessages);
      setSelectedOption(option);

      let systemMessages: ChatMessage[] = [];
      if (
        option === "build" &&
        settings.includeDiscourseMessages &&
        storedMessages.length > 0
      ) {
        systemMessages = storedMessages.map((msg) => ({
          role: "system" as const,
          content: `From forum post "${msg.topic_title || "Untitled"}": ${msg.raw || msg.content}`,
        }));
      }

      const messagesForApi = [...systemMessages, ...initialMessages];

      await handleGenericResponse(messagesForApi, chatIdToUse);
    },
    [
      currentSpace,
      isAuthenticated,
      currentChatId,
      settings,
      storedMessages,
      handleGenericResponse,
      updateChat,
      createNewChat,
    ]
  );

  const handleSubmit = useCallback(
    async (
      e:
        | React.FormEvent<HTMLFormElement>
        | React.KeyboardEvent<HTMLTextAreaElement>
    ) => {
      e.preventDefault();
      if (
        !message.trim() ||
        isGenerating ||
        !currentSpace ||
        !isAuthenticated
      ) {
        return;
      }

      const userMessageContent = message;
      setMessage("");

      let activeChatId = currentChatId;
      let isNewChatCreation = false;

      if (!activeChatId) {
        const newId = createNewChat();
        if (!newId) {
          toast.error("Failed to create new chat.");
          return;
        }
        activeChatId = newId;
        isNewChatCreation = true;
      }

      const newMessage: ChatMessage = {
        role: "user",
        content: userMessageContent,
      };
      const updatedMessages = [...chatMessages, newMessage];

      setChatMessages(updatedMessages);

      await generateAndSetTitle(activeChatId, updatedMessages);

      await handleGenericResponse(updatedMessages, activeChatId);
    },
    [
      message,
      isGenerating,
      currentSpace,
      isAuthenticated,
      currentChatId,
      chatMessages,
      handleGenericResponse,
      createNewChat,
      generateAndSetTitle,
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
    selectedOption,
    setSelectedOption,
    startChatWithOption,
    handleSubmit,
  };
}
