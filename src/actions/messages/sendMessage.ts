"use server";

import { getUserId } from "@/actions/users/getUserId";
import { messagesTable, generateConversationId } from "@/db/schema";
import { db } from "@/services/db";
import { nanoid } from "nanoid";

export interface SendMessageArgs {
  recipientId: string;
  content: string;
}

export const sendMessage = async ({
  recipientId,
  content,
}: SendMessageArgs) => {
  const decodedRecipientId = decodeURIComponent(recipientId);

  const userId = await getUserId();

  if (!userId) {
    throw new Error("Must be authenticated to send messages");
  }

  if (!content.trim()) {
    throw new Error("Message content cannot be empty");
  }

  if (userId === decodedRecipientId) {
    throw new Error("Cannot send message to yourself");
  }

  const conversationId = generateConversationId(userId, decodedRecipientId);
  const messageId = nanoid();

  const insertData = {
    id: messageId,
    conversationId,
    content: content.trim(),
    senderId: userId,
    recipientId: decodedRecipientId,
    space: "global",
  };

  try {
    const insertResult = await db
      .insert(messagesTable)
      .values(insertData)
      .returning({ id: messagesTable.id });

    return insertResult[0].id;
  } catch (error) {
    throw error;
  }
};
