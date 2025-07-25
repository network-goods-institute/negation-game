import {
  ChatMessage,
  SavedChat,
  ChatRationale,
  DiscourseMessage,
  ChatSettings,
  ViewpointGraph,
} from "@/types/chat";
import { PointInSpace } from "@/actions/points/fetchAllSpacePoints";

export interface UseChatStateProps {
  currentChatId: string | null;
  currentSpace: string | null;
  isAuthenticated: boolean;
  settings: ChatSettings;
  allPointsInSpace: PointInSpace[];
  ownedPointIds: Set<number>;
  endorsedPointIds: Set<number>;
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
