import { useState } from "react";
import { ChatDialogsState } from "./chatListTypes";

export function useChatDialogs(): ChatDialogsState & {
  setChatToDelete: React.Dispatch<React.SetStateAction<string | null>>;
  setChatToRename: React.Dispatch<React.SetStateAction<string | null>>;
  setNewChatTitle: React.Dispatch<React.SetStateAction<string>>;
  setShowDeleteAllConfirmation: React.Dispatch<React.SetStateAction<boolean>>;
} {
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [chatToRename, setChatToRename] = useState<string | null>(null);
  const [newChatTitle, setNewChatTitle] = useState("");
  const [showDeleteAllConfirmation, setShowDeleteAllConfirmation] =
    useState(false);

  return {
    chatToDelete,
    setChatToDelete,
    chatToRename,
    setChatToRename,
    newChatTitle,
    setNewChatTitle,
    showDeleteAllConfirmation,
    setShowDeleteAllConfirmation,
  };
}
