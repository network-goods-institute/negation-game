"use server";

import { getUserId } from "@/actions/getUserId";
import { slashesTable, slashHistoryTable, slashActionEnum, restakesTable, restakeHistoryTable } from "@/db/schema";
import { db } from "@/services/db";
import { eq, and, sql, desc, lt } from "drizzle-orm";

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

  // First get the restake - we can only slash our own restakes
  const restake = await db
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
  const existingSlash = await db
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

  if (existingSlash) {
    // Get the last restake history BEFORE this slash attempt
    const lastRestakeHistory = await db
      .select()
      .from(restakeHistoryTable)
      .where(
        and(
          eq(restakeHistoryTable.restakeId, restake.id),
          lt(restakeHistoryTable.createdAt, new Date())
        )
      )
      .orderBy(desc(restakeHistoryTable.createdAt))
      .limit(1)
      .then(rows => rows[0]);

    // Get the last slash history
    const lastSlashHistory = await db
      .select()
      .from(slashHistoryTable)
      .where(eq(slashHistoryTable.slashId, existingSlash.id))
      .orderBy(desc(slashHistoryTable.createdAt))
      .limit(1)
      .then(rows => rows[0]);

    // If there was a restake between our last slash and now, replace
    // Otherwise, add to the existing amount
    const newAmount = lastRestakeHistory && lastSlashHistory && 
      lastRestakeHistory.createdAt > lastSlashHistory.createdAt
      ? amount  // Replace if there was a restake since last slash
      : existingSlash.amount + amount;  // Add to existing amount

    await db
      .update(slashesTable)
      .set({ amount: newAmount })
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
    // Create new slash
    const newSlash = await db
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