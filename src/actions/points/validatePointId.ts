"use server";

import { fetchPointSnapshots } from "@/actions/points/fetchPointSnapshots";import { logger } from "@/lib/logger";

const EXISTENCE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const existenceCache = new Map<number, { exists: boolean; timestamp: number }>();

/**
 * Server action to validate if a point exists in the database
 * This can be called from client components as needed
 */
export async function validatePointExists(pointId: number): Promise<boolean> {
  try {
    if (!pointId || pointId <= 0) return false;

    const cached = existenceCache.get(pointId);
    if (cached && Date.now() - cached.timestamp < EXISTENCE_CACHE_TTL) {
      return cached.exists;
    }

    const [snapshot] = await fetchPointSnapshots([pointId]);
    const exists = Boolean(snapshot);
    existenceCache.set(pointId, { exists, timestamp: Date.now() });
    return exists;
  } catch (error) {
    logger.error("Error validating point existence:", error);
    return false;
  }
}
