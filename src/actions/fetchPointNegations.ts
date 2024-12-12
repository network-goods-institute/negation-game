"use server";

import { db } from "@/services/db";
import { pointsWithDetailsView, effectiveRestakesView, slashesTable } from "@/db/schema";
import { eq, or, and, ne, sql } from "drizzle-orm";
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
    originalAmount: number;
    slashedAmount: number;
  } | null;
  slash: {
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
        id: effectiveRestakesView.pointId,
        amount: effectiveRestakesView.effectiveAmount,
        active: effectiveRestakesView.isActive,
        originalAmount: effectiveRestakesView.amount,
        slashedAmount: effectiveRestakesView.slashedAmount
      },
      slash: {
        id: slashesTable.id,
        amount: slashesTable.amount,
        active: sql<boolean>`${slashesTable.amount} > 0`.as("slash_active")
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
      effectiveRestakesView,
      and(
        eq(effectiveRestakesView.pointId, pointId),
        eq(effectiveRestakesView.negationId, pointsWithDetailsView.pointId),
        eq(effectiveRestakesView.userId, userId ?? ''),
        eq(effectiveRestakesView.isActive, true)
      )
    )
    .leftJoin(
      slashesTable,
      and(
        eq(slashesTable.pointId, pointId),
        eq(slashesTable.negationId, pointsWithDetailsView.pointId),
        eq(slashesTable.userId, userId ?? '')
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
