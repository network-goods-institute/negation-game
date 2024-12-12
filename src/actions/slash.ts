"use server";

import { getUserId } from "@/actions/getUserId";
import { slashesTable, slashHistoryTable, slashActionEnum } from "@/db/schema";
import { db } from "@/services/db";
import { eq, and } from "drizzle-orm";

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

  // Look for ANY slash (active or not)
  const existingSlash = await db
    .select()
    .from(slashesTable)
    .where(
      and(
        eq(slashesTable.userId, userId),
        eq(slashesTable.pointId, pointId),
        eq(slashesTable.negationId, negationId)
      )
    )
    .limit(1)
    .then(rows => rows[0]);

  if (existingSlash) {
    const newAmount = amount;

    await db
      .update(slashesTable)
      .set({ 
        amount: newAmount,
        active: true
      })
      .where(eq(slashesTable.id, existingSlash.id));

    // Record history
    await db.insert(slashHistoryTable).values({
      slashId: existingSlash.id,
      userId,
      pointId,
      negationId,
      action: amount > existingSlash.amount ? "increased" : "decreased",
      previousAmount: existingSlash.amount,
      newAmount
    });

    return existingSlash.id;
  } else {
    // Create new slash with initial amount
    const newSlash = await db
      .insert(slashesTable)
      .values({
        userId,
        pointId,
        negationId,
        amount,
        active: true
      })
      .returning({ id: slashesTable.id })
      .then(([{ id }]) => id);

    // Record history
    await db.insert(slashHistoryTable).values({
      slashId: newSlash,
      userId,
      pointId,
      negationId,
      action: "created",
      newAmount: amount
    });

    return newSlash;
  }
}; 