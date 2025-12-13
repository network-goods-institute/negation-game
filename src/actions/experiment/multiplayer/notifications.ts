"use server";

import { getUserId } from "@/actions/users/getUserId";
import { db } from "@/services/db";
import {
  mpNotificationsTable,
  mpNotificationTypeEnum,
  mpDocsTable,
} from "@/db/schema";
import type {
  InsertMpNotification,
  SelectMpNotification,
} from "@/db/tables/mpNotificationsTable";
import {
  and,
  desc,
  eq,
  inArray,
  isNull,
} from "drizzle-orm";

export type MultiplayerNotificationType = (typeof mpNotificationTypeEnum.enumValues)[number];

export interface GetMultiplayerNotificationsOptions {
  docId?: string;
  unreadOnly?: boolean;
  limit?: number;
}

export type MultiplayerNotificationRecord = SelectMpNotification & {
  docTitle: string | null;
};

export interface MultiplayerNotificationSummary {
  docId: string;
  docTitle: string | null;
  unreadCount: number;
  totalCount: number;
  notifications: Array<{
    type: MultiplayerNotificationType;
    message: string;
  }>;
  latestCreatedAt: Date | null;
}

const defaultActionForType: Record<string, string> = {
  support: "supported",
  negation: "negated",
  objection: "objected to",
  comment: "commented on",
  upvote: "upvoted",
};

export const getMultiplayerNotifications = async (
  options: GetMultiplayerNotificationsOptions = {}
): Promise<MultiplayerNotificationRecord[]> => {
  const userId = await getUserId();
  if (!userId) {
    return [];
  }

  const { docId, unreadOnly = false, limit = 50 } = options;
  const conditions = [eq(mpNotificationsTable.userId, userId)];
  if (docId) {
    conditions.push(eq(mpNotificationsTable.docId, docId));
  }
  if (unreadOnly) {
    conditions.push(isNull(mpNotificationsTable.readAt));
  }

  const rows = await db
    .select({
      id: mpNotificationsTable.id,
      userId: mpNotificationsTable.userId,
      docId: mpNotificationsTable.docId,
      nodeId: mpNotificationsTable.nodeId,
      edgeId: mpNotificationsTable.edgeId,
      type: mpNotificationsTable.type,
      action: mpNotificationsTable.action,
      actorUserId: mpNotificationsTable.actorUserId,
      actorUsername: mpNotificationsTable.actorUsername,
      title: mpNotificationsTable.title,
      content: mpNotificationsTable.content,
      metadata: mpNotificationsTable.metadata,
      readAt: mpNotificationsTable.readAt,
      createdAt: mpNotificationsTable.createdAt,
      docTitle: mpDocsTable.title,
    })
    .from(mpNotificationsTable)
    .leftJoin(mpDocsTable, eq(mpNotificationsTable.docId, mpDocsTable.id))
    .where(and(...conditions))
    .orderBy(desc(mpNotificationsTable.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    docTitle: row.docTitle ?? null,
  }));
};

export const getMultiplayerNotificationSummaries = async (): Promise<
  MultiplayerNotificationSummary[]
> => {
  const userId = await getUserId();
  if (!userId) {
    return [];
  }

  const rows = await db
    .select({
      id: mpNotificationsTable.id,
      docId: mpNotificationsTable.docId,
      docTitle: mpDocsTable.title,
      type: mpNotificationsTable.type,
      action: mpNotificationsTable.action,
      actorUsername: mpNotificationsTable.actorUsername,
      title: mpNotificationsTable.title,
      readAt: mpNotificationsTable.readAt,
      createdAt: mpNotificationsTable.createdAt,
    })
    .from(mpNotificationsTable)
    .leftJoin(mpDocsTable, eq(mpNotificationsTable.docId, mpDocsTable.id))
    .where(eq(mpNotificationsTable.userId, userId))
    .orderBy(desc(mpNotificationsTable.createdAt))
    .limit(120);

  const byDoc = new Map<string, MultiplayerNotificationSummary>();

  for (const row of rows) {
    const existing = byDoc.get(row.docId);
    const entry: MultiplayerNotificationSummary =
      existing ??
      {
        docId: row.docId,
        docTitle: row.docTitle ?? null,
        unreadCount: 0,
        totalCount: 0,
        notifications: [],
        latestCreatedAt: null,
      };

    entry.totalCount += 1;
    if (!row.readAt) {
      entry.unreadCount += 1;
    }
    if (!entry.latestCreatedAt || (row.createdAt && row.createdAt > entry.latestCreatedAt)) {
      entry.latestCreatedAt = row.createdAt ?? null;
    }
    if (entry.notifications.length < 3) {
      const actionLabel =
        row.action || defaultActionForType[row.type] || "updated";
      const actor = row.actorUsername || "Someone";
      const message = `${actor} ${actionLabel} "${row.title}"`;
      entry.notifications.push({
        type: row.type as MultiplayerNotificationType,
        message,
      });
    }

    byDoc.set(row.docId, entry);
  }

  return Array.from(byDoc.values()).sort((a, b) => {
    const aTime = a.latestCreatedAt ? a.latestCreatedAt.getTime() : 0;
    const bTime = b.latestCreatedAt ? b.latestCreatedAt.getTime() : 0;
    return bTime - aTime;
  });
};

export interface CreateMultiplayerNotificationInput
  extends Omit<InsertMpNotification, "id" | "createdAt" | "readAt"> {
  createdAt?: Date;
}

export const createMultiplayerNotification = async (
  input: CreateMultiplayerNotificationInput
) => {
  const { userId, docId, type, title } = input;
  if (!userId || !docId || !type || !title) {
    throw new Error("Missing required notification fields");
  }

  const values: InsertMpNotification = {
    ...input,
    createdAt: input.createdAt ?? new Date(),
  };

  const [row] = await db
    .insert(mpNotificationsTable)
    .values(values)
    .returning();

  return row;
};

export const markMultiplayerNotificationRead = async (notificationId: string) => {
  const userId = await getUserId();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  if (!notificationId) {
    throw new Error("Invalid notification id");
  }

  const [row] = await db
    .update(mpNotificationsTable)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(mpNotificationsTable.id, notificationId),
        eq(mpNotificationsTable.userId, userId),
        isNull(mpNotificationsTable.readAt)
      )
    )
    .returning({ id: mpNotificationsTable.id });

  return row;
};

export const markMultiplayerNotificationsRead = async (notificationIds: string[]) => {
  const userId = await getUserId();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    return { updated: 0 };
  }

  const result = await db
    .update(mpNotificationsTable)
    .set({ readAt: new Date() })
    .where(
      and(
        inArray(mpNotificationsTable.id, notificationIds),
        eq(mpNotificationsTable.userId, userId),
        isNull(mpNotificationsTable.readAt)
      )
    )
    .returning({ id: mpNotificationsTable.id });

  return { updated: result.length };
};
