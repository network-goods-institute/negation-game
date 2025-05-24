import { ChatListManagementProps } from "../chatlist/chatListTypes";
import { useChatState } from "../chatlist/useChatState";
import { useChatDialogs } from "../chatlist/useChatDialogs";
import { useChatSync } from "../chatlist/useChatSync";
import { useChatActions } from "../chatlist/useChatActions";

export function useChatListManagement(props: ChatListManagementProps) {
  const { currentSpace, isAuthenticated } = props;

  const {
    savedChats,
    setSavedChats,
    currentChatId,
    setCurrentChatId,
    isInitialized,
    savedChatsRef,
  } = useChatState({ currentSpace, isAuthenticated });

  const {
    chatToDelete,
    setChatToDelete,
    chatToRename,
    setChatToRename,
    newChatTitle,
    setNewChatTitle,
    showDeleteAllConfirmation,
    setShowDeleteAllConfirmation,
  } = useChatDialogs();

  const { pendingPushIds, setPendingPushIds, queuePushUpdate } =
    useChatSync(props);

  const {
    updateChat,
    createNewChat,
    deleteChat,
    deleteAllChats,
    renameChat,
    switchChat,
    replaceChat,
    deleteChatLocally,
  } = useChatActions({
    ...props,
    savedChats,
    setSavedChats,
    currentChatId,
    setCurrentChatId,
    queuePushUpdate,
    setPendingPushIds,
    savedChatsRef,
    setChatToDelete,
    setChatToRename,
    setNewChatTitle,
    setShowDeleteAllConfirmation,
  });

  const handleRenameChat = (chatId: string, title: string) => {
    return renameChat(chatId, title, setChatToRename, setNewChatTitle);
  };

  return {
    savedChats,
    currentChatId,
    isInitialized,
    chatToRename,
    setChatToRename,
    newChatTitle,
    setNewChatTitle,
    chatToDelete,
    setChatToDelete,
    showDeleteAllConfirmation,
    setShowDeleteAllConfirmation,
    pendingPushIds,
    updateChat,
    createNewChat,
    deleteChat,
    deleteAllChats,
    renameChat: handleRenameChat,
    switchChat,
    replaceChat,
    deleteChatLocally,
  };
}
