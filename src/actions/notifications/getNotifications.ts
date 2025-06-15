"use server";

import { getUserId } from "@/actions/users/getUserId";
import { notificationsTable, usersTable } from "@/db/schema";
import { db } from "@/services/db";
import { eq, desc, isNull, and } from "drizzle-orm";
import type { Notification } from "@/db/tables/notificationsTable";

export interface GetNotificationsOptions {
  limit?: number;
  unreadOnly?: boolean;
}

export const getNotifications = async (
  options: GetNotificationsOptions = {}
): Promise<(Notification & { sourceUser?: { username: string } })[]> => {
  const userId = await getUserId();

  if (!userId) {
    return [];
  }

  const { limit = 50, unreadOnly = false } = options;

  const whereConditions = [eq(notificationsTable.userId, userId)];

  if (unreadOnly) {
    whereConditions.push(isNull(notificationsTable.readAt));
  }

  const notifications = await db
    .select({
      id: notificationsTable.id,
      userId: notificationsTable.userId,
      type: notificationsTable.type,
      sourceUserId: notificationsTable.sourceUserId,
      sourceEntityId: notificationsTable.sourceEntityId,
      sourceEntityType: notificationsTable.sourceEntityType,
      title: notificationsTable.title,
      content: notificationsTable.content,
      aiSummary: notificationsTable.aiSummary,
      metadata: notificationsTable.metadata,
      readAt: notificationsTable.readAt,
      createdAt: notificationsTable.createdAt,
      space: notificationsTable.space,
      sourceUser: {
        username: usersTable.username,
      },
    })
    .from(notificationsTable)
    .leftJoin(usersTable, eq(notificationsTable.sourceUserId, usersTable.id))
    .where(and(...whereConditions))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(limit);

  return notifications.map((notif) => ({
    ...notif,
    sourceUser: notif.sourceUser?.username
      ? { username: notif.sourceUser.username }
      : undefined,
  }));
};
