"use server";

import { getUserId } from "@/actions/users/getUserId";
import { messagesTable, usersTable } from "@/db/schema";
import { db } from "@/services/db";
import { and, eq, or, sql, desc } from "drizzle-orm";

export const getConversations = async () => {
  const userId = await getUserId();

  if (!userId) {
    throw new Error("Must be authenticated to view conversations");
  }

  const conversations = await db
    .select({
      conversationId: messagesTable.conversationId,
      otherUserId: sql<string>`
        CASE 
          WHEN ${messagesTable.senderId} = ${userId} THEN ${messagesTable.recipientId}
          ELSE ${messagesTable.senderId}
        END
      `,
      otherUsername: usersTable.username,
      lastMessageId: messagesTable.id,
      lastMessageContent: messagesTable.content,
      lastMessageSenderId: messagesTable.senderId,
      lastMessageCreatedAt: messagesTable.createdAt,
      lastMessageIsRead: messagesTable.isRead,
      unreadCount: sql<number>`
        COALESCE((
          SELECT COUNT(*)
          FROM ${messagesTable} m2
          WHERE m2.conversation_id = ${messagesTable.conversationId}
            AND m2.recipient_id = ${userId}
            AND m2.is_read = false
        ), 0)
      `.mapWith(Number),
    })
    .from(messagesTable)
    .innerJoin(
      usersTable,
      sql`${usersTable.id} = CASE 
        WHEN ${messagesTable.senderId} = ${userId} THEN ${messagesTable.recipientId}
        ELSE ${messagesTable.senderId}
      END`
    )
    .where(
      and(
        or(
          eq(messagesTable.senderId, userId),
          eq(messagesTable.recipientId, userId)
        ),
        sql`${messagesTable.createdAt} = (
          SELECT MAX(m2.created_at)
          FROM ${messagesTable} m2
          WHERE m2.conversation_id = ${messagesTable.conversationId}
            AND m2.is_deleted = false
        )`
      )
    )
    .orderBy(desc(messagesTable.createdAt));

  return conversations;
};
