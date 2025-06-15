export interface Message {
  id: string;
  content: string;
  senderId: string;
  recipientId: string;
  isRead: boolean;
  readAt: Date | null;
  isDeleted: boolean;
  isEdited: boolean;
  editedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  senderUsername: string;
}

export interface Conversation {
  conversationId: string;
  otherUserId: string;
  otherUsername: string;
  lastMessageId: string;
  lastMessageContent: string;
  lastMessageSenderId: string;
  lastMessageCreatedAt: Date;
  lastMessageIsRead: boolean;
  unreadCount: number;
}
