import { useState, useEffect, useRef } from "react";
import { ChatMessage, ViewpointGraph } from "@/types/chat";
import { UseChatStateProps } from "@/hooks/chatstate/useChatStateTypes";
import { FlowParams } from "@/hooks/chat/useChatFlow";

export function useChatLocalState({
  currentChatId,
  savedChats,
}: Pick<UseChatStateProps, "currentChatId" | "savedChats">) {
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

  const currentChat = savedChats.find((c) => c.id === currentChatId);
  const currentChatStateHash = currentChat?.state_hash;

  useEffect(() => {
    if (currentChatId && generatingChats.has(currentChatId)) {
      prevChatIdRef.current = currentChatId;
      return;
    }
    const newMessagesFromSavedChat = currentChat?.messages || [];
    const newGraphFromSavedChat = currentChat?.graph;

    const didChatIdChange = currentChatId !== prevChatIdRef.current;
    if (didChatIdChange) {
      setChatMessages(newMessagesFromSavedChat);
      currentGraphRef.current = newGraphFromSavedChat;
    } else {
      if (currentChatId && generatingChats.has(currentChatId)) {
        prevChatIdRef.current = currentChatId;
        return;
      }
      const localJson = JSON.stringify(chatMessages);
      const savedJson = JSON.stringify(newMessagesFromSavedChat);
      if (savedJson !== localJson) {
        let ignoreUpdate = false;
        const localLen = chatMessages.length;
        const savedLen = newMessagesFromSavedChat.length;
        if (savedLen <= localLen) {
          ignoreUpdate = newMessagesFromSavedChat.every(
            (msg, idx) =>
              JSON.stringify(msg) === JSON.stringify(chatMessages[idx])
          );
        } else {
          ignoreUpdate = newMessagesFromSavedChat
            .slice(0, localLen)
            .every(
              (msg, idx) =>
                JSON.stringify(msg) === JSON.stringify(chatMessages[idx])
            );
        }
        if (!ignoreUpdate) {
          setChatMessages(newMessagesFromSavedChat);
        }
      }
    }
    if (
      didChatIdChange ||
      JSON.stringify(currentChat?.graph) !==
        JSON.stringify(currentGraphRef.current)
    ) {
      currentGraphRef.current = currentChat?.graph;
    }
    prevChatIdRef.current = currentChatId;
  }, [
    currentChatId,
    currentChatStateHash,
    chatMessages,
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

  return {
    message,
    setMessage,
    chatMessages,
    setChatMessages,
    generatingChats,
    setGeneratingChats,
    fetchingContextChats,
    setFetchingContextChats,
    streamingContents,
    setStreamingContents,
    generatingTitles,
    setGeneratingTitles,
    chatEndRef,
    prevChatIdRef,
    activeGeneratingChatRef,
    currentGraphRef,
    lastFlowParamsRef,
  };
}
