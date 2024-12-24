"use server";

import { getUserId } from "@/actions/getUserId";
import { doubtsTable, doubtHistoryTable, doubtActionEnum, usersTable } from "@/db/schema";
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

  // Look for existing doubt
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

  if (existingDoubt) {
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

  // Create new doubt
  const newDoubt = await db
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

  // Record history
  await db.insert(doubtHistoryTable).values({
    doubtId: newDoubt,
    userId,
    pointId,
    negationId,
    action: "created",
    newAmount: amount
  });

  return newDoubt;
}; 