"use server";

import { db } from "@/services/db";
import {
  viewpointsTable,
  pointsWithDetailsView,
  objectionsTable,
  doubtsTable,
  endorsementsTable,
  negationsTable,
  effectiveRestakesView,
  slashesTable,
} from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { addFavor } from "@/db/utils/addFavor";
import { getColumns } from "@/db/utils/getColumns";
import { getUserId } from "@/actions/users/getUserId";
import { getSpace } from "@/actions/spaces/getSpace";
import {
  viewerCredSql,
  restakesByPointSql,
  slashedAmountSql,
  doubtedAmountSql,
  totalRestakeAmountSql,
  viewerDoubtSql,
} from "@/actions/utils/pointSqlUtils";
import type { ViewpointGraph } from "@/atoms/viewpointAtoms";

export interface TopicPointData {
  pointId: number;
  content: string;
  cred: number;
  favor: number;
  amountSupporters: number;
  amountNegations: number;
  createdAt: Date;
  isObjection: boolean;
  objectionTargetId: any;
  objectionContextId: any;
  negations: number[];
  negationIds: number[];
  negationsCred: number;
  createdBy: string;
  space: string;
  isCommand: boolean;
  isPinned: boolean;
  pinnedByCommandId: number | null;
  viewerCred: number;
  viewerNegationsCred: number;
  restakesByPoint: any;
  slashedAmount: number;
  doubtedAmount: number;
  totalRestakeAmount: number;
  doubt: any;
  restake?: {
    id: number;
    amount: number;
    originalAmount: number;
    slashedAmount: number;
    doubtedAmount: number;
  } | null;
  slash?: {
    id: number;
    amount: number;
  } | null;
}

