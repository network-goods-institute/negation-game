"use server";

import { getSpace } from "@/actions/spaces/getSpace";
import { getUserId } from "@/actions/users/getUserId";
import {
  pointsWithDetailsView,
  effectiveRestakesView,
  slashesTable,
  doubtsTable,
  restakesTable,
  negationsTable,
  endorsementsTable,
  pointsTable,
  objectionsTable,
} from "@/db/schema";
import { addFavor } from "@/db/utils/addFavor";
import { eq, or, and, ne, sql } from "drizzle-orm";
import { db } from "@/services/db";

export type NegationResult = {
  pointId: number;
  content: string;
  createdAt: Date;
  createdBy: string;
  cred: number;
  amountSupporters: number;
  amountNegations: number;
  negationsCred: number;
  space: string | null;
  viewerCred: number;
  negationIds: number[];
  restake: {
    id: number | null;
    amount: number | null;
    originalAmount: number | null;
    slashedAmount: number | null;
    doubtedAmount: number | null;
    totalRestakeAmount: number | null;
    isOwner: boolean;
  } | null;
  slash: {
    id: number;
    amount: number;
  } | null;
  doubt: {
    id: number;
    amount: number;
    userAmount: number;
    isUserDoubt: boolean;
  } | null;
  favor: number;
  restakesByPoint: number;
  slashedAmount: number;
  doubtedAmount: number;
  totalRestakeAmount: number;
  isCommand: boolean;
  pinnedByCommandId: number | null;
  isObjection: boolean;
  objectionTargetId: number | null;
};

export const fetchPointNegations = async (
  pointId: number
): Promise<NegationResult[]> => {
  const userId = await getUserId();
  const space = await getSpace();

  const results = await db
    .selectDistinct({
      pointId: pointsWithDetailsView.pointId,
      content: pointsWithDetailsView.content,
      createdAt: pointsWithDetailsView.createdAt,
      createdBy: pointsWithDetailsView.createdBy,
      cred: pointsWithDetailsView.cred,
      amountSupporters: pointsWithDetailsView.amountSupporters,
      amountNegations: pointsWithDetailsView.amountNegations,
      negationsCred: pointsWithDetailsView.negationsCred,
      space: pointsWithDetailsView.space,
      isCommand: pointsWithDetailsView.isCommand,
      isObjection: sql<boolean>`EXISTS (
        SELECT 1 FROM ${objectionsTable}
        WHERE ${objectionsTable.objectionPointId} = ${pointsWithDetailsView.pointId}
      )`.mapWith(Boolean),
      objectionTargetId: sql<number | null>`(
        SELECT ${objectionsTable.targetPointId} FROM ${objectionsTable}
        WHERE ${objectionsTable.objectionPointId} = ${pointsWithDetailsView.pointId}
        LIMIT 1
      )`.mapWith((v) => v),
      negationIds: pointsWithDetailsView.negationIds,
      viewerCred: userId
        ? sql<number>`
        COALESCE((
          SELECT SUM(${endorsementsTable.cred})
          FROM ${endorsementsTable}
          WHERE ${endorsementsTable.pointId} = ${pointsWithDetailsView.pointId}
            AND ${endorsementsTable.userId} = ${userId}
        ), 0)
      `.mapWith(Number)
        : sql<number>`0`.mapWith(Number),
      restakesByPoint: sql<number>`
        COALESCE((
          SELECT SUM(er.amount)
          FROM ${effectiveRestakesView} AS er
          WHERE er.point_id = ${pointsWithDetailsView.pointId}
          AND er.slashed_amount < er.amount
        ), 0)
      `.mapWith(Number),
      restake: sql<any>`
        COALESCE((
          SELECT jsonb_build_object(
            'id', r.id,
            'amount', er.effective_amount,
            'originalAmount', er.amount,
            'slashedAmount', er.slashed_amount,
            'doubtedAmount', COALESCE(er.doubted_amount, 0),
            'isOwner', er.user_id = ${userId}
          )
          FROM ${effectiveRestakesView} AS er
          INNER JOIN ${restakesTable} AS r 
          ON r.point_id = er.point_id 
          AND r.negation_id = er.negation_id
          WHERE er.point_id = ${pointId}
          AND er.negation_id = ${pointsWithDetailsView.pointId}
          AND er.user_id = ${userId}
          AND er.slashed_amount < er.amount
          LIMIT 1
        ), NULL)`.as("restake"),
      slashedAmount: sql<number>`
        COALESCE((
          SELECT SUM(er.slashed_amount)
          FROM ${effectiveRestakesView} AS er
          WHERE er.point_id = ${pointsWithDetailsView.pointId}
        ), 0)
      `.mapWith(Number),
      doubtedAmount: sql<number>`
        COALESCE((
          SELECT SUM(er.doubted_amount)
          FROM ${effectiveRestakesView} AS er
          WHERE er.point_id = ${pointsWithDetailsView.pointId}
        ), 0)
      `.mapWith(Number),
      slash: sql<any>`
        COALESCE((
          SELECT jsonb_build_object(
            'id', s.id,
            'amount', s.amount
          )
          FROM ${slashesTable} AS s
          WHERE s.point_id = ${pointId}
          AND s.negation_id = ${pointsWithDetailsView.pointId}
          AND s.user_id = ${userId}
          LIMIT 1
        ), NULL)`,
      doubt: sql<any>`
        COALESCE((
          SELECT jsonb_build_object(
            'id', d.id,
            'amount', d.amount,
            'userAmount', d.amount,
            'isUserDoubt', d.user_id = ${userId}
          )
          FROM ${doubtsTable} AS d
          WHERE d.point_id = ${pointId}
          AND d.negation_id = ${pointsWithDetailsView.pointId}
          AND d.user_id = ${userId}
          LIMIT 1
        ), NULL)`,
      totalRestakeAmount: sql<number>`
        COALESCE((
          SELECT SUM(CASE 
            WHEN er.slashed_amount >= er.amount THEN 0
            ELSE er.amount
          END)
          FROM ${effectiveRestakesView} AS er
          WHERE er.point_id = ${pointId}
          AND er.negation_id = ${pointsWithDetailsView.pointId}
        ), 0)
      `
        .mapWith(Number)
        .as("total_restake_amount"),
      pinnedByCommandId: sql<number | null>`
        COALESCE((
          SELECT p.id
          FROM ${pointsTable} p
          WHERE p.is_command = true 
          AND p.space = ${space}
          AND p.content LIKE '/pin %'
          ORDER BY p.created_at DESC
          LIMIT 1
        ), NULL)
      `.mapWith((x) => x as number | null),
    })
    .from(pointsWithDetailsView)
    .innerJoin(
      negationsTable,
      or(
        eq(negationsTable.newerPointId, pointsWithDetailsView.pointId),
        eq(negationsTable.olderPointId, pointsWithDetailsView.pointId)
      )
    )
    .where(
      and(
        or(
          eq(negationsTable.olderPointId, pointId),
          eq(negationsTable.newerPointId, pointId)
        ),
        eq(pointsWithDetailsView.space, space)
      )
    )
    .then((points) => {
      return addFavor(points);
    });

  return results;
};
