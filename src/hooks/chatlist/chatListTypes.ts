import { SavedChat } from "@/types/chat";

export interface ChatListManagementProps {
  currentSpace: string | null;
  isAuthenticated: boolean | null;
  onBackgroundCreateSuccess?: (chatId: string) => void;
  onBackgroundCreateError?: (chatId: string, error: string) => void;
  onBackgroundUpdateSuccess?: (chatId: string) => void;
  onBackgroundUpdateError?: (chatId: string, error: string) => void;
  onBackgroundDeleteSuccess?: (chatId: string) => void;
  onBackgroundDeleteError?: (chatId: string, error: string) => void;
}

export interface ChatState {
  savedChats: SavedChat[];
  currentChatId: string | null;
  isInitialized: boolean;
}

export interface ChatSyncState {
  pendingPushIds: Set<string>;
  pushDebounceTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  pendingChatUpdatesRef: React.MutableRefObject<Map<string, SavedChat>>;
}

export interface ChatDialogsState {
  chatToDelete: string | null;
  chatToRename: string | null;
  newChatTitle: string;
  showDeleteAllConfirmation: boolean;
}
