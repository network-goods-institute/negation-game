"use server";

import { getUserId } from "@/actions/users/getUserId";
import { messagesTable } from "@/db/schema";
import { db } from "@/services/db";
import { and, eq } from "drizzle-orm";

export interface DeleteMessageArgs {
  messageId: string;
}

export const deleteMessage = async ({ messageId }: DeleteMessageArgs) => {
  const userId = await getUserId();

  if (!userId) {
    throw new Error("Must be authenticated to delete messages");
  }

  const updateResult = await db
    .update(messagesTable)
    .set({
      isDeleted: true,
      content: "This message was deleted",
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
      "Message not found or you don't have permission to delete it"
    );
  }

  return updateResult[0].id;
};
