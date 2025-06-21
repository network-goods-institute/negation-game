"use server";

import { getUserId } from "@/actions/users/getUserId";
import { getSpace } from "@/actions/spaces/getSpace";
import {
  doubtsTable,
  doubtHistoryTable,
  usersTable,
  slashesTable,
  restakesTable,
} from "@/db/schema";
import { queueDoubtNotification } from "@/lib/notifications/notificationQueue";
import { db } from "@/services/db";
import { eq, and, sql } from "drizzle-orm";

interface DoubtArgs {
  pointId: number;
  negationId: number;
  amount: number;
}

export const doubt = async ({ pointId, negationId, amount }: DoubtArgs) => {
  const userId = await getUserId();
  if (!userId) {
    throw new Error("Must be authenticated to doubt");
  }

  const space = await getSpace();

  const existingDoubt = await db
    .select()
    .from(doubtsTable)
    .where(
      and(
        eq(doubtsTable.userId, userId),
        eq(doubtsTable.pointId, pointId),
        eq(doubtsTable.negationId, negationId)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (
    existingDoubt &&
    existingDoubt.amount > 0 &&
    amount <= existingDoubt.amount
  ) {
    throw new Error("Doubts can only be increased, not decreased");
  }

  if (amount === 0) return null;

  // Calculate earnings before updating (only if doubt exists and isn't fully slashed)
  let earnings = 0;
  if (existingDoubt && existingDoubt.amount > 0) {
    // Calculate earnings using same logic as collectEarnings
    const earningsCalc = await db.execute<{ earnings: number }>(sql`
      WITH doubt_stats AS (
        SELECT
          EXTRACT(EPOCH FROM (NOW() - ${doubtsTable.lastEarningsAt}))/3600 as hours_since_payout,
          EXP(LN(0.05) + LN(COALESCE((
            SELECT favor 
            FROM current_point_favor
            WHERE point_id = ${negationId}
          ), 0) + 0.0001)) * ${existingDoubt.amount} / (365 * 24) as hourly_rate,
          (
            SELECT SUM(e.cred)
            FROM endorsements e
            WHERE e.point_id = ${pointId}
            AND e.created_at <= ${sql.raw(`'${existingDoubt.createdAt.toISOString()}'`)}
            AND e.user_id IN (
              SELECT user_id 
              FROM restakes 
              WHERE point_id = ${pointId}
              AND negation_id = ${negationId}
              AND created_at <= ${sql.raw(`'${existingDoubt.createdAt.toISOString()}'`)}
            )
          ) as available_endorsement
        FROM ${doubtsTable}
        WHERE id = ${existingDoubt.id}
      )
      SELECT ROUND(LEAST(
        hourly_rate * hours_since_payout,
        available_endorsement
      )) as earnings
      FROM doubt_stats
    `);

    earnings = earningsCalc[0]?.earnings ?? 0;
  }

  return await db.transaction(async (tx) => {
    // Deduct new cred from user atomically
    const credToDeduct =
      existingDoubt?.amount > 0 ? amount - existingDoubt.amount : amount;
    await tx
      .update(usersTable)
      .set({
        cred: sql`${usersTable.cred} - ${credToDeduct} + ${earnings}`,
      })
      .where(eq(usersTable.id, userId));

    let doubtId: number;

    if (existingDoubt) {
      // Calculate if doubt is effectively zeroed (fully reduced by slashes)
      const isEffectivelyZeroed = await tx
        .select({
          slashedAmount: sql<number>`
            COALESCE((
              SELECT SUM(s.amount)
              FROM ${slashesTable} s
              JOIN ${restakesTable} r ON r.id = s.restake_id
              WHERE r.point_id = ${pointId}
              AND r.negation_id = ${negationId}
              AND s.amount > 0
              AND r.created_at <= ${sql.raw(`'${existingDoubt.createdAt.toISOString()}'`)}
            ), 0)
          `.as("slashed_amount"),
        })
        .from(doubtsTable)
        .where(eq(doubtsTable.id, existingDoubt.id))
        .then((rows) => rows[0]?.slashedAmount >= existingDoubt.amount);

      // Update existing doubt with new values
      await tx
        .update(doubtsTable)
        .set({
          amount,
          ...(isEffectivelyZeroed
            ? {
                lastEarningsAt: sql`CURRENT_TIMESTAMP`,
                createdAt: sql`CURRENT_TIMESTAMP`,
              }
            : {
                lastEarningsAt: sql`CURRENT_TIMESTAMP`,
              }),
        })
        .where(eq(doubtsTable.id, existingDoubt.id))
        .returning({ id: doubtsTable.id });

      doubtId = existingDoubt.id;
    } else {
      // Create new doubt
      doubtId = await tx
        .insert(doubtsTable)
        .values({
          userId,
          pointId,
          negationId,
          amount,
          space,
        })
        .returning({ id: doubtsTable.id })
        .then(([{ id }]) => id);
    }

    // Record history
    await tx.insert(doubtHistoryTable).values({
      doubtId,
      userId,
      pointId,
      negationId,
      action: existingDoubt
        ? existingDoubt.amount === 0
          ? "created" // Treat reuse of fully slashed doubt as new creation
          : "increased"
        : "created",
      previousAmount: existingDoubt?.amount ?? null,
      newAmount: amount,
    });

    // Queue notification if amount > 0 (only for active doubts)
    if (amount > 0) {
      queueDoubtNotification({
        negatedPointId: pointId,
        doubterId: userId,
        amount,
        space,
      });
    }

    return {
      doubtId,
      earnings,
    };
  });
};
