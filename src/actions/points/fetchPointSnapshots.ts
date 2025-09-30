"use server";

import { db } from "@/services/db";
import { pointsTable } from "@/db/tables/pointsTable";
import { usersTable } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export interface PointSnapshot {
  id: number;
  createdBy: string;
  content: string;
  space: string;
  createdAt: Date | null;
  authorUsername: string | null;
}

export const fetchPointSnapshots = async (
  pointIds: number[]
): Promise<PointSnapshot[]> => {
  if (pointIds.length === 0) {
    return [];
  }

  const uniqueIds = Array.from(new Set(pointIds));

  const rows = await db
    .select({
      id: pointsTable.id,
      createdBy: pointsTable.createdBy,
      content: pointsTable.content,
      space: pointsTable.space,
      createdAt: pointsTable.createdAt,
      authorUsername: usersTable.username,
    })
    .from(pointsTable)
    .innerJoin(usersTable, eq(usersTable.id, pointsTable.createdBy))
    .where(
      and(
        inArray(pointsTable.id, uniqueIds),
        eq(pointsTable.isActive, true)
      )
    );

  return rows;
};
