"use server";

import { db } from "@/services/db";
import { negationsTable, pointClustersTable } from "@/db/schema";
import { eq, or, and } from "drizzle-orm";

/**
 * Build the transitive closure of negations starting from `rootPointId`.
 * Inserts rows into `point_clusters` with depth and sign (1 for even, -1 for odd).
 * Idempotent: uses ON CONFLICT DO NOTHING to avoid duplicate rows.
 */
export const buildPointCluster = async (rootPointId: number) => {
  // If it already exists return early
  const existingRows = await db
    .select({ pointId: pointClustersTable.pointId })
    .from(pointClustersTable)
    .where(eq(pointClustersTable.rootId, rootPointId))
    .limit(1);

  if (existingRows.length > 0) return;

  // BFS traversal
  type Node = { id: number; depth: number; sign: number };
  const queue: Node[] = [{ id: rootPointId, depth: 0, sign: 1 }];
  const seen = new Set<number>([rootPointId]);
  const inserts: Node[] = [];

  while (queue.length) {
    const current = queue.shift()!;
    inserts.push(current);

    // fetch direct negations (bidirectional)
    const neighbors = await db
      .select({
        older: negationsTable.olderPointId,
        newer: negationsTable.newerPointId,
      })
      .from(negationsTable)
      .where(
        and(
          eq(negationsTable.isActive, true),
          or(
            eq(negationsTable.olderPointId, current.id),
            eq(negationsTable.newerPointId, current.id)
          )
        )
      );

    const nextIds: number[] = [];
    for (const row of neighbors) {
      const nId = row.older === current.id ? row.newer : row.older;
      if (!nId) continue;
      nextIds.push(nId);
    }

    for (const id of nextIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      queue.push({ id, depth: current.depth + 1, sign: current.sign * -1 });
    }
  }

  // bulk insert
  if (inserts.length) {
    await db
      .insert(pointClustersTable)
      .values(
        inserts.map((n) => ({
          rootId: rootPointId,
          pointId: n.id,
          depth: n.depth,
          sign: n.sign,
        }))
      )
      .onConflictDoNothing();
  }
};
