"use server";

import { db } from "@/services/db";
import { restakesTable, endorsementsTable, credEventsTable } from "@/db/schema";
import { sql, eq, and, gt } from "drizzle-orm";

export async function enforceRestakeCap(
  userId?: string,
  pointId?: number
): Promise<{ success: boolean; message: string; adjustments?: any[] }> {
  console.log(
    `[enforceRestakeCap] Enforcing restake cap for ${userId ? `user ${userId}` : "all users"} ${pointId ? `on point ${pointId}` : "on all points"}`
  );

  try {
    // Build where conditions
    let whereConditions = [
      eq(restakesTable.amount, sql`${restakesTable.amount}`),
      gt(restakesTable.amount, 0),
    ];
    if (userId) {
      whereConditions.push(eq(restakesTable.userId, userId));
    }
    if (pointId) {
      whereConditions.push(eq(restakesTable.pointId, pointId));
    }

    // Get all active restakes with their corresponding endorsements
    const restakeEndorsementPairs = await db
      .select({
        restakeId: restakesTable.id,
        userId: restakesTable.userId,
        pointId: restakesTable.pointId,
        negationId: restakesTable.negationId,
        restakeAmount: restakesTable.amount,
        endorseAmount:
          sql<number>`COALESCE(${endorsementsTable.cred}, 0)`.mapWith(Number),
      })
      .from(restakesTable)
      .leftJoin(
        endorsementsTable,
        and(
          eq(endorsementsTable.userId, restakesTable.userId),
          eq(endorsementsTable.pointId, restakesTable.pointId)
        )
      )
      .where(and(...whereConditions));

    console.log(
      `[enforceRestakeCap] Found ${restakeEndorsementPairs.length} restake-endorsement pairs to check`
    );

    const adjustments: Array<{
      restakeId: number;
      userId: string;
      pointId: number;
      oldAmount: number;
      newAmount: number;
      endorseAmount: number;
    }> = [];

    // Check each restake against the cap
    for (const pair of restakeEndorsementPairs) {
      // Cap restake at exactly the user's current endorsement amount
      const maxAllowedRestake = pair.endorseAmount;

      if (pair.restakeAmount > maxAllowedRestake) {
        const newRestakeAmount = maxAllowedRestake;
        const adjustment = pair.restakeAmount - newRestakeAmount;

        console.log(
          `[enforceRestakeCap] Adjusting restake ${pair.restakeId}: ${pair.restakeAmount} -> ${newRestakeAmount} (endorsement: ${pair.endorseAmount})`
        );

        // Update the restake amount
        await db
          .update(restakesTable)
          .set({ amount: newRestakeAmount })
          .where(eq(restakesTable.id, pair.restakeId));

        // Record the adjustment as a negative cred event (refund)
        if (adjustment > 0) {
          await db.insert(credEventsTable).values({
            userId: pair.userId,
            pointId: pair.pointId,
            kind: "RESTAKE",
            amount: -adjustment, // Negative amount = refund
          });
        }

        adjustments.push({
          restakeId: pair.restakeId,
          userId: pair.userId,
          pointId: pair.pointId,
          oldAmount: pair.restakeAmount,
          newAmount: newRestakeAmount,
          endorseAmount: pair.endorseAmount,
        });
      }
    }

    console.log(`[enforceRestakeCap] Made ${adjustments.length} adjustments`);

    return {
      success: true,
      message: `Restake cap enforcement completed. Made ${adjustments.length} adjustments.`,
      adjustments,
    };
  } catch (error) {
    console.error("[enforceRestakeCap] Error:", error);
    return {
      success: false,
      message: `Restake cap enforcement failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Check if a specific restake amount would violate the cap before allowing it
 */
export async function validateRestakeAmount(
  userId: string,
  pointId: number,
  proposedAmount: number
): Promise<{ valid: boolean; maxAllowed: number; endorseAmount: number }> {
  const endorsement = await db
    .select({ cred: endorsementsTable.cred })
    .from(endorsementsTable)
    .where(
      and(
        eq(endorsementsTable.userId, userId),
        eq(endorsementsTable.pointId, pointId)
      )
    )
    .limit(1);

  const endorseAmount = endorsement[0]?.cred || 0;
  // Restake cannot exceed endorsement amount
  const maxAllowed = endorseAmount;

  return {
    valid: proposedAmount <= maxAllowed,
    maxAllowed,
    endorseAmount,
  };
}
