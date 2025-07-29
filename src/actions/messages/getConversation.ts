"use server";

import { getUserId } from "@/actions/users/getUserId";
import { messagesTable, usersTable, generateConversationId } from "@/db/schema";
import { db } from "@/services/db";
import { and, eq, or, desc } from "drizzle-orm";

export interface GetConversationArgs {
  otherUserId: string;
  spaceId: string;
  limit?: number;
  offset?: number;
}

export const getConversation = async ({
  otherUserId,
  spaceId,
  limit = 50,
  offset = 0,
}: GetConversationArgs) => {
  const decodedOtherUserId = decodeURIComponent(otherUserId);
  const userId = await getUserId();

  if (!userId) {
    throw new Error("Must be authenticated to view messages");
  }

  const conversationId = generateConversationId(
    userId,
    decodedOtherUserId,
    spaceId
  );

  try {
    const messages = await db
      .select({
        id: messagesTable.id,
        sequenceNumber: messagesTable.sequenceNumber,
        content: messagesTable.content,
        senderId: messagesTable.senderId,
        recipientId: messagesTable.recipientId,
        isRead: messagesTable.isRead,
        readAt: messagesTable.readAt,
        isDeleted: messagesTable.isDeleted,
        isEdited: messagesTable.isEdited,
        editedAt: messagesTable.editedAt,
        createdAt: messagesTable.createdAt,
        updatedAt: messagesTable.updatedAt,
        senderUsername: usersTable.username,
      })
      .from(messagesTable)
      .innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
      .where(
        and(
          eq(messagesTable.conversationId, conversationId),
          eq(messagesTable.space, spaceId),
          or(
            eq(messagesTable.senderId, userId),
            eq(messagesTable.recipientId, userId)
          )
        )
      )
      .orderBy(desc(messagesTable.sequenceNumber))
      .limit(limit)
      .offset(offset);

    return messages.reverse();
  } catch (error) {
    throw error;
  }
};
