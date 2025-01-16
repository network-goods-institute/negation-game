"use server";

import { getUserId } from "@/actions/getUserId";
import { 
  slashesTable, 
  slashHistoryTable, 
  restakesTable, 
  restakeHistoryTable,
  doubtsTable,
  doubtHistoryTable,
  usersTable
} from "@/db/schema";
import { db } from "@/services/db";
import { eq, and, sql, desc } from "drizzle-orm";

interface SlashArgs {
  pointId: number;
  negationId: number;
  amount: number;
}

export const slash = async ({ pointId, negationId, amount }: SlashArgs) => {
  const userId = await getUserId();
  if (!userId) {
    throw new Error("Must be authenticated to slash");
  }

  return await db.transaction(async (tx) => {
    // First get the restake - we can only slash our own restakes
    const restake = await tx
      .select()
      .from(restakesTable)
      .where(
        and(
          eq(restakesTable.userId, userId),
          eq(restakesTable.pointId, pointId),
          eq(restakesTable.negationId, negationId),
          sql`${restakesTable.amount} > 0`
        )
      )
      .limit(1)
      .then(rows => rows[0]);

    if (!restake) {
      throw new Error("No active restake found to slash");
    }

    // Get existing slash
    const existingSlash = await tx
      .select()
      .from(slashesTable)
      .where(
        and(
          eq(slashesTable.userId, userId),
          eq(slashesTable.restakeId, restake.id)
        )
      )
      .limit(1)
      .then(rows => rows[0]);

    // Get all active doubts for this restake created after the restake
    // and before any newer restake for the same point/negation pair
    const doubts = await tx.execute<{ id: number, userId: string, amount: number }>(sql`
      SELECT 
        d.id,
        d.user_id as "userId",
        d.amount
      FROM ${doubtsTable} d
      WHERE d.point_id = ${pointId}
      AND d.negation_id = ${negationId}
      AND d.created_at > (
        SELECT created_at 
        FROM ${restakesTable} 
        WHERE id = ${restake.id}
      )
      AND d.amount > 0
      AND NOT EXISTS (
        SELECT 1 
        FROM ${restakesTable} r2 
        WHERE r2.point_id = d.point_id
        AND r2.negation_id = d.negation_id
        AND r2.created_at > (
          SELECT created_at 
          FROM ${restakesTable} 
          WHERE id = ${restake.id}
        )
        AND r2.created_at < d.created_at
      )
    `);

    if (existingSlash) {
      // Get the last restake history BEFORE this slash attempt
      const lastRestakeHistory = await tx.execute<{
        id: number;
        restake_id: number;
        created_at: Date;
      }>(sql`
        SELECT *
        FROM ${restakeHistoryTable}
        WHERE restake_id = ${restake.id}
        AND created_at < CURRENT_TIMESTAMP
        ORDER BY created_at DESC
        LIMIT 1
      `).then(rows => rows[0]);

      // Get the last slash history
      const lastSlashHistory = await tx
        .select()
        .from(slashHistoryTable)
        .where(eq(slashHistoryTable.slashId, existingSlash.id))
        .orderBy(desc(slashHistoryTable.createdAt))
        .limit(1)
        .then(rows => rows[0]);

      // If there was a restake between our last slash and now, replace
      // Otherwise, add to the existing amount
      const newAmount = lastRestakeHistory && lastSlashHistory && 
        lastRestakeHistory.created_at > lastSlashHistory.createdAt
        ? amount  // Replace if there was a restake since last slash
        : existingSlash.amount + amount;  // Add to existing amount

      // Calculate the additional slash amount
      const additionalSlashAmount = newAmount - existingSlash.amount;

      // Update slash amount
      await tx
        .update(slashesTable)
        .set({ amount: newAmount })
        .where(eq(slashesTable.id, existingSlash.id));

      // Record slash history
      await tx.insert(slashHistoryTable).values({
        slashId: existingSlash.id,
        userId,
        pointId,
        negationId,
        action: amount > existingSlash.amount ? "increased" : "decreased",
        previousAmount: existingSlash.amount,
        newAmount
      });

      // Handle doubt reductions for additional slash
      if (additionalSlashAmount > 0 && doubts.length > 0) {
        const slashProportion = additionalSlashAmount / restake.amount;

        // Update each doubt and record history
        for (const doubt of doubts) {
          const reductionAmount = Math.floor(doubt.amount * slashProportion);
          if (reductionAmount > 0) {
            const newDoubtAmount = doubt.amount - reductionAmount;

            // Update doubt amount
            await tx
              .update(doubtsTable)
              .set({ amount: newDoubtAmount })
              .where(eq(doubtsTable.id, doubt.id));

            // Record doubt history
            await tx.insert(doubtHistoryTable).values({
              doubtId: doubt.id,
              userId: doubt.userId,
              pointId,
              negationId,
              action: "reduced_by_slash",
              previousAmount: doubt.amount,
              newAmount: newDoubtAmount
            });

          }
        }
      }

      return existingSlash.id;
    } else {
      // Create new slash
      const newSlash = await tx
        .insert(slashesTable)
        .values({
          userId,
          restakeId: restake.id,
          pointId,
          negationId,
          amount
        })
        .returning({ id: slashesTable.id })
        .then(([{ id }]) => id);

      // Record slash history
      await tx.insert(slashHistoryTable).values({
        slashId: newSlash,
        userId,
        pointId,
        negationId,
        action: "created",
        newAmount: amount
      });

      // Handle doubt reductions for new slash
      if (amount > 0 && doubts.length > 0) {
        const slashProportion = amount / restake.amount;

        // Update each doubt and record history
        for (const doubt of doubts) {
          const reductionAmount = Math.floor(doubt.amount * slashProportion);
          if (reductionAmount > 0) {
            const newDoubtAmount = doubt.amount - reductionAmount;

            // Update doubt amount
            await tx
              .update(doubtsTable)
              .set({ amount: newDoubtAmount })
              .where(eq(doubtsTable.id, doubt.id));

            // Record doubt history
            await tx.insert(doubtHistoryTable).values({
              doubtId: doubt.id,
              userId: doubt.userId,
              pointId,
              negationId,
              action: "reduced_by_slash",
              previousAmount: doubt.amount,
              newAmount: newDoubtAmount
            });
          }
        }
      }

      return newSlash;
    }
  });
}; 