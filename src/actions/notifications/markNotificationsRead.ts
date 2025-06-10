"use server";

import { getUserId } from "@/actions/users/getUserId";
import { notificationsTable } from "@/db/schema";
import { db } from "@/services/db";
import { eq, and, isNull, inArray } from "drizzle-orm";

export const markNotificationRead = async (notificationId: string) => {
  const userId = await getUserId();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  await db
    .update(notificationsTable)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notificationsTable.id, notificationId),
        eq(notificationsTable.userId, userId),
        isNull(notificationsTable.readAt)
      )
    );
};

export const markAllNotificationsRead = async () => {
  const userId = await getUserId();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  await db
    .update(notificationsTable)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notificationsTable.userId, userId),
        isNull(notificationsTable.readAt)
      )
    );
};

export const markNotificationsRead = async (notificationIds: string[]) => {
  const userId = await getUserId();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  if (notificationIds.length === 0) {
    return;
  }

  await db
    .update(notificationsTable)
    .set({ readAt: new Date() })
    .where(
      and(
        inArray(notificationsTable.id, notificationIds),
        eq(notificationsTable.userId, userId),
        isNull(notificationsTable.readAt)
      )
    );
};
