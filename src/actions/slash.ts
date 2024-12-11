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
  console.log('Slash action:', { userId, pointId, negationId, amount });
  
  if (!userId) {
    throw new Error("Must be authenticated to slash");
  }

  const existingSlash = await db
    .select()
    .from(slashesTable)
    .where(
      and(
        eq(slashesTable.userId, userId),
        eq(slashesTable.pointId, pointId),
        eq(slashesTable.negationId, negationId),
        eq(slashesTable.active, true)
      )
    )
    .limit(1)
    .then(rows => rows[0]);

  console.log('Existing slash:', existingSlash);

  if (existingSlash) {
    // Update existing slash
    const action = amount > existingSlash.amount 
      ? "increased" 
      : amount < existingSlash.amount 
        ? "decreased" 
        : "deactivated";

    await db
      .update(slashesTable)
      .set({ 
        amount,
        active: amount > 0 
      })
      .where(eq(slashesTable.id, existingSlash.id));

    // Record history
    await db.insert(slashHistoryTable).values({
      slashId: existingSlash.id,
      userId,
      pointId,
      negationId,
      action: action as typeof slashActionEnum.enumValues[number],
      previousAmount: existingSlash.amount,
      newAmount: amount
    });

    return existingSlash.id;
  } else {
    // Create new slash
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