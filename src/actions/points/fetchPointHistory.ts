"use server";

import { pointHistoryTable, usersTable } from "@/db/schema";
import { db } from "@/services/db";
import { desc, eq } from "drizzle-orm";

export interface PointHistoryEntry {
  id: number;
  action: "created" | "edited" | "deleted" | "restored";
  previousContent: string | null;
  newContent: string;
  createdAt: Date;
  user: {
    id: string;
    username: string | null;
  };
}

export const fetchPointHistory = async (
  pointId: number,
  limit: number = 50,
  offset: number = 0
): Promise<PointHistoryEntry[]> => {
  const history = await db
    .select({
      id: pointHistoryTable.id,
      action: pointHistoryTable.action,
      previousContent: pointHistoryTable.previousContent,
      newContent: pointHistoryTable.newContent,
      createdAt: pointHistoryTable.createdAt,
      userId: pointHistoryTable.userId,
      username: usersTable.username,
    })
    .from(pointHistoryTable)
    .leftJoin(usersTable, eq(pointHistoryTable.userId, usersTable.id))
    .where(eq(pointHistoryTable.pointId, pointId))
    .orderBy(desc(pointHistoryTable.createdAt))
    .limit(limit)
    .offset(offset);

  return history.map((entry) => ({
    id: entry.id,
    action: entry.action,
    previousContent: entry.previousContent,
    newContent: entry.newContent,
    createdAt: entry.createdAt,
    user: {
      id: entry.userId,
      username: entry.username,
    },
  }));
};