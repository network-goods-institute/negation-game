"use server";

import { db } from "@/services/db";
import { pointsWithDetailsView, restakesTable } from "@/db/schema";
import { eq, or, and, ne } from "drizzle-orm";
import { negationsTable } from "@/db/tables/negationsTable";
import { getUserId } from "@/actions/getUserId";

export type NegationResult = {
  id: number;
  content: string;
  createdAt: Date;
  cred: number;
  amountSupporters: number;
  amountNegations: number;
  negationsCred: number;
  restake: {
    id: number;
    amount: number;
    active: boolean;
  } | null;
}

export const fetchPointNegations = async (pointId: number): Promise<NegationResult[]> => {
  const userId = await getUserId();

  const results = await db
    .selectDistinct({
      id: pointsWithDetailsView.pointId,
      content: pointsWithDetailsView.content,
      createdAt: pointsWithDetailsView.createdAt,
      cred: pointsWithDetailsView.cred,
      amountSupporters: pointsWithDetailsView.amountSupporters,
      amountNegations: pointsWithDetailsView.amountNegations,
      negationsCred: pointsWithDetailsView.negationsCred,
      restake: {
        id: restakesTable.id,
        amount: restakesTable.amount,
        active: restakesTable.active,
      }
    })
    .from(pointsWithDetailsView)
    .innerJoin(
      negationsTable,
      or(
        eq(negationsTable.newerPointId, pointsWithDetailsView.pointId),
        eq(negationsTable.olderPointId, pointsWithDetailsView.pointId)
      )
    )
    .leftJoin(
      restakesTable,
      and(
        eq(restakesTable.pointId, pointId),
        eq(restakesTable.negationId, pointsWithDetailsView.pointId),
        eq(restakesTable.userId, userId ?? ''),
        eq(restakesTable.active, true)
      )
    )
    .where(
      and(
        or(
          eq(negationsTable.olderPointId, pointId),
          eq(negationsTable.newerPointId, pointId)
        ),
        ne(pointsWithDetailsView.pointId, pointId)
      )
    );

  return results;
};
