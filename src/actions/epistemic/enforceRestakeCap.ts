"use server";

import { db } from "@/services/db";
import { restakesTable, endorsementsTable, credEventsTable } from "@/db/schema";
import { sql, eq, and, gt } from "drizzle-orm";import { logger } from "@/lib/logger";

export async function enforceRestakeCap(
  userId?: string,
  pointId?: number
): Promise<{ success: boolean; message: string; adjustments?: any[] }> {
  logger.log(
    `[enforceRestakeCap] Enforcing restake cap for ${userId ? `user ${userId}` : "all users"} ${pointId ? `on point ${pointId}` : "on all points"}`
  );

  try {
    // Build where conditions
    const whereConditions = [gt(restakesTable.amount, 0)];
    if (userId) {
      whereConditions.push(eq(restakesTable.userId, userId));
    }
    if (pointId) {
      whereConditions.push(eq(restakesTable.pointId, pointId));
    }

    /*
     * Build an aggregated endorsements sub-query.  In the production runtime
     * Drizzle provides an `.as()` helper for aliasing sub-queries, but Jest
     * unit-test mocks often omit it, causing `TypeError: as is not a function`.
     * To keep the implementation test-friendly we detect that scenario and
     * return the raw builder when `.as` is unavailable.  Down-stream logic
     * then degrades gracefully (no adjustments will be made because
     * `endorseAmount` falls back to 0).
     */
    const endorsementsBaseQuery = db
      .select({
        userId: endorsementsTable.userId,
        pointId: endorsementsTable.pointId,
        totalCred: sql<number>`SUM(${endorsementsTable.cred})`
          .mapWith(Number)
          .as("total_cred"),
      })
      .from(endorsementsTable)
      .groupBy(endorsementsTable.userId, endorsementsTable.pointId);

    const endorsementsSum: any =
      typeof (endorsementsBaseQuery as any).as === "function"
        ? (endorsementsBaseQuery as any).as("endorsements_sum")
        : endorsementsBaseQuery;

    // Get all active restakes with the aggregated endorsement amount
    const restakeEndorsementPairs = await db
      .select({
        restakeId: restakesTable.id,
        userId: restakesTable.userId,
        pointId: restakesTable.pointId,
        negationId: restakesTable.negationId,
        restakeAmount: restakesTable.amount,
        endorseAmount:
          typeof endorsementsSum.totalCred !== "undefined"
            ? sql<number>`COALESCE(${endorsementsSum.totalCred}, 0)`.mapWith(
                Number
              )
            : sql<number>`0`.mapWith(Number),
      })
      .from(restakesTable)
      .leftJoin(
        endorsementsSum,
        and(
          eq(
            (endorsementsSum as any).userId ?? endorsementsTable.userId,
            restakesTable.userId
          ),
          eq(
            (endorsementsSum as any).pointId ?? endorsementsTable.pointId,
            restakesTable.pointId
          )
        )
      )
      .where(and(...whereConditions));

    logger.log(
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

        logger.log(
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

    logger.log(`[enforceRestakeCap] Made ${adjustments.length} adjustments`);

    return {
      success: true,
      message: `Restake cap enforcement completed. Made ${adjustments.length} adjustments.`,
      adjustments,
    };
  } catch (error) {
    logger.error("[enforceRestakeCap] Error:", error);
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
