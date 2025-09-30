"use server";

import { getUserId } from "@/actions/users/getUserId";
import { getSpace } from "@/actions/spaces/getSpace";
import {
  restakesTable,
  restakeHistoryTable,
  slashesTable,
  slashHistoryTable,
  endorsementsTable,
} from "@/db/schema";
import { queueRestakeNotification } from "@/lib/notifications/notificationQueue";
import { fetchPointSnapshots } from "@/actions/points/fetchPointSnapshots";
import { trackRestakeEvent } from "@/actions/analytics/trackCredEvent";
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

  // Validate against user's total endorsement amount on the parent point (sum of all endorsements)
  const [{ totalCred: endorseCred } = { totalCred: 0 }] = await db
    .select({
      totalCred:
        sql<number>`COALESCE(SUM(${endorsementsTable.cred}), 0)`.mapWith(
          Number
        ),
    })
    .from(endorsementsTable)
    .where(
      and(
        eq(endorsementsTable.userId, userId),
        eq(endorsementsTable.pointId, pointId)
      )
    );

  if (amount > endorseCred) {
    console.warn(
      `[restake] cap exceeded user=${userId} point=${pointId} endorseCred=${endorseCred} amount=${amount}`
    );
    throw new Error(
      `Restake amount (${amount}) cannot exceed your endorsement (${endorseCred}) on this point.`
    );
  }

  const space = await getSpace();
  const [pointSnapshot] = await fetchPointSnapshots([pointId]);

  // Look for existing restake in EXACT direction only
  const existingRestake = await db
    .select()
    .from(restakesTable)
    .where(
      and(
        eq(restakesTable.userId, userId),
        eq(restakesTable.pointId, pointId), // FROM point
        eq(restakesTable.negationId, negationId) // TO point
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (existingRestake) {
    // Update existing restake
    const action =
      amount > existingRestake.amount
        ? "increased"
        : amount < existingRestake.amount
          ? "decreased"
          : "deactivated";

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
        .then((rows) => rows[0]);

      if (existingSlash) {
        // Set slash amount to 0 when modifying restake
        await tx.insert(slashHistoryTable).values({
          slashId: existingSlash.id,
          userId,
          pointId,
          negationId,
          action: "deactivated",
          previousAmount: existingSlash.amount,
          newAmount: 0,
        });

        await tx
          .update(slashesTable)
          .set({ amount: 0 })
          .where(eq(slashesTable.id, existingSlash.id));
      }

      // Calculate if restake is effectively zeroed (fully slashed)
      const isEffectivelyZeroed = await tx
        .select({
          slashedAmount: sql<number>`
            COALESCE((
              SELECT amount 
              FROM ${slashesTable} 
              WHERE restake_id = ${existingRestake.id}
              AND amount > 0
            ), 0)
          `.as("slashed_amount"),
        })
        .from(restakesTable)
        .where(eq(restakesTable.id, existingRestake.id))
        .then((rows) => rows[0]?.slashedAmount >= existingRestake.amount);

      // Reset timestamps if:
      // 1. Restake was fully slashed (slashedAmount >= amount)
      // 2. We're reusing it with a new amount
      // This ensures:
      // - New doubts only earn from endorsements that existed when this "new" restake was placed
      // - Slashes properly track which restake modification they're responding to
      await tx
        .update(restakesTable)
        .set({
          amount,
          ...(isEffectivelyZeroed
            ? {
                createdAt: sql`CURRENT_TIMESTAMP`,
              }
            : {}),
        })
        .where(eq(restakesTable.id, existingRestake.id));

      // Record restake history
      await tx.insert(restakeHistoryTable).values({
        restakeId: existingRestake.id,
        userId,
        pointId,
        negationId,
        action: existingRestake.amount === 0 ? "created" : action,
        previousAmount: existingRestake.amount,
        newAmount: amount,
      });
    });

    // Track the cred event (difference from existing amount)
    const credChange = amount - existingRestake.amount;
    if (credChange !== 0) {
      await trackRestakeEvent(userId, pointId, credChange);
    }

    // Queue notification if amount > 0 (only for active restakes)
    if (amount > 0) {
      queueRestakeNotification({
        negatedPointId: pointId,
        restakerId: userId,
        amount,
        space,
        pointSnapshot: pointSnapshot ?? null,
      });
    }

    return existingRestake.id;
  } else {
    // Create new restake
    const newRestake = await db
      .insert(restakesTable)
      .values({
        userId,
        pointId,
        negationId,
        amount,
        space,
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
      newAmount: amount,
    });

    // Track the cred event for new restakes
    await trackRestakeEvent(userId, pointId, amount);

    // Queue notification if amount > 0 (only for active restakes)
    if (amount > 0) {
      queueRestakeNotification({
        negatedPointId: pointId,
        restakerId: userId,
        amount,
        space,
        pointSnapshot: pointSnapshot ?? null,
      });
    }

    return newRestake;
  }
};
