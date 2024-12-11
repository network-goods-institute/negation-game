"use server";

import { getUserId } from "@/actions/getUserId";
import { restakesTable, restakeHistoryTable, restakeActionEnum, usersTable } from "@/db/schema";
import { db } from "@/services/db";
import { eq, and, sql, or } from "drizzle-orm";

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
        eq(restakesTable.active, true)
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

  if (existingRestake) {
    // Update existing restake
    const action = amount > existingRestake.amount 
      ? "increased" 
      : amount < existingRestake.amount 
        ? "decreased" 
        : "deactivated";

    await db
      .update(restakesTable)
      .set({ 
        amount,
        active: amount > 0 
      })
      .where(eq(restakesTable.id, existingRestake.id));

    // Record history
    await db.insert(restakeHistoryTable).values({
      restakeId: existingRestake.id,
      userId,
      pointId: pointId,
      negationId: negationId,
      action: action as typeof restakeActionEnum.enumValues[number],
      previousAmount: existingRestake.amount,
      newAmount: amount
    });

    const result = existingRestake.id;
    return result;
  } else {
    // Create new restake
    const newRestake = await db
      .insert(restakesTable)
      .values({
        userId,
        pointId,
        negationId,
        amount,
        active: true
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

    const result = newRestake;
    return result;
  }
}; 