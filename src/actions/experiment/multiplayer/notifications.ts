"use server";

import { getUserId } from "@/actions/users/getUserId";
import { db } from "@/services/db";
import {
  mpNotificationsTable,
  mpNotificationTypeEnum,
  mpDocsTable,
  usersTable,
} from "@/db/schema";
import { logger } from "@/lib/logger";
import type {
  InsertMpNotification,
  SelectMpNotification,
} from "@/db/tables/mpNotificationsTable";
import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNull,
} from "drizzle-orm";

const shouldLogMpNotifications = process.env.MP_NOTIFICATIONS_DEBUG === "true";

export type MultiplayerNotificationType = (typeof mpNotificationTypeEnum.enumValues)[number];

export interface GetMultiplayerNotificationsOptions {
  docId?: string;
  unreadOnly?: boolean;
  limit?: number;
}

export type MultiplayerNotificationRecord = SelectMpNotification & {
  docTitle: string | null;
  actorAvatarUrl: string | null;
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
  const { docId, unreadOnly = false, limit = 50 } = options;
  const userId = await getUserId();
  if (!userId) {
    logger.warn("mp notifications: missing user id for fetch", {
      docId,
      unreadOnly,
      limit,
    });
    return [];
  }

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
      actorAvatarUrl: usersTable.avatarUrl,
      title: mpNotificationsTable.title,
      content: mpNotificationsTable.content,
      metadata: mpNotificationsTable.metadata,
      readAt: mpNotificationsTable.readAt,
      createdAt: mpNotificationsTable.createdAt,
      docTitle: mpDocsTable.title,
    })
    .from(mpNotificationsTable)
    .leftJoin(mpDocsTable, eq(mpNotificationsTable.docId, mpDocsTable.id))
    .leftJoin(usersTable, eq(usersTable.id, mpNotificationsTable.actorUserId))
    .where(and(...conditions))
    .orderBy(desc(mpNotificationsTable.createdAt))
    .limit(limit);

  if (shouldLogMpNotifications) {
    const typeCounts = rows.reduce<Record<string, number>>((acc, row) => {
      const type = String(row.type);
      acc[type] = (acc[type] ?? 0) + 1;
      return acc;
    }, {});
    const unreadCount = rows.reduce(
      (total, row) => total + (row.readAt ? 0 : 1),
      0
    );
    const latestCreatedAt = rows[0]?.createdAt ?? null;
    logger.info("mp notifications: fetched", {
      userId,
      docId: docId ?? null,
      unreadOnly,
      limit,
      count: rows.length,
      unreadCount,
      typeCounts,
      latestCreatedAt,
    });
  }

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
    logger.warn("mp notifications: missing user id for summaries");
    return [];
  }

  type SummaryAccumulator = MultiplayerNotificationSummary & {
    grouped: Map<
      string,
      {
        type: MultiplayerNotificationType;
        title: string;
        actionLabel: string;
        actors: Set<string>;
        actorCounts: Map<string, number>;
        count: number;
        hasUnread: boolean;
        latestCreatedAt: Date | null;
      }
    >;
  };

  const rows = await db
    .select({
      id: mpNotificationsTable.id,
      docId: mpNotificationsTable.docId,
      docTitle: mpDocsTable.title,
      type: mpNotificationsTable.type,
      action: mpNotificationsTable.action,
      actorUsername: mpNotificationsTable.actorUsername,
      actorAvatarUrl: usersTable.avatarUrl,
      title: mpNotificationsTable.title,
      readAt: mpNotificationsTable.readAt,
      createdAt: mpNotificationsTable.createdAt,
    })
    .from(mpNotificationsTable)
    .leftJoin(mpDocsTable, eq(mpNotificationsTable.docId, mpDocsTable.id))
    .leftJoin(usersTable, eq(usersTable.id, mpNotificationsTable.actorUserId))
    .where(eq(mpNotificationsTable.userId, userId))
    .orderBy(desc(mpNotificationsTable.createdAt))
    .limit(120);

  if (shouldLogMpNotifications) {
    logger.info("mp notifications: summary fetch", {
      userId,
      count: rows.length,
    });
  }

  const byDoc = new Map<string, SummaryAccumulator>();

