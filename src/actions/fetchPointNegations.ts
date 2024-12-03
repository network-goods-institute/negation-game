"use server";

import { db } from "@/services/db";
import { pointsWithStatsView } from "@/db/schema";
import { eq, or, and, ne } from "drizzle-orm";
import { negationsTable } from "@/db/tables/negationsTable";

export type NegationResult = {
  id: number;
  content: string;
  createdAt: Date;
  cred: number;
  amountSupporters: number;
  amountNegations: number;
  negationsCred: number;
}

export const fetchPointNegations = async (pointId: number): Promise<NegationResult[]> => {
  const results = await db
    .selectDistinct({
      id: pointsWithStatsView.id,
      content: pointsWithStatsView.content,
      createdAt: pointsWithStatsView.createdAt,
      cred: pointsWithStatsView.cred,
      amountSupporters: pointsWithStatsView.amountSupporters,
      amountNegations: pointsWithStatsView.amountNegations,
      negationsCred: pointsWithStatsView.negationsCred,
    })
    .from(pointsWithStatsView)
    .innerJoin(
      negationsTable,
      or(
        eq(negationsTable.newerPointId, pointsWithStatsView.id),
        eq(negationsTable.olderPointId, pointsWithStatsView.id)
      )
    )
    .where(
      and(
        or(
          eq(negationsTable.olderPointId, pointId),
          eq(negationsTable.newerPointId, pointId)
        ),
        ne(pointsWithStatsView.id, pointId)
      )
    );

  return results;
};
