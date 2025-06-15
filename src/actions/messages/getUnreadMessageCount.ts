"use server";

import { getUserId } from "@/actions/users/getUserId";
import { messagesTable } from "@/db/schema";
import { db } from "@/services/db";
import { and, eq, sql } from "drizzle-orm";

export const getUnreadMessageCount = async () => {
  const userId = await getUserId();

  if (!userId) {
    return 0;
  }

  const result = await db
    .select({
      count: sql<number>`COUNT(*)`.mapWith(Number),
    })
    .from(messagesTable)
    .where(
      and(
        eq(messagesTable.recipientId, userId),
        eq(messagesTable.isRead, false),
        eq(messagesTable.isDeleted, false)
      )
    );

  return result[0]?.count || 0;
};
