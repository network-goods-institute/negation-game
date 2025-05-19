import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { generateDistillRationaleChatBotResponse } from "@/actions/generateDistillRationaleChatBotResponse";
import { generateSuggestionChatBotResponse } from "@/actions/generateSuggestionChatBotResponse";
import { generateRationaleCreationResponse } from "@/actions/generateRationaleCreationResponse";
import { PointInSpace } from "@/actions/fetchAllSpacePoints";
import { generateChatName } from "@/actions/generateChatName";
import { extractSourcesFromMarkdown } from "@/lib/negation-game/chatUtils";
import { getChatMessageAsText } from "@/lib/negation-game/getChatMessageAsText";
import {
  ChatMessage,
  SavedChat,
  ChatRationale,
  DiscourseMessage,
  ChatSettings,
  ViewpointGraph,
} from "@/types/chat";
import {
  FlowType,
  FlowParams,
  determineFlowParams,
  mapOptionToFlowType,
} from "@/hooks/useChatFlow";

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
  discourseUrl: string;
  savedChats: SavedChat[];
  updateChat: (
    chatId: string,
    messages: ChatMessage[],
    title?: string,
    distillRationaleId?: string | null,
    graph?: ViewpointGraph | null,
    immediate?: boolean
  ) => void;
  createNewChat: (initialGraph?: ViewpointGraph) => Promise<string | null>;
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
  availableRationales,
  storedMessages,
  discourseUrl,
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
  const currentGraphRef = useRef<ViewpointGraph | undefined | null>(undefined);
  const lastFlowParamsRef = useRef<FlowParams | null>(null);

  // Sync chat state when the current chat changes or its data updates
  const currentChat = savedChats.find((c) => c.id === currentChatId);
  const currentChatStateHash = currentChat?.state_hash;

  useEffect(() => {
    // Avoid syncing while AI is generating a response (or handling edits)
    if (currentChatId && generatingChats.has(currentChatId)) {
      prevChatIdRef.current = currentChatId;
      return;
    }
    const newMessagesFromSavedChat = currentChat?.messages || [];
    const newGraphFromSavedChat = currentChat?.graph;

    const didChatIdChange = currentChatId !== prevChatIdRef.current;
    if (didChatIdChange) {
      // Switched to a new chat, so reset local messages to what's in the newly selected saved chat.
      setChatMessages(newMessagesFromSavedChat);
      currentGraphRef.current = newGraphFromSavedChat;
      // prevChatIdRef.current is updated at the end of the effect
    } else {
      if (currentChatId && generatingChats.has(currentChatId)) {
        prevChatIdRef.current = currentChatId;
        return;
      }
      // Still on the same chat. Compare local messages with messages from savedChat.
      const localMessagesJson = JSON.stringify(chatMessages);
      const savedMessagesJson = JSON.stringify(newMessagesFromSavedChat);

      if (savedMessagesJson !== localMessagesJson) {
        // Messages differ. Determine if savedChat is only an outdated or superset prefix of local state.
        let ignoreSavedUpdate = false;
        const localLen = chatMessages.length;
        const savedLen = newMessagesFromSavedChat.length;
        if (savedLen <= localLen) {
          // saved shorter or equal: check if all saved messages match the first part of local
          ignoreSavedUpdate = newMessagesFromSavedChat.every(
            (msg, idx) =>
              JSON.stringify(msg) === JSON.stringify(chatMessages[idx])
          );
        } else {
          // saved longer: check if saved starts with local history
          ignoreSavedUpdate = newMessagesFromSavedChat
            .slice(0, localLen)
            .every(
              (msg, idx) =>
                JSON.stringify(msg) === JSON.stringify(chatMessages[idx])
            );
        }
        if (!ignoreSavedUpdate) {
          // Saved chat contains non-prefix changes; update local messages from saved chat.
          setChatMessages(newMessagesFromSavedChat);
        }
      }
    }

    // Update graph ref only on chat switch or when graph object in savedChat changes
    if (
      didChatIdChange ||
      JSON.stringify(newGraphFromSavedChat) !==
        JSON.stringify(currentGraphRef.current)
    ) {
      currentGraphRef.current = newGraphFromSavedChat;
    }

    prevChatIdRef.current = currentChatId;
  }, [
    currentChatId,
    currentChatStateHash, // Reacts to changes in the persisted chat data
    chatMessages, // Needed for comparison to prevent unnecessary overwrites
    // currentChat?.messages and currentChat?.graph are implicitly covered by currentChatStateHash
    // but including them makes dependencies more explicit if hash wasn't perfect.
    currentChat?.messages,
    currentChat?.graph,
    generatingChats,
  ]);

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
    async (
      chatId: string,
      finalMessages: ChatMessage[],
      graph?: ViewpointGraph | null
    ) => {
      const chatToUpdate = savedChats.find((c) => c.id === chatId);
      const rationaleIdForUpdate = chatToUpdate?.distillRationaleId ?? null;
      const graphForUpdate = graph !== undefined ? graph : chatToUpdate?.graph;
      const needsTitle = !chatToUpdate || chatToUpdate.title === "New Chat";

      if (!needsTitle) {
        updateChat(
          chatId,
          finalMessages,
          undefined,
          rationaleIdForUpdate,
          graphForUpdate,
          true
        );
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
          updateChat(
            chatId,
            finalMessages,
            title,
            rationaleIdForUpdate,
            graphForUpdate,
            true
          );
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
            rationaleIdForUpdate,
            graphForUpdate,
            true
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
          rationaleIdForUpdate,
          graphForUpdate,
          true
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
      selectedRationaleId?: string | null,
      rationaleDescription?: string,
      linkUrl?: string
    ) => {
      lastFlowParamsRef.current = {
        flowType,
        rationaleId: selectedRationaleId,
        description: rationaleDescription,
        linkUrl,
      };
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
      let suggestedGraph: ViewpointGraph | undefined | null = undefined;

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
            messagesForApi,
            settings,
            allPointsInSpace,
            ownedPointIds,
            endorsedPointIds,
            settings.includeDiscourseMessages ? storedMessages : []
          );
        } else if (flowType === "distill") {
          responseStream = await generateDistillRationaleChatBotResponse(
            messagesForApi,
            settings,
            settings.includeDiscourseMessages ? storedMessages : [],
            selectedRationaleId
          );
        } else if (flowType === "create_rationale") {
          const currentChat = savedChats.find((c) => c.id === chatIdToUse);
          const currentGraph = currentGraphRef.current ||
            currentChat?.graph || { nodes: [], edges: [] };
          const context = {
            currentGraph: currentGraph,
            allPointsInSpace: allPointsInSpace,
            linkUrl: linkUrl,
            rationaleDescription: rationaleDescription,
          };
          const result = await generateRationaleCreationResponse(
            messagesForApi,
            context
          );
          responseStream = result.textStream;
          suggestedGraph = result.suggestedGraph;
        } else {
          responseStream = await generateSuggestionChatBotResponse(
            messagesForApi,
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
        let streamTextContent = "";
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
              streamTextContent += value;
              setStreamingContents((prev) =>
                new Map(prev).set(chatIdToUse, streamTextContent)
              );
            }
          }
        } catch (streamError) {
          toast.error(`Error reading AI response stream (${flowType}).`);
          streamTextContent += "\n\n[Error processing stream]";
        } finally {
          reader.releaseLock();
        }

        fullContent = streamTextContent.trim();
        sources = extractSourcesFromMarkdown(fullContent);

        if (fullContent === "") {
          if (flowType !== "create_rationale" || !suggestedGraph) {
            fullContent = "[AI response was empty]";
            toast.warning("AI returned an empty text response.");
          }
        }

        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: fullContent,
          sources,
        };
        const finalMessages = [...messagesForApi, assistantMessage];

        // Only update local messages during active generation for this chat
        if (activeGeneratingChatRef.current === chatIdToUse) {
          setChatMessages(finalMessages);
        }

        if (chatIdToUse) {
          const graphToSave =
            flowType === "create_rationale" ? suggestedGraph : undefined;
          if (graphToSave) {
            currentGraphRef.current = graphToSave;
          }
          generateAndSetTitle(chatIdToUse, finalMessages, graphToSave).catch(
            (error) => {}
          );
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

        // Only update local messages on error if still the active generating chat
        if (activeGeneratingChatRef.current === chatIdToUse) {
          setChatMessages(messagesWithError);
        }

        if (chatIdToUse) {
          const currentChat = savedChats.find((c) => c.id === chatIdToUse);
          updateChat(
            chatIdToUse,
            messagesWithError,
            undefined,
            flowType === "distill"
              ? selectedRationaleId
              : (currentChat?.distillRationaleId ?? null),
            currentChat?.graph
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      generatingChats,
      settings,
      allPointsInSpace,
      ownedPointIds,
      endorsedPointIds,
      storedMessages,
      generateAndSetTitle,
      updateChat,
      savedChats,
      currentChatId,
    ]
  );

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

      const chat = savedChats.find((c) => c.id === currentChatId);
      if (!chat) {
        toast.error("Chat not found.");
        return;
      }
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
        generatingChats.has(currentChatId || "")
      ) {
        return;
      }

      let chatIdToUse = currentChatId;
      if (!chatIdToUse) {
        toast.error("Cannot retry: Current chat ID is missing.");
        return;
      }

      const historyForRetry = chatMessages.slice(0, messageIndex);
      setChatMessages(historyForRetry);

      // Determine which flow to retry: use lastFlowParams if set, otherwise derive from saved chat
      const savedChatForRetry = savedChats.find((c) => c.id === chatIdToUse);
      const {
        flowType: retryFlow,
        rationaleId: retryRationaleId,
        description: retryDescription,
        linkUrl: retryLinkUrl,
      } = lastFlowParamsRef.current ??
      determineFlowParams(savedChatForRetry, currentGraphRef.current);

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
      chatMessages,
      generatingChats,
      currentChatId,
      handleResponse,
      isAuthenticated,
      savedChats,
      lastFlowParamsRef,
      currentGraphRef,
    ]
  );

  const handleSaveEdit = useCallback(
    async (messageIndex: number, newContent: string) => {
      if (!currentChatId || !isAuthenticated) return;
      if (
        !currentChatId ||
        messageIndex === null ||
        messageIndex < 0 ||
        messageIndex >= chatMessages.length ||
        chatMessages[messageIndex].role !== "user" ||
        !newContent ||
        chatMessages[messageIndex].content === newContent
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

      // Use last flow params if available, otherwise infer from saved chat to preserve distill
      const savedChatForEdit = savedChats.find((c) => c.id === currentChatId);
      const {
        flowType: editFlow,
        rationaleId: editRationaleId,
        description: editDescription,
        linkUrl: editLinkUrl,
      } = lastFlowParamsRef.current ??
      determineFlowParams(savedChatForEdit, savedChatForEdit?.graph ?? null);
      await handleResponse(
        historyForEdit,
        currentChatId || "",
        editFlow,
        editRationaleId ?? null,
        editDescription,
        editLinkUrl
      );

      toast.success("Message updated & regenerating response...");
    },
    [
      currentChatId,
      chatMessages,
      handleResponse,
      savedChats,
      setChatMessages,
      isAuthenticated,
    ]
  );

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
      let isNewChat = false;

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
      updateChat(chatIdToUse, initialMessages, undefined, null, undefined);

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

      const flow = mapOptionToFlowType(option.id);
      await handleResponse(messagesForApi, chatIdToUse, flow, null);
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

      const initialUserMessage = `Please help me distill my rationale titled "${selectedRationaleTitle}" (ID: ${selectedRationaleId}) into a well-structured essay. The rationale has ${rationale.graph.nodes.length} points and ${rationale.graph.edges.length} connections. Focus on organizing these points into a coherent argument. Here's the description: "${rationale.description}". Please incorporate relevant context about my endorsed points related to this topic. Do not suggest new points or negations.`;

      const initialMessages: ChatMessage[] = [
        { role: "user", content: initialUserMessage },
      ];

      setChatMessages(initialMessages);
      updateChat(
        chatIdToUse,
        initialMessages,
        undefined,
        selectedRationaleId,
        null
      );

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

      // Initialize conversation state
      let chatIdToUse = currentChatId;
      let messagesForHistory = [...chatMessages, newMessage];
      let graphForUpdate = currentGraphRef.current;

      // Create a new chat if none exists
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
    currentGraphRef,
  };
}
