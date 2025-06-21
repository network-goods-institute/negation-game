"use server";

import { getUserId } from "@/actions/users/getUserId";
import { db } from "@/services/db";
import { and, eq, sql, desc } from "drizzle-orm";
import {
  doubtsTable,
  endorsementsTable,
  restakesTable,
  usersTable,
} from "@/db/schema";

const calculateEarnings = async (userId: string) => {
  const results = await db
    .select({
      doubt_id: doubtsTable.id,
      point_id: doubtsTable.pointId,
      negation_id: doubtsTable.negationId,
      doubt_amount: doubtsTable.amount,
      createdAt: doubtsTable.createdAt,
      hours_since_payout: sql<number>`EXTRACT(EPOCH FROM (NOW() - ${doubtsTable.lastEarningsAt}))/3600`,
      negation_favor: sql<number>`COALESCE((
        SELECT favor 
        FROM current_point_favor
        WHERE point_id = ${doubtsTable.negationId}
      ), 0)`,
      apy: sql<number>`EXP(LN(0.05) + LN(COALESCE((
        SELECT favor 
        FROM current_point_favor
        WHERE point_id = ${doubtsTable.negationId}
      ), 0) + 0.0001))`,
      hourly_rate: sql<number>`(EXP(LN(0.05) + LN(COALESCE((
        SELECT favor 
        FROM current_point_favor
        WHERE point_id = ${doubtsTable.negationId}
      ), 0) + 0.0001)) * ${doubtsTable.amount}) / (365 * 24)`,
      available_endorsement: sql<number>`(
        SELECT SUM(e.cred)
        FROM endorsements e
        WHERE e.point_id = ${doubtsTable.pointId}
        AND e.created_at <= ${doubtsTable.createdAt}
        AND e.user_id IN (
          SELECT user_id 
          FROM restakes 
          WHERE point_id = ${doubtsTable.pointId}
          AND negation_id = ${doubtsTable.negationId}
          AND created_at <= ${doubtsTable.createdAt}
        )
      )`,
    })
    .from(doubtsTable)
    .where(
      and(
        eq(doubtsTable.userId, userId),
        sql`${doubtsTable.amount} > 0` // Only include active doubts
      )
    );

  return results;
};

export const previewEarnings = async () => {
  const userId = await getUserId();
  if (!userId) {
    throw new Error("Must be authenticated to preview earnings");
  }

  const earningsQuery = await calculateEarnings(userId);

  if (earningsQuery.length === 0) {
    return 0;
  }

  let totalEarnings = 0;
  for (const doubt of earningsQuery) {
    const rawEarnings = doubt.hourly_rate * doubt.hours_since_payout;
    const earnings = Math.min(rawEarnings, doubt.available_endorsement);

    totalEarnings += earnings;
  }

  return totalEarnings;
};

interface CollectionResult {
  totalEarnings: number;
  affectedPoints: number[];
}

export const collectEarnings = async (): Promise<CollectionResult> => {
  const userId = await getUserId();
  if (!userId) {
    throw new Error("Must be authenticated to collect earnings");
  }

  return await db.transaction(async (tx) => {
    const earningsQuery = await calculateEarnings(userId);
    const affectedPoints = new Set<number>();
    let totalEarnings = 0;

    for (const doubt of earningsQuery) {
      affectedPoints.add(doubt.point_id);
      affectedPoints.add(doubt.negation_id);

      const rawEarnings = doubt.hourly_rate * doubt.hours_since_payout;
      const earnings = Math.round(
        Math.min(rawEarnings, doubt.available_endorsement)
      );

      if (earnings > 0) {
        const restakersEndorsements = await tx
          .select({
            user_id: endorsementsTable.userId,
            total_cred: sql<number>`SUM(${endorsementsTable.cred})`,
          })
          .from(endorsementsTable)
          .where(
            and(
              eq(endorsementsTable.pointId, doubt.point_id),
              sql`${endorsementsTable.createdAt} <= ${sql.raw(`'${doubt.createdAt.toISOString()}'`)}`,
              sql`${endorsementsTable.userId} IN (
              SELECT user_id 
              FROM ${restakesTable}
              WHERE point_id = ${doubt.point_id}
              AND negation_id = ${doubt.negation_id}
              AND created_at <= ${sql.raw(`'${doubt.createdAt.toISOString()}'`)}
            )`
            )
          )
          .groupBy(endorsementsTable.userId);

        let actuallyCollected = 0;
        let remainingEarnings = earnings;

        for (const endorsement of restakersEndorsements) {
          const proportion =
            endorsement.total_cred / doubt.available_endorsement;
          const deduction =
            endorsement ===
            restakersEndorsements[restakersEndorsements.length - 1]
              ? remainingEarnings
              : Math.round(earnings * proportion);

          if (deduction > 0) {
            const userEndorsements = await tx
              .select()
              .from(endorsementsTable)
              .where(
                and(
                  eq(endorsementsTable.pointId, doubt.point_id),
                  eq(endorsementsTable.userId, endorsement.user_id),
                  sql`${endorsementsTable.createdAt} <= ${sql.raw(`'${doubt.createdAt.toISOString()}'`)}`
                )
              )
              .orderBy(desc(endorsementsTable.cred));

            let remainingDeduction = deduction;
            for (const e of userEndorsements) {
              const toDeduct = Math.min(remainingDeduction, e.cred);

              if (toDeduct > 0) {
                await tx
                  .update(endorsementsTable)
                  .set({
                    cred: e.cred - toDeduct,
                  })
                  .where(
                    and(
                      eq(endorsementsTable.pointId, doubt.point_id),
                      eq(endorsementsTable.id, e.id)
                    )
                  );
                remainingDeduction -= toDeduct;
                actuallyCollected += toDeduct;
                remainingEarnings -= toDeduct;
              }
              if (remainingDeduction <= 0) break;
            }
          }
        }

        if (actuallyCollected > 0) {
          await tx
            .update(doubtsTable)
            .set({
              lastEarningsAt: sql`NOW()`,
            })
            .where(eq(doubtsTable.id, doubt.doubt_id));

          await tx
            .update(usersTable)
            .set({
              cred: sql`${usersTable.cred} + ${actuallyCollected}`,
            })
            .where(eq(usersTable.id, userId));

          totalEarnings += actuallyCollected;
        }
      }
    }

    return {
      totalEarnings,
      affectedPoints: Array.from(affectedPoints),
    };
  });
};
