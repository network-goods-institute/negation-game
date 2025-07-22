import { db } from "@/services/db";
import { rateLimitsTable } from "@/db/schema";
import { eq, lt } from "drizzle-orm";

export async function checkRateLimit(
  userId: string,
  maxRequests: number = 10,
  windowMs: number = 60000, // 1 minute
  keyPrefix: string = "delta"
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const now = Date.now();
  const resetTime = now + windowMs;
  const key = `${keyPrefix}:${userId}`;

  try {
    // Clean up expired entries every ~10% of requests (probabilistic cleanup)
    if (Math.random() < 0.1) {
      await cleanupExpiredRateLimits();
    }

    const existingEntry = await db
      .select()
      .from(rateLimitsTable)
      .where(eq(rateLimitsTable.id, key))
      .limit(1);

    const entry = existingEntry[0];

    if (!entry || now > entry.resetTime.getTime()) {
      await db
        .insert(rateLimitsTable)
        .values({
          id: key,
          count: 1,
          resetTime: new Date(resetTime),
        })
        .onConflictDoUpdate({
          target: rateLimitsTable.id,
          set: {
            count: 1,
            resetTime: new Date(resetTime),
            updatedAt: new Date(),
          },
        });

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime,
      };
    }

    if (entry.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime.getTime(),
      };
    }

    await db
      .update(rateLimitsTable)
      .set({
        count: entry.count + 1,
        updatedAt: new Date(),
      })
      .where(eq(rateLimitsTable.id, key));

    return {
      allowed: true,
      remaining: maxRequests - (entry.count + 1),
      resetTime: entry.resetTime.getTime(),
    };
  } catch (error) {
    console.error("[rateLimit] Database error:", error);

    // Fail open - allow the request if database is unavailable
    // This prevents rate limiting from breaking the application
    console.warn("[rateLimit] Failing open due to database error");

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime,
    };
  }
}

/**
 * Clean up expired rate limit entries
 * Called probabilistically or can be called manually via cron
 */
export async function cleanupExpiredRateLimits(): Promise<number> {
  try {
    const now = new Date();

    const result = await db
      .delete(rateLimitsTable)
      .where(lt(rateLimitsTable.resetTime, now));

    const deletedCount = (result as any).rowCount || 0;

    if (deletedCount > 0) {
      console.log(
        `[rateLimit] Cleaned up ${deletedCount} expired rate limit entries`
      );
    }

    return deletedCount;
  } catch (error) {
    console.error("[rateLimit] Error during cleanup:", error);
    return 0;
  }
}
