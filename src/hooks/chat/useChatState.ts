import { UseChatStateProps } from "../chatstate/useChatStateTypes";
import { useChatLocalState } from "../chatstate/useChatLocalState";
import { useChatResponse } from "../chatstate/useChatResponse";
import { useChatUserActions } from "../chatstate/useChatUserActions";
import { useChatSubmit } from "../chatstate/useChatSubmit";
import { useChatStarter } from "../chatstate/useChatStarter";

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
