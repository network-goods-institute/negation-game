"use server";

import { getUserId } from "@/actions/getUserId";
import { restakesTable, restakeHistoryTable, restakeActionEnum, usersTable, slashesTable, slashHistoryTable } from "@/db/schema";
import { db } from "@/services/db";
import { eq, and, sql } from "drizzle-orm";

interface RestakeArgs {
  pointId: number;
  negationId: number;
  amount: number;
}

export const restake = async ({ pointId, negationId, amount }: RestakeArgs) => {
  const userId = await getUserId();
  if (!userId) {
    throw new Error("Must be authenticated to restake");
  }

  // Look for existing restake in EXACT direction only
  const existingRestake = await db
    .select()
    .from(restakesTable)
    .where(
      and(
        eq(restakesTable.userId, userId),
        eq(restakesTable.pointId, pointId),      // FROM point
        eq(restakesTable.negationId, negationId), // TO point
        sql`${restakesTable.amount} > 0`
      )
    )
    .limit(1)
    .then(rows => rows[0]);

  if (existingRestake) {
    // Update existing restake
    const action = amount > existingRestake.amount 
      ? "increased" 
      : amount < existingRestake.amount 
        ? "decreased" 
        : "deactivated";

    // Only deduct/refund the difference
    const credDelta = amount - existingRestake.amount;
    
    // Deduct cred from user
    await db
      .update(usersTable)
      .set({
        cred: sql`${usersTable.cred} - ${credDelta}`,
      })
      .where(eq(usersTable.id, userId));

    await db.transaction(async (tx) => {
      // Always set any existing slash to 0 when modifying restakes
      const existingSlash = await tx
        .select()
        .from(slashesTable)
        .where(
          and(
            eq(slashesTable.userId, userId),
            eq(slashesTable.pointId, pointId),
            eq(slashesTable.negationId, negationId),
            sql`${slashesTable.amount} > 0`
          )
        )
        .limit(1)
        .then(rows => rows[0]);

      if (existingSlash) {
        // Set slash amount to 0 when modifying restake
        await tx.insert(slashHistoryTable).values({
          slashId: existingSlash.id,
          userId,
          pointId,
          negationId,
          action: "deactivated",
          previousAmount: existingSlash.amount,
          newAmount: 0
        });

        await tx
          .update(slashesTable)
          .set({ amount: 0 })
          .where(eq(slashesTable.id, existingSlash.id));
      }

      // Update the restake
      await tx
        .update(restakesTable)
        .set({ amount })
        .where(eq(restakesTable.id, existingRestake.id));

      // Record restake history
      await tx.insert(restakeHistoryTable).values({
        restakeId: existingRestake.id,
        userId,
        pointId,
        negationId,
        action: action as typeof restakeActionEnum.enumValues[number],
        previousAmount: existingRestake.amount,
        newAmount: amount
      });
    });

    return existingRestake.id;
  } else {
    // Create new restake
    const newRestake = await db
      .insert(restakesTable)
      .values({
        userId,
        pointId,
        negationId,
        amount
      })
      .returning({ id: restakesTable.id })
      .then(([{ id }]) => id);

    // Record history
    await db.insert(restakeHistoryTable).values({
      restakeId: newRestake,
      userId,
      pointId: pointId,
      negationId: negationId,
      action: "created",
      newAmount: amount
    });

    return newRestake;
  }
}; 