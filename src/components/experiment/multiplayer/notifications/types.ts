export type MultiplayerNotificationType =
  | "negation"
  | "objection"
  | "support"
  | "comment"
  | "upvote";

export interface MultiplayerBoardNotificationSummary {
  boardId: string;
  boardTitle: string;
  notifications: Array<{
    type: MultiplayerNotificationType;
    message: string;
  }>;
  totalCount?: number;
  unreadCount?: number;
}

export interface MultiplayerNotification {
  id: string;
  ids?: string[];
  boardId: string;
  type: MultiplayerNotificationType;
  userName: string;
  action: string;
  pointTitle: string;
  pointId: string;
  timestamp: string;
  isRead: boolean;
  createdAt?: Date | string | null;
  commentPreview?: string;
  avatarUrls?: (string | undefined)[];
  actorNames?: string[];
  count?: number;
}
