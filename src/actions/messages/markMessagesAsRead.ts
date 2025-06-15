"use server";

import { getUserId } from "@/actions/users/getUserId";
import { messagesTable, generateConversationId } from "@/db/schema";
import { db } from "@/services/db";
import { and, eq } from "drizzle-orm";

export interface MarkMessagesAsReadArgs {
  otherUserId: string;
}

export const markMessagesAsRead = async ({
  otherUserId,
}: MarkMessagesAsReadArgs) => {
  const decodedOtherUserId = decodeURIComponent(otherUserId);

  const userId = await getUserId();

  if (!userId) {
    throw new Error("Must be authenticated to mark messages as read");
  }

  const conversationId = generateConversationId(userId, decodedOtherUserId);

  const now = new Date();

  await db
    .update(messagesTable)
    .set({
      isRead: true,
      readAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(messagesTable.conversationId, conversationId),
        eq(messagesTable.recipientId, userId),
        eq(messagesTable.isRead, false)
      )
    );
};
