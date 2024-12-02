"use server";

import { db } from "@/services/db";
import { pointsWithStatsView } from "@/db/schema";
import { eq } from "drizzle-orm";
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
    .select({
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
      eq(negationsTable.newerPointId, pointsWithStatsView.id)
    )
    .where(eq(negationsTable.olderPointId, pointId));

  return results;
};