export async function fetchTopicPoints(
  topicId: number
): Promise<TopicPointData[]> {
  try {
    const viewerId = await getUserId();
    const space = await getSpace();

    const viewpoints = await db
      .select({
        id: viewpointsTable.id,
        graph: viewpointsTable.graph,
      })
      .from(viewpointsTable)
      .where(eq(viewpointsTable.topicId, topicId));

    const initialPointIds = new Set<number>();
    for (const viewpoint of viewpoints) {
      const graph = viewpoint.graph as ViewpointGraph;
      if (graph?.nodes) {
        for (const node of graph.nodes) {
          if (node.type === "point" && node.data?.pointId) {
            initialPointIds.add(node.data.pointId);
          }
        }
      }
    }

    if (initialPointIds.size === 0) {
      return [];
    }

    const initialPoints = await db
      .select({
        pointId: pointsWithDetailsView.pointId,
        negationIds: pointsWithDetailsView.negationIds,
      })
      .from(pointsWithDetailsView)
      .where(
        and(
          inArray(pointsWithDetailsView.pointId, Array.from(initialPointIds)),
          eq(pointsWithDetailsView.space, space)
        )
      );

    // Expand negations while avoiding parent cycles
    const allPointIds = new Set(initialPointIds);
    const parentChildMap = new Map<number, number>(); // child -> parent

    for (const point of initialPoints) {
      if (point.negationIds && point.negationIds.length > 0) {
        for (const negationId of point.negationIds) {
          // Determine parent-child relationship (older point is parent)
          const olderPointId = Math.min(point.pointId, negationId);
          const newerPointId = Math.max(point.pointId, negationId);

          // Only add negation if it won't create a parent cycle
          // (i.e., don't add if the negation would be a parent of an existing point)
          if (!allPointIds.has(negationId)) {
            const wouldCreateParentCycle =
              negationId === olderPointId && allPointIds.has(newerPointId);
            if (!wouldCreateParentCycle) {
              allPointIds.add(negationId);
            }
          }

          parentChildMap.set(newerPointId, olderPointId);
        }
      }
    }

    // Fetch all points (initial + expanded negations)
    const finalPointIds = Array.from(allPointIds);
    const points = await db
      .select({
        ...getColumns(pointsWithDetailsView),
        isPinned: sql<boolean>`false`.mapWith(Boolean),
        pinnedByCommandId: sql<number | null>`null`.mapWith((val) => val),
        isObjection: sql<boolean>`EXISTS (
          SELECT 1 FROM ${objectionsTable}
          WHERE ${objectionsTable.objectionPointId} = ${pointsWithDetailsView.pointId}
        )`.mapWith(Boolean),
        objectionTargetId: sql<number | null>`(
          SELECT ${objectionsTable.targetPointId} FROM ${objectionsTable}
          WHERE ${objectionsTable.objectionPointId} = ${pointsWithDetailsView.pointId}
          LIMIT 1
        )`.mapWith((v) => v),
        objectionContextId: sql<number | null>`(
          SELECT ${objectionsTable.contextPointId} FROM ${objectionsTable}
          WHERE ${objectionsTable.objectionPointId} = ${pointsWithDetailsView.pointId}
          LIMIT 1
        )`.mapWith((v) => v),
        viewerCred: viewerCredSql(viewerId),
        viewerNegationsCred: viewerId
          ? sql<number>`
              COALESCE((
                SELECT SUM(${endorsementsTable.cred})
                FROM ${endorsementsTable}
                WHERE ${endorsementsTable.userId} = ${viewerId}
                  AND ${endorsementsTable.pointId} IN (
                    SELECT older_point_id FROM ${negationsTable} WHERE newer_point_id = ${pointsWithDetailsView.pointId}
                    UNION
                    SELECT newer_point_id FROM ${negationsTable} WHERE older_point_id = ${pointsWithDetailsView.pointId}
                  )
              ), 0)
            `.mapWith(Number)
          : sql<number>`0`.mapWith(Number),
        restakesByPoint: restakesByPointSql(pointsWithDetailsView),
        slashedAmount: slashedAmountSql(pointsWithDetailsView),
        doubtedAmount: doubtedAmountSql(pointsWithDetailsView),
        totalRestakeAmount: totalRestakeAmountSql,
        doubt: viewerId
          ? viewerDoubtSql(viewerId)
          : {
              id: sql<number | null>`null`.mapWith((v) => v),
              amount: sql<number | null>`null`.mapWith((v) => v),
              userAmount: sql<number>`0`.mapWith(Number),
              isUserDoubt: sql<boolean>`false`.mapWith(Boolean),
            },
        ...(viewerId
          ? {
              restake: {
                id: effectiveRestakesView.pointId,
                amount: sql<number>`
                  CASE 
                    WHEN ${effectiveRestakesView.slashedAmount} >= ${effectiveRestakesView.amount} THEN 0
                    ELSE ${effectiveRestakesView.amount}
                  END
                `.mapWith(Number),
                originalAmount: effectiveRestakesView.amount,
                slashedAmount: effectiveRestakesView.slashedAmount,
                doubtedAmount: effectiveRestakesView.doubtedAmount,
              },
              slash: {
                id: slashesTable.id,
                amount: slashesTable.amount,
              },
            }
          : {}),
      })
      .from(pointsWithDetailsView)
      .leftJoin(
        doubtsTable,
        and(
          eq(doubtsTable.pointId, pointsWithDetailsView.pointId),
          eq(doubtsTable.userId, viewerId ?? "")
        )
      )
      .leftJoin(
        effectiveRestakesView,
        and(
          eq(effectiveRestakesView.pointId, pointsWithDetailsView.pointId),
          eq(effectiveRestakesView.userId, viewerId ?? ""),
          sql`${effectiveRestakesView.slashedAmount} < ${effectiveRestakesView.amount}`
        )
      )
      .leftJoin(
        slashesTable,
        and(
          eq(slashesTable.pointId, pointsWithDetailsView.pointId),
          eq(slashesTable.userId, viewerId ?? "")
        )
      )
      .where(
        and(
          inArray(pointsWithDetailsView.pointId, finalPointIds),
          eq(pointsWithDetailsView.space, space)
        )
      );

    const pointsWithFavor = await addFavor(points);

    const result = pointsWithFavor.map((point) => ({
      pointId: point.pointId,
      content: point.content,
      cred: point.cred,
      favor: point.favor,
      amountSupporters: point.amountSupporters,
      amountNegations: point.amountNegations,
      createdAt: point.createdAt,
      isObjection: point.isObjection,
      objectionTargetId: point.objectionTargetId,
      objectionContextId: point.objectionContextId,
      negations: point.negationIds || [],
      negationIds: point.negationIds || [],
      negationsCred: point.negationsCred || 0,
      createdBy: point.createdBy,
      space: point.space || space,
      isCommand: point.isCommand,
      isPinned: false,
      pinnedByCommandId: null,
      viewerCred: point.viewerCred || 0,
      viewerNegationsCred: point.viewerNegationsCred || 0,
      restakesByPoint: point.restakesByPoint || 0,
      slashedAmount: point.slashedAmount || 0,
      doubtedAmount: point.doubtedAmount || 0,
      totalRestakeAmount: point.totalRestakeAmount || 0,
      doubt: point.doubt || {
        id: null,
        amount: null,
        userAmount: 0,
        isUserDoubt: false,
      },
      restake: (point as any).restake || null,
      slash: (point as any).slash || null,
    }));

    // Ensure unique points
    const uniqueResults = new Map<number, TopicPointData>();
    result.forEach((point) => {
      uniqueResults.set(point.pointId, point);
    });

    return Array.from(uniqueResults.values());
  } catch (error) {
    console.error("fetchTopicPoints: Error occurred:", error);
    throw error;
  }
}
