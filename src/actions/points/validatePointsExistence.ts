"use server";

import { db } from "@/services/db";
import { pointsTable } from "@/db/tables/pointsTable";
import { inArray, eq, and } from "drizzle-orm";

export const validatePointsExistence = async (pointIds: number[]): Promise<Set<number>> => {
  if (pointIds.length === 0) {
    return new Set();
  }

  const existingPoints = await db
    .select({ id: pointsTable.id })
    .from(pointsTable)
    .where(
      and(
        inArray(pointsTable.id, pointIds),
        eq(pointsTable.isActive, true)
      )
    );

  return new Set(existingPoints.map(point => point.id));
};