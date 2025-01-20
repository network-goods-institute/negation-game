"use server";

import { getUserId } from "@/actions/getUserId";
import { doubtsTable, doubtHistoryTable, usersTable } from "@/db/schema";
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
    .then(rows => rows[0]);

  // Only allow modifying if the existing doubt was fully slashed (amount = 0)
  if (existingDoubt && existingDoubt.amount > 0) {
    throw new Error("Doubts cannot be modified after creation");
  }

  if (amount === 0) return null;

  // Deduct cred from user
  await db
    .update(usersTable)
    .set({
      cred: sql`${usersTable.cred} - ${amount}`,
    })
    .where(eq(usersTable.id, userId));

  let doubtId: number;
    
  if (existingDoubt) {
    // Update existing doubt with new values
    // Need to overwrite the dates so shit doesn't get weird
    // This is effectively a new doubt, but the rest of the system assumes that only one row exists per user per point-negation pair
    await db
      .update(doubtsTable)
      .set({
        amount,
        lastEarningsAt: sql`CURRENT_TIMESTAMP`,
        createdAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(doubtsTable.id, existingDoubt.id))
      .returning({ id: doubtsTable.id });
      
    doubtId = existingDoubt.id;
  } else {
    // Create new doubt
    doubtId = await db
      .insert(doubtsTable)
      .values({
        userId,
        pointId,
        negationId,
        amount,
        immutable: true
      })
      .returning({ id: doubtsTable.id })
      .then(([{ id }]) => id);
  }

  // Record history
  await db.insert(doubtHistoryTable).values({
    doubtId,
    userId,
    pointId,
    negationId,
    action: "created",
    previousAmount: existingDoubt?.amount ?? null,
    newAmount: amount
  });

  return doubtId;
}; 