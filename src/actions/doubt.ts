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
        eq(doubtsTable.negationId, negationId),
        sql`${doubtsTable.amount} > 0`
      )
    )
    .limit(1)
    .then(rows => rows[0]);

  // Deduct cred from user
  await db
    .update(usersTable)
    .set({
      cred: sql`${usersTable.cred} - ${amount}`,
    })
    .where(eq(usersTable.id, userId));

  if (existingDoubt) {
    // Update existing doubt
    const action = amount > existingDoubt.amount 
      ? "increased" 
      : amount < existingDoubt.amount 
        ? "decreased" 
        : "deactivated";

    await db.transaction(async (tx) => {
      // Update the doubt
      await tx
        .update(doubtsTable)
        .set({ amount })
        .where(eq(doubtsTable.id, existingDoubt.id));

      // Record doubt history
      await tx.insert(doubtHistoryTable).values({
        doubtId: existingDoubt.id,
        userId,
        pointId,
        negationId,
        action: action as typeof doubtActionEnum.enumValues[number],
        previousAmount: existingDoubt.amount,
        newAmount: amount
      });
    });

    return existingDoubt.id;
  } else {
    // Create new doubt
    const newDoubt = await db
      .insert(doubtsTable)
      .values({
        userId,
        pointId,
        negationId,
        amount
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
  }
}; 