"use server";

import { db } from "@/services/db";
import { viewpointsTable, pointsTable, pointClustersTable } from "@/db/schema";
import { sql, eq, inArray } from "drizzle-orm";
import { computeDelta } from "./computeDelta";

export async function computeRationaleDelta({
  userAId,
  userBId,
  rationaleId,
  snapDay = new Date().toISOString().slice(0, 10),
}: {
  userAId: string;
  userBId: string;
  rationaleId: string;
  snapDay?: string;
}): Promise<{ delta: number | null; noInteraction: boolean; stats?: any }> {
  console.log(
    `[computeRationaleDelta] Computing rationale delta for ${rationaleId}`
  );

  try {
    // Get the rationale
    const rationale = await db
      .select({
        id: viewpointsTable.id,
        graph: viewpointsTable.graph,
        topicId: viewpointsTable.topicId,
      })
      .from(viewpointsTable)
      .where(eq(viewpointsTable.id, rationaleId))
      .limit(1);

    if (!rationale.length) {
      return { delta: null, noInteraction: false };
    }

    const graph = rationale[0].graph as any;
    if (!graph?.nodes) {
      return { delta: null, noInteraction: false };
    }

    // Extract point IDs from the graph
    const pointIds: number[] = [];
    for (const node of graph.nodes) {
      if (node.type === "point" && node.data?.pointId) {
        const pointId = Number(node.data.pointId);
        if (!isNaN(pointId)) {
          pointIds.push(pointId);
        }
      }
    }

    if (pointIds.length === 0) {
      return { delta: null, noInteraction: true };
    }

    // Find all root points (points that are roots of clusters containing our points)
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

    // Compute delta for each cluster
    const clusterDeltas: Array<{ rootId: number; delta: number | null }> = [];

    for (const rootId of uniqueRootIds) {
      const result = await computeDelta({
        userAId,
        userBId,
        rootPointId: rootId,
        snapDay,
      });

      clusterDeltas.push({
        rootId,
        delta: result.delta,
      });
    }

    // Calculate mean of non-null cluster deltas (per spec)
    const validDeltas = clusterDeltas
      .map((cd) => cd.delta)
      .filter((delta): delta is number => delta !== null);

    if (validDeltas.length === 0) {
      return { delta: null, noInteraction: true };
    }

    const rationaleDelta =
      validDeltas.reduce((sum, delta) => sum + delta, 0) / validDeltas.length;

    console.log(
      `[computeRationaleDelta] Rationale delta: ${rationaleDelta} (from ${validDeltas.length}/${clusterDeltas.length} clusters)`
    );

    return {
      delta: rationaleDelta,
      noInteraction: false,
      stats: {
        totalClusters: clusterDeltas.length,
        validClusters: validDeltas.length,
        clusterDeltas: clusterDeltas,
        pointIds: pointIds,
      },
    };
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
}: {
  userAId: string;
  userBId: string;
  topicId: number;
  snapDay?: string;
}): Promise<{ delta: number | null; noInteraction: boolean; stats?: any }> {
  console.log(`[computeTopicDelta] Computing topic delta for topic ${topicId}`);

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

    console.log(
      `[computeTopicDelta] Found ${rationales.length} rationales for topic ${topicId}`
    );

    // Compute delta for each rationale
    const rationaleDeltas: Array<{
      rationaleId: string;
      delta: number | null;
    }> = [];

    for (const rationale of rationales) {
      const result = await computeRationaleDelta({
        userAId,
        userBId,
        rationaleId: rationale.id,
        snapDay,
      });

      rationaleDeltas.push({
        rationaleId: rationale.id,
        delta: result.delta,
      });
    }

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

    return {
      delta: topicDelta,
      noInteraction: false,
      stats: {
        totalRationales: rationaleDeltas.length,
        validRationales: validDeltas.length,
        rationaleDeltas: rationaleDeltas,
      },
    };
  } catch (error) {
    console.error("[computeTopicDelta] Error:", error);
    return { delta: null, noInteraction: false };
  }
}
