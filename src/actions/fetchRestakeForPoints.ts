"use server";

import { getUserId } from "@/actions/getUserId";
import { effectiveRestakesView } from "@/db/schema";
import { db } from "@/services/db";
import { and, eq } from "drizzle-orm";

export const fetchRestakeForPoints = async (pointId: number, negationId: number) => {
  const userId = await getUserId();
  if (!userId) return null;

  return await db
    .select()
    .from(effectiveRestakesView)
    .where(
      and(
        eq(effectiveRestakesView.pointId, pointId),
        eq(effectiveRestakesView.negationId, negationId),
        eq(effectiveRestakesView.userId, userId),
        eq(effectiveRestakesView.isActive, true)
      )
    )
    .limit(1)
    .then(rows => rows[0] ?? null);
}; 