const formatActorSummary = (
  actors: string[],
  totalCount: number,
  actorCounts: Map<string, number>
) => {
  const names = actors.filter(Boolean);
  const actorCount = names.length;
  if (actorCount === 0) {
    return totalCount > 1 ? `${totalCount} people` : "Someone";
  }
  if (actorCount === 1) {
    const [name] = names;
    const repeats = actorCounts.get(name) ?? totalCount;
    if (repeats > 1) return `${name} (${repeats} times)`;
    return name;
  }
  if (actorCount === 2) {
    if (totalCount > actorCount) {
      return `${names[0]} and ${names[1]} (${totalCount} actions)`;
    }
    return `${names[0]} and ${names[1]}`;
  }
  const remainder = actorCount - 2;
  const suffix =
    totalCount > actorCount ? ` (${totalCount} actions)` : "";
  return `${names[0]}, ${names[1]} and ${remainder} other${remainder === 1 ? "" : "s"}${suffix}`;
};

  for (const row of rows) {
    const existing = byDoc.get(row.docId);
    const entry =
      existing ??
      {
        docId: row.docId,
        docTitle: row.docTitle ?? null,
        unreadCount: 0,
        totalCount: 0,
        notifications: [],
        latestCreatedAt: null,
        grouped: new Map<
          string,
          {
            type: MultiplayerNotificationType;
            title: string;
            actionLabel: string;
            actors: Set<string>;
            actorCounts: Map<string, number>;
            count: number;
            hasUnread: boolean;
            latestCreatedAt: Date | null;
          }
        >(),
      };

    entry.totalCount += 1;
    if (!row.readAt) {
      entry.unreadCount += 1;
    }
    if (!entry.latestCreatedAt || (row.createdAt && row.createdAt > entry.latestCreatedAt)) {
      entry.latestCreatedAt = row.createdAt ?? null;
    }

    const actionLabel = row.action || defaultActionForType[row.type] || "updated";
    const groupKey = `${row.type}|${row.title || ""}`;
    const group =
      entry.grouped.get(groupKey) ||
      {
        type: row.type as MultiplayerNotificationType,
        title: row.title,
        actionLabel,
        actors: new Set<string>(),
        actorCounts: new Map<string, number>(),
        count: 0,
        hasUnread: false,
        latestCreatedAt: null,
      };

    group.count += 1;
    if (row.actorUsername) {
      group.actors.add(row.actorUsername);
      const prev = group.actorCounts.get(row.actorUsername) ?? 0;
      group.actorCounts.set(row.actorUsername, prev + 1);
    }
    if (!row.readAt) {
      group.hasUnread = true;
    }
    if (!group.latestCreatedAt || (row.createdAt && row.createdAt > group.latestCreatedAt)) {
      group.latestCreatedAt = row.createdAt ?? null;
    }
    entry.grouped.set(groupKey, group);

    byDoc.set(row.docId, entry);
  }

  const summaries = Array.from(byDoc.values()).map(({ grouped, ...entry }) => {
    const sortedGroups = Array.from(grouped.values()).sort((a, b) => {
      if (a.hasUnread !== b.hasUnread) {
        return a.hasUnread ? -1 : 1;
      }
      const aTime = a.latestCreatedAt ? a.latestCreatedAt.getTime() : 0;
      const bTime = b.latestCreatedAt ? b.latestCreatedAt.getTime() : 0;
      return bTime - aTime;
    });
    const notifications = sortedGroups.slice(0, 3).map((group) => {
      const actorSummary = formatActorSummary(
        Array.from(group.actors),
        group.count,
        group.actorCounts
      );
      const message = `${actorSummary} ${group.actionLabel} "${group.title}"`;
      return {
        type: group.type,
        message,
      };
    });
    return {
      ...entry,
      notifications,
    };
  });

  return summaries.sort((a, b) => {
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
    logger.warn("mp notifications: missing fields on create", {
      hasUserId: Boolean(userId),
      hasDocId: Boolean(docId),
      type: type ?? null,
      hasTitle: Boolean(title),
      nodeId: input.nodeId ?? null,
      edgeId: input.edgeId ?? null,
      actorUserId: input.actorUserId ?? null,
      action: input.action ?? null,
    });
    throw new Error("Missing required notification fields");
  }
  const createdAt = input.createdAt ?? new Date();
  const metadata =
    input.metadata && typeof input.metadata === "object"
      ? input.metadata
      : undefined;

  const dedupeWindowMs = 5 * 60 * 1000;
  const since = new Date(createdAt.getTime() - dedupeWindowMs);

  const dedupeConditions = [
    eq(mpNotificationsTable.userId, userId),
    eq(mpNotificationsTable.docId, docId),
    eq(mpNotificationsTable.type, type),
    gte(mpNotificationsTable.createdAt, since),
  ];
  if (input.nodeId) {
    dedupeConditions.push(eq(mpNotificationsTable.nodeId, input.nodeId));
  }
  if (input.edgeId) {
    dedupeConditions.push(eq(mpNotificationsTable.edgeId, input.edgeId));
  }
  if (input.actorUserId) {
    dedupeConditions.push(eq(mpNotificationsTable.actorUserId, input.actorUserId));
  }
  if (input.action) {
    dedupeConditions.push(eq(mpNotificationsTable.action, input.action));
  }

  try {
    const recent = await db
      .select({
        id: mpNotificationsTable.id,
        createdAt: mpNotificationsTable.createdAt,
      })
      .from(mpNotificationsTable)
      .where(and(...dedupeConditions))
      .orderBy(desc(mpNotificationsTable.createdAt))
      .limit(1);
    if (recent[0]) {
      logger.info("mp notifications: deduped", {
        id: recent[0].id,
        userId,
        docId,
        type,
        nodeId: input.nodeId ?? null,
        edgeId: input.edgeId ?? null,
        actorUserId: input.actorUserId ?? null,
        action: input.action ?? null,
      });
      return recent[0];
    }
  } catch (error) {
    logger.error("Notification dedupe check failed", error);
  }

  const values: InsertMpNotification = {
    ...input,
    metadata,
    createdAt,
  };

  let row;
  try {
    [row] = await db.insert(mpNotificationsTable).values(values).returning();
  } catch (error) {
    logger.error("mp notifications: insert failed", {
      error,
      userId,
      docId,
      type,
      nodeId: values.nodeId ?? null,
      edgeId: values.edgeId ?? null,
      actorUserId: values.actorUserId ?? null,
      action: values.action ?? null,
    });
    // Retry once without metadata if payload is too large
    try {
      const sanitized: InsertMpNotification = {
        ...values,
        metadata: undefined,
      };
      [row] = await db.insert(mpNotificationsTable).values(sanitized).returning();
    } catch (inner) {
      logger.error("mp notifications: insert failed without metadata", {
        error: inner,
        userId,
        docId,
        type,
        nodeId: values.nodeId ?? null,
        edgeId: values.edgeId ?? null,
        actorUserId: values.actorUserId ?? null,
        action: values.action ?? null,
      });
      throw inner;
    }
  }

  logger.info("mp notifications: created", {
    id: row?.id ?? null,
    userId,
    docId,
    type,
    nodeId: values.nodeId ?? null,
    edgeId: values.edgeId ?? null,
    actorUserId: values.actorUserId ?? null,
    action: values.action ?? null,
  });

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
