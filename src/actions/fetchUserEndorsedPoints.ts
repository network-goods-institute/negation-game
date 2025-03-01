"use server";

import { getSpace } from "@/actions/getSpace";
import { getUserId } from "@/actions/getUserId";
import {
  endorsementsTable,
  pointsWithDetailsView,
  effectiveRestakesView,
  doubtsTable,
  usersTable,
} from "@/db/schema";
import { addFavor } from "@/db/utils/addFavor";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { and, eq, inArray, sql } from "drizzle-orm";

export type UserEndorsedPoint = {
  pointId: number;
  content: string;
  createdAt: Date;
  createdBy: string;
  cred: number;
  amountSupporters: number;
  amountNegations: number;
  negationsCred: number;
  favor: number;
  space: string | null;
  endorsedCred: number;
  viewerCred: number;
  negationIds: number[];
  restakesByPoint: number;
  slashedAmount: number;
  doubtedAmount: number;
  totalRestakeAmount: number;
  doubt?: {
    id: number;
    amount: number;
    userAmount: number;
    isUserDoubt: boolean;
  } | null;
};

export const fetchUserEndorsedPoints = async (
  username?: string
): Promise<UserEndorsedPoint[] | null> => {
  const viewerId = await getUserId();
  if (!viewerId) return [];

  const space = await getSpace();

  // If no username provided, use the current user's ID
  let targetUserId = viewerId;

  // If username provided, look up the user
  if (username) {
    const user = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);

    if (user.length === 0) return null;
    targetUserId = user[0].id;
  }

  // First get all points endorsed by the target user
  const endorsedPointIds = await db
    .select({ pointId: endorsementsTable.pointId })
    .from(endorsementsTable)
    .where(
      and(
        eq(endorsementsTable.userId, targetUserId),
        eq(endorsementsTable.space, space)
      )
    );

  if (endorsedPointIds.length === 0) return [];

  // Extract just the IDs into an array
  const pointIds = endorsedPointIds.map((e) => e.pointId);

  // Then fetch the full details for those points
  return db
    .select({
      ...getColumns(pointsWithDetailsView),
      endorsedCred: sql<number>`
        COALESCE((
          SELECT SUM(${endorsementsTable.cred})
          FROM ${endorsementsTable}
          WHERE ${endorsementsTable.pointId} = ${pointsWithDetailsView.pointId}
            AND ${endorsementsTable.userId} = ${targetUserId}
        ), 0)
      `.mapWith(Number),
      viewerCred: sql<number>`
        COALESCE((
          SELECT SUM(${endorsementsTable.cred})
          FROM ${endorsementsTable}
          WHERE ${endorsementsTable.pointId} = ${pointsWithDetailsView.pointId}
            AND ${endorsementsTable.userId} = ${viewerId}
        ), 0)
      `.mapWith(Number),
      restakesByPoint: sql<number>`
        COALESCE((
          SELECT SUM(er1.amount)
          FROM ${effectiveRestakesView} AS er1
          WHERE er1.point_id = ${pointsWithDetailsView.pointId}
            AND er1.slashed_amount < er1.amount
        ), 0)
      `.mapWith(Number),
      slashedAmount: sql<number>`
        COALESCE((
          SELECT SUM(er1.slashed_amount)
          FROM ${effectiveRestakesView} AS er1
          WHERE er1.point_id = ${pointsWithDetailsView.pointId}
        ), 0)
      `.mapWith(Number),
      doubtedAmount: sql<number>`
        COALESCE((
          SELECT SUM(er1.doubted_amount)
          FROM ${effectiveRestakesView} AS er1
          WHERE er1.point_id = ${pointsWithDetailsView.pointId}
        ), 0)
      `.mapWith(Number),
      totalRestakeAmount: sql<number>`
        COALESCE((
          SELECT SUM(CASE 
            WHEN er.slashed_amount >= er.amount THEN 0
            ELSE er.amount
          END)
          FROM ${effectiveRestakesView} AS er
          WHERE er.point_id = ${pointsWithDetailsView.pointId}
          AND er.negation_id = ANY(${pointsWithDetailsView.negationIds})
        ), 0)
      `.mapWith(Number),
      doubt: {
        id: doubtsTable.id,
        amount: doubtsTable.amount,
        userAmount: doubtsTable.amount,
        isUserDoubt: sql<boolean>`${doubtsTable.userId} = ${viewerId}`.as(
          "is_user_doubt"
        ),
      },
    })
    .from(pointsWithDetailsView)
    .leftJoin(
      doubtsTable,
      and(
        eq(doubtsTable.pointId, pointsWithDetailsView.pointId),
        eq(doubtsTable.userId, viewerId)
      )
    )
    .where(inArray(pointsWithDetailsView.pointId, pointIds))
    .then((points) => addFavor(points));
};
