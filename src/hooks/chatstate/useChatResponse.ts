import { useCallback } from "react";
import { toast } from "sonner";
import { generateDistillRationaleChatBotResponse } from "@/actions/ai/generateDistillRationaleChatBotResponse";
import { generateSuggestionChatBotResponse } from "@/actions/ai/generateSuggestionChatBotResponse";
import { generateChatName } from "@/actions/ai/generateChatName";
import { extractSourcesFromMarkdown } from "@/lib/negation-game/chatUtils";
import type { ChatMessage, SavedChat, ViewpointGraph } from "@/types/chat";
import type { FlowParams, FlowType } from "@/hooks/chat/useChatFlow";
import type { Dispatch, SetStateAction, MutableRefObject } from "react";
import { GraphCommand } from "@/types/graphCommands";
import { applyGraphCommands } from "@/utils/graphCommandProcessor";

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
        toast.error(
          "Failed to generate chat name. Please contact support if this persists."
        );
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
          // Delegate AI generation to our dedicated API route to avoid server-action timeouts
          const currentChat = savedChats.find((c) => c.id === chatIdToUse);
          const baseGraph = currentGraphRef.current ||
            currentChat?.graph || {
              nodes: [],
              edges: [],
              description: "",
              linkUrl: "",
              topic: "",
            };
          // Preprocess linkUrl: extract URL from last user message if not explicitly provided
          let contextLinkUrl = linkUrl;
          if (!contextLinkUrl) {
            const lastUserMsg = messagesForApi
              .slice()
              .reverse()
              .find((m) => m.role === "user");
            if (lastUserMsg) {
              const match = lastUserMsg.content.match(/https?:\/\/[^\s)\"]+/i);
              if (match) {
                contextLinkUrl = match[0];
              }
            }
          }

          const maxPointsInSpace = 50;
          const limitedPoints = allPointsInSpace
            .slice(-maxPointsInSpace)
            .map((p) => ({
              ...p,
              content:
                p.content.length > 80
                  ? p.content.substring(0, 80) + "..."
                  : p.content,
            }));

          let truncatedMessages = messagesForApi;
          let payload = {
            messages: truncatedMessages,
            context: {
              currentGraph: baseGraph,
              allPointsInSpace: limitedPoints,
              linkUrl: contextLinkUrl,
              rationaleDescription,
            },
          };

          let payloadString = JSON.stringify(payload);
          let payloadSizeBytes = payloadString.length;
          const maxPayloadSizeBytes = 800 * 1024;

          if (
            payloadSizeBytes > maxPayloadSizeBytes &&
            truncatedMessages.length > 2
          ) {
            let messageCount = Math.max(
              2,
              Math.min(10, Math.floor(truncatedMessages.length / 2))
            );

            while (payloadSizeBytes > maxPayloadSizeBytes && messageCount > 1) {
              const recentMessages = truncatedMessages.slice(-messageCount);
              truncatedMessages = recentMessages;

              payload = {
                messages: truncatedMessages,
                context: {
                  currentGraph: baseGraph,
                  allPointsInSpace: limitedPoints,
                  linkUrl: contextLinkUrl,
                  rationaleDescription,
                },
              };

              payloadString = JSON.stringify(payload);
              payloadSizeBytes = payloadString.length;
              messageCount = Math.max(1, messageCount - 2);
            }
          }

          const payloadSizeKB = (payloadSizeBytes / 1024).toFixed(2);
          if (payloadSizeBytes > maxPayloadSizeBytes) {
            throw new Error(
              `Request too large (${payloadSizeKB} KB) even after message truncation and point reduction.`
            );
          }

          const res = await fetch("/api/rationale/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payloadString,
          });
          if (!res.ok) {
            let errorMessage = `Rationale API error: ${res.status} ${res.statusText}`;

            try {
              const errorData = await res.json();
              if (errorData.error) {
                switch (errorData.error) {
                  case "AI_RATE_LIMITED":
                    errorMessage =
                      errorData.message ||
                      "We've hit our rate limits for AI responses. Please wait a moment before trying again, or use the retry button to try again manually.";
                    break;
                  case "AI_TIMEOUT":
                    errorMessage =
                      errorData.message ||
                      "AI service timed out. This often happens during high load. Please use the retry button to try again.";
                    break;
                  case "CONTEXT_TOO_LONG":
                    errorMessage =
                      errorData.message ||
                      "The conversation is too long. Please start a new chat.";
                    break;
                  case "CONTENT_BLOCKED":
                    errorMessage =
                      errorData.message ||
                      "AI response was blocked due to content safety reasons.";
                    break;
                  case "AUTHENTICATION_REQUIRED":
                    errorMessage =
                      "Authentication required. Please sign in again.";
                    break;
                  default:
                    errorMessage = errorData.message || errorMessage;
                }
              }
            } catch (parseError) {
              // Fall back to default error message if parsing fails
            }

            throw new Error(errorMessage);
          }
          // stream the AI text response
          if (!res.body) {
            throw new Error("Empty response body from Rationale API");
          }
          responseStream = res.body as unknown as ReadableStream<
            string | Uint8Array | object
          >;
          const commandsHeader = res.headers.get("x-commands");
          const graphHeader = res.headers.get("x-graph");

          if (commandsHeader) {
            try {
              let commandsJson;
              try {
                commandsJson = decodeURIComponent(commandsHeader);
              } catch (decodeError) {
                console.error("DECODE ERROR:", decodeError);
                throw new Error(
                  `Failed to decode commands header: ${decodeError}`
                );
              }

              let commands: GraphCommand[];
              try {
                commands = JSON.parse(commandsJson);
              } catch (parseError) {
                console.error("JSON PARSE ERROR:", parseError);
                console.error("Failed JSON string:", commandsJson);
                throw new Error(`Failed to parse commands JSON: ${parseError}`);
              }

              const invalidCommands = [];
              for (let i = 0; i < commands.length; i++) {
                const cmd = commands[i];
                if (!cmd || typeof cmd !== "object") {
                  invalidCommands.push(`Command ${i}: not an object`);
                  continue;
                }
                if (!cmd.id || !cmd.type) {
                  invalidCommands.push(
                    `Command ${i}: missing id or type (id: ${cmd.id}, type: ${cmd.type})`
                  );
                  continue;
                }
                console.log(`Command ${i}: ${cmd.type} - ${cmd.id} ✓`);
              }

              if (invalidCommands.length > 0) {
                console.error("INVALID COMMANDS FOUND:", invalidCommands);
                throw new Error(
                  `Invalid commands: ${invalidCommands.join("; ")}`
                );
              }

              let updatedGraph, errors;
              try {
                const result = applyGraphCommands(baseGraph, commands);
                updatedGraph = result.updatedGraph;
                errors = result.errors;
              } catch (applyError) {
                console.error("COMMAND APPLICATION ERROR:", applyError);
                throw new Error(`Failed to apply commands: ${applyError}`);
              }

              if (errors.length > 0) {
                console.error("Commands failed to apply:", errors);
                console.error(
                  "Failed commands details:",
                  errors.map((err, i) => `${i}: ${err}`)
                );

                const errorCount = errors.length;
                const errorMessage =
                  errorCount === 1
                    ? "Failed to apply graph update. Please try again."
                    : `Failed to apply ${errorCount} graph updates. Please try again.`;
                toast.error(errorMessage);
              }

              suggestedGraph = updatedGraph;
            } catch (error) {
              console.error("=== COMMAND PROCESSING FAILURE ===");
              console.error("COMMAND PROCESSING FAILED:", error);
              console.error("Error details:", {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : "No stack",
                name: error instanceof Error ? error.name : "Unknown",
                cause: error instanceof Error ? error.cause : "No cause",
              });
              console.error(
                "Commands header was:",
                commandsHeader ? `${commandsHeader.length} chars` : "missing"
              );
              console.error("=== END COMMAND PROCESSING FAILURE ===");

              // Show generic error to user but keep detailed logs in console
              toast.error(
                "Graph update encountered an issue. Check console for details."
              );
            }
          }

          if (!commandsHeader || !suggestedGraph) {
            // Legacy: extract the suggested graph from response header
            if (!graphHeader) {
              suggestedGraph = baseGraph;
            } else {
              try {
                const graphJson = decodeURIComponent(graphHeader);
                const apiGraph: ViewpointGraph = JSON.parse(graphJson);

                const mergedNodes = apiGraph.nodes.map((aiNode) => {
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
                  ...apiGraph,
                  nodes: mergedNodes,
                  edges: apiGraph.edges,
                };
              } catch (decodeError) {
                try {
                  const apiGraph: ViewpointGraph = JSON.parse(graphHeader);
                  const mergedNodes = apiGraph.nodes.map((aiNode) => {
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
                    ...apiGraph,
                    nodes: mergedNodes,
                    edges: apiGraph.edges,
                  };
                } catch (parseError) {
                  suggestedGraph = baseGraph;
                }
              }
            }
          }
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
        const decoder = new TextDecoder();
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

            let chunk = "";
            if (typeof value === "string") {
              chunk = value;
            } else if (value instanceof Uint8Array) {
              chunk = decoder.decode(value, { stream: true });
            } else if (value) {
              chunk = String(value);
            }
            if (chunk) {
              streamTextContent += chunk;
              setStreamingContents((prev) =>
                new Map(prev).set(chatIdToUse, streamTextContent)
              );
            }
          }
        } catch (streamError) {
          toast.error(
            `Error reading AI response stream (${flowType}). Please contact support if this persists.`
          );
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
            : `Failed to get ${flowType} response. Please contact support if this persists.`
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
        console.error("[handleResponse] Error during initial AI call:", error);
        toast.error("Failed to get AI response.");
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
