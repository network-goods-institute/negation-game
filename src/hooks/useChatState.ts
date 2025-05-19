import { UseChatStateProps } from "./chatState/useChatStateTypes";
import { useChatLocalState } from "./chatState/useChatLocalState";
import { useChatResponse } from "./chatState/useChatResponse";
import { useChatUserActions } from "./chatState/useChatUserActions";
import { useChatSubmit } from "./chatState/useChatSubmit";
import { useChatStarter } from "./chatState/useChatStarter";

export function useChatState(props: UseChatStateProps) {
  const local = useChatLocalState(props);
  const handleResponse = useChatResponse({ ...props, ...local });
  const { handleCopy, handleRetry, handleSaveEdit } = useChatUserActions({
    ...props,
    ...local,
    handleResponse,
  });
  const handleSubmit = useChatSubmit({ ...props, ...local, handleResponse });
  const { startChatWithOption, startDistillChat } = useChatStarter({
    ...props,
    ...local,
    handleResponse,
  });

  return {
    message: local.message,
    setMessage: local.setMessage,
    chatMessages: local.chatMessages,
    setChatMessages: local.setChatMessages,
    generatingChats: local.generatingChats,
    fetchingContextChats: local.fetchingContextChats,
    streamingContents: local.streamingContents,
    chatEndRef: local.chatEndRef,
    generatingTitles: local.generatingTitles,
    startChatWithOption,
    startDistillChat,
    handleSubmit,
    handleCopy,
    handleRetry,
    handleSaveEdit,
    currentGraphRef: local.currentGraphRef,
  };
}
