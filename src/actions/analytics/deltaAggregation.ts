"use server";

import { db } from "@/services/db";
import {
  viewpointsTable,
  pointClustersTable,
  rationalePointsTable,
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import {
  computeDeltaBatch,
  computeRationaleDeltaBatch,
} from "./computeDeltaBatch";
import { getCachedDelta, setCachedDelta } from "@/lib/deltaCache";

export async function computeRationaleDelta({
  userAId,
  userBId,
  rationaleId,
  snapDay = new Date().toISOString().slice(0, 10),
  requestingUserId,
}: {
  userAId: string;
  userBId: string;
  rationaleId: string;
  snapDay?: string;
  requestingUserId?: string;
}): Promise<{ delta: number | null; noInteraction: boolean; stats?: any }> {
  const cacheKey = { userAId, userBId, rationaleId, snapDay };
  const cached = getCachedDelta(cacheKey);
  if (cached) {
    return {
      delta: cached.delta,
      noInteraction: cached.noInteraction,
    };
  }

  if (
    requestingUserId &&
    requestingUserId !== userAId &&
    requestingUserId !== userBId
  ) {
    return { delta: null, noInteraction: false };
  }

  try {
    const rationale = await db
      .select({
        id: viewpointsTable.id,
        topicId: viewpointsTable.topicId,
      })
      .from(viewpointsTable)
      .where(eq(viewpointsTable.id, rationaleId))
      .limit(1);

    if (!rationale.length) {
      return { delta: null, noInteraction: false };
    }

    const rationalePoints = await db
      .select({
        pointId: rationalePointsTable.pointId,
      })
      .from(rationalePointsTable)
      .where(eq(rationalePointsTable.rationaleId, rationaleId));

    if (rationalePoints.length === 0) {
      return { delta: null, noInteraction: true };
    }

    const pointIds = rationalePoints.map((rp) => rp.pointId);

    const rootPoints = await db
      .select({
        rootId: pointClustersTable.rootId,
        pointId: pointClustersTable.pointId,
      })
      .from(pointClustersTable)
      .where(inArray(pointClustersTable.pointId, pointIds));

    const uniqueRootIds = [...new Set(rootPoints.map((rp) => rp.rootId))];

    if (uniqueRootIds.length === 0) {
      return { delta: null, noInteraction: true };
    }

    console.log(
      `[computeRationaleDelta] Found ${uniqueRootIds.length} clusters for rationale ${rationaleId}`
    );

    const batchResults = await computeDeltaBatch({
      userAId,
      userBId,
      rootPointIds: uniqueRootIds,
      snapDay,
    });

    const clusterDeltas = batchResults.map((result) => ({
      rootId: result.rootPointId,
      delta: result.delta,
    }));

    const validDeltas = clusterDeltas
      .map((cd) => cd.delta)
      .filter((delta): delta is number => delta !== null);

    if (validDeltas.length === 0) {
      return { delta: null, noInteraction: true };
    }

    const rationaleDelta =
      validDeltas.reduce((sum, delta) => sum + delta, 0) / validDeltas.length;

    const result = {
      delta: rationaleDelta,
      noInteraction: false,
      stats: {
        totalClusters: clusterDeltas.length,
        validClusters: validDeltas.length,
        clusterDeltas: clusterDeltas,
        pointIds: pointIds,
      },
    };

    setCachedDelta(cacheKey, {
      delta: result.delta,
      noInteraction: result.noInteraction,
    });
    return result;
  } catch (error) {
    console.error("[computeRationaleDelta] Error:", error);
    return { delta: null, noInteraction: false };
  }
}

export async function computeTopicDelta({
  userAId,
  userBId,
  topicId,
  snapDay = new Date().toISOString().slice(0, 10),
  requestingUserId,
}: {
  userAId: string;
  userBId: string;
  topicId: number;
  snapDay?: string;
  requestingUserId?: string;
}): Promise<{ delta: number | null; noInteraction: boolean; stats?: any }> {
  const cacheKey = { userAId, userBId, topicId, snapDay };
  const cached = getCachedDelta(cacheKey);
  if (cached) {
    return {
      delta: cached.delta,
      noInteraction: cached.noInteraction,
    };
  }
  if (
    requestingUserId &&
    requestingUserId !== userAId &&
    requestingUserId !== userBId
  ) {
    return { delta: null, noInteraction: false };
  }

  try {
    // Get all rationales for this topic
    const rationales = await db
      .select({
        id: viewpointsTable.id,
      })
      .from(viewpointsTable)
      .where(eq(viewpointsTable.topicId, topicId));

    if (rationales.length === 0) {
      return { delta: null, noInteraction: true };
    }

    const rationaleIds = rationales.map((r) => r.id);
    const batchResults = await computeRationaleDeltaBatch({
      userAId,
      userBId,
      rationaleIds,
      snapDay,
      requestingUserId,
    });

    const rationaleDeltas = batchResults.map((result) => ({
      rationaleId: result.rationaleId,
      delta: result.delta,
    }));

    // Calculate mean of non-null rationale deltas (per spec)
    const validDeltas = rationaleDeltas
      .map((rd) => rd.delta)
      .filter((delta): delta is number => delta !== null);

    if (validDeltas.length === 0) {
      return { delta: null, noInteraction: true };
    }

    const topicDelta =
      validDeltas.reduce((sum, delta) => sum + delta, 0) / validDeltas.length;

    console.log(
      `[computeTopicDelta] Topic delta: ${topicDelta} (from ${validDeltas.length}/${rationaleDeltas.length} rationales)`
    );

    const result = {
      delta: topicDelta,
      noInteraction: false,
      stats: {
        totalRationales: rationaleDeltas.length,
        validRationales: validDeltas.length,
        rationaleDeltas: rationaleDeltas,
      },
    };

    setCachedDelta(cacheKey, {
      delta: result.delta,
      noInteraction: result.noInteraction,
    });
    console.log("[computeTopicDelta] Cached result for", cacheKey);

    return result;
  } catch (error) {
    console.error("[computeTopicDelta] Error:", error);
    return { delta: null, noInteraction: false };
  }
}
