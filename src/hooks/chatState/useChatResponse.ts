import { useCallback } from "react";
import { toast } from "sonner";
import { generateDistillRationaleChatBotResponse } from "@/actions/generateDistillRationaleChatBotResponse";
import { generateSuggestionChatBotResponse } from "@/actions/generateSuggestionChatBotResponse";
import { generateRationaleCreationResponse } from "@/actions/generateRationaleCreationResponse";
import { generateChatName } from "@/actions/generateChatName";
import { extractSourcesFromMarkdown } from "@/lib/negation-game/chatUtils";
import type { ChatMessage, SavedChat, ViewpointGraph } from "@/types/chat";
import type { FlowParams, FlowType } from "@/hooks/useChatFlow";
import type { Dispatch, SetStateAction, MutableRefObject } from "react";

/* eslint-disable drizzle/enforce-delete-with-where */

export interface UseChatResponseProps {
  settings: any;
  allPointsInSpace: any[];
  ownedPointIds: Set<number>;
  endorsedPointIds: Set<number>;
  storedMessages: any[];
  updateChat: (
    chatId: string,
    messages: ChatMessage[],
    title?: string,
    distillRationaleId?: string | null,
    graph?: ViewpointGraph | null,
    immediate?: boolean
  ) => void;
  savedChats: SavedChat[];
  currentChatId: string | null;
  setGeneratingChats: Dispatch<SetStateAction<Set<string>>>;
  setFetchingContextChats: Dispatch<SetStateAction<Set<string>>>;
  setStreamingContents: Dispatch<SetStateAction<Map<string, string>>>;
  setGeneratingTitles: Dispatch<SetStateAction<Set<string>>>;
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  currentGraphRef: MutableRefObject<ViewpointGraph | undefined | null>;
  lastFlowParamsRef: MutableRefObject<FlowParams | null>;
}

export function useChatResponse({
  settings,
  allPointsInSpace,
  ownedPointIds,
  endorsedPointIds,
  storedMessages,
  updateChat,
  savedChats,
  setGeneratingChats,
  setFetchingContextChats,
  setStreamingContents,
  setGeneratingTitles,
  setChatMessages,
  currentGraphRef,
  lastFlowParamsRef,
  activeGeneratingChatRef,
}: UseChatResponseProps & {
  activeGeneratingChatRef: React.MutableRefObject<string | null>;
}) {
  const generateAndSetTitle = useCallback(
    async (
      chatId: string,
      finalMessages: ChatMessage[],
      graph?: ViewpointGraph | null
    ) => {
      const chatToUpdate = savedChats.find((c) => c.id === chatId);
      const rationaleIdForUpdate: string | null =
        chatToUpdate?.distillRationaleId ??
        lastFlowParamsRef.current?.rationaleId ??
        null;
      const graphForUpdate = graph !== undefined ? graph : chatToUpdate?.graph;
      const needsTitle = !chatToUpdate || chatToUpdate.title === "New Chat";

      if (!needsTitle) {
        updateChat(
          chatId,
          finalMessages,
          chatToUpdate?.title,
          rationaleIdForUpdate,
          graphForUpdate
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
            if (done) break;
            if (typeof value === "string") {
              title += value;
            }
          }
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
          updateChat(
            chatId,
            finalMessages,
            "New Chat",
            rationaleIdForUpdate,
            graphForUpdate,
            true
          );
        }
      } catch (error) {
        console.error("[generateAndSetTitle] Error generating title:", error);
        updateChat(
          chatId,
          finalMessages,
          "New Chat",
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
    [savedChats, updateChat, setGeneratingTitles, lastFlowParamsRef]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
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

      const generating =
        activeGeneratingChatRef.current === chatIdToUse ||
        (setGeneratingChats &&
          (await new Promise<boolean>((resolve) =>
            setGeneratingChats((prev) => {
              resolve(prev.has(chatIdToUse));
              return prev;
            })
          )));

      if (generating) {
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
          const baseGraph = currentGraphRef.current ||
            currentChat?.graph || {
              nodes: [],
              edges: [],
              description: "",
              linkUrl: "",
              topic: "",
            };
          const context = {
            currentGraph: baseGraph,
            allPointsInSpace,
            linkUrl,
            rationaleDescription,
          };
          const result = await generateRationaleCreationResponse(
            messagesForApi,
            context
          );
          responseStream = result.textStream;
          const mergedNodes = result.suggestedGraph.nodes.map((aiNode) => {
            const existingNode = baseGraph.nodes.find(
              (n) => n.id === aiNode.id
            );
            if (existingNode) {
              return {
                ...aiNode,
                position: existingNode.position,
                data: { ...existingNode.data, ...aiNode.data },
              };
            }
            return aiNode;
          }) as ViewpointGraph["nodes"];
          suggestedGraph = {
            ...baseGraph,
            ...result.suggestedGraph,
            nodes: mergedNodes,
            edges: result.suggestedGraph.edges,
          };
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
            (error) => {
              console.error("[handleResponse] Title generation error:", error);
            }
          );
        }
      } catch (error) {
        console.error("[handleResponse] Error during response generation:", {
          error,
          chatId: chatIdToUse,
          flowType,
          distillRationaleId: selectedRationaleId,
        });
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
          const currentChat = savedChats.find((c) => c.id === chatIdToUse);
          updateChat(
            chatIdToUse,
            messagesWithError,
            undefined, // Keep existing title on error
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
      }
    },
    [
      lastFlowParamsRef,
      activeGeneratingChatRef,
      setGeneratingChats,
      setFetchingContextChats,
      setStreamingContents,
      settings,
      allPointsInSpace,
      ownedPointIds,
      endorsedPointIds,
      storedMessages,
      savedChats,
      currentGraphRef,
      setChatMessages,
      generateAndSetTitle,
      updateChat,
    ]
  );

  return handleResponse;
}
