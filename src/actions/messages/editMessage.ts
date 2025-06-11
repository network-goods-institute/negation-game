"use server";

import { getUserId } from "@/actions/users/getUserId";
import { messagesTable } from "@/db/schema";
import { db } from "@/services/db";
import { and, eq } from "drizzle-orm";

export interface EditMessageArgs {
  messageId: string;
  content: string;
}

export const editMessage = async ({ messageId, content }: EditMessageArgs) => {
  const userId = await getUserId();

  if (!userId) {
    throw new Error("Must be authenticated to edit messages");
  }

  if (!content.trim()) {
    throw new Error("Message content cannot be empty");
  }

  const updateResult = await db
    .update(messagesTable)
    .set({
      content: content.trim(),
      isEdited: true,
      editedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(messagesTable.id, messageId),
        eq(messagesTable.senderId, userId),
        eq(messagesTable.isDeleted, false)
      )
    )
    .returning({ id: messagesTable.id });

  if (updateResult.length === 0) {
    throw new Error(
      "Message not found or you don't have permission to edit it"
    );
  }

  return updateResult[0].id;
};
