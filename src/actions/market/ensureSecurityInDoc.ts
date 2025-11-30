"use server";

import * as Y from "yjs";
import { db } from "@/services/db";
import { mpDocsTable } from "@/db/tables/mpDocsTable";
import { mpDocUpdatesTable } from "@/db/tables/mpDocUpdatesTable";
import { resolveSlugToId } from "@/utils/slugResolver";
import { getDocSnapshotBuffer } from "@/services/yjsCompaction";

type RFNode = {
  id: string;
  type?: string;
  position?: { x: number; y: number };
  data?: any;
};
type RFEdge = { id: string; source: string; target: string; type?: string };

function parseEdgeSecurity(
  id: string
): { source: string; target: string } | null {
  if (!id.startsWith("edge:")) return null;
  try {
    const raw = id.slice("edge:".length);
    const [left, right] = raw.split("->");
    if (!left || !right) return null;
    const srcParts = left.split(":");
    const srcId = srcParts.length >= 2 ? srcParts[1] : left;
    const tgtId = right.split(":")[0] || right;
    if (!srcId || !tgtId) return null;
    return { source: srcId, target: tgtId };
  } catch {
    return null;
  }
}

function ensureNode(yNodes: Y.Map<RFNode>, nodeId: string): RFNode {
  for (const n of yNodes.values()) if (n?.id === nodeId) return n;
  const now = Date.now();
  const node: RFNode = {
    id: nodeId,
    type: "point",
    position: { x: 0, y: 0 },
    data: { content: nodeId, createdAt: now, favor: 5 },
  };
  yNodes.set(nodeId, node);
  return node;
}

function edgeExists(yEdges: Y.Map<RFEdge>, edgeId: string): boolean {
  for (const e of yEdges.values()) if (e?.id === edgeId) return true;
  return false;
}

/**
 * Ensures the given security id (node or edge) exists in the Yjs document.
 * If missing, persists a minimal node/edge so Carroll structure can include it.
 */
export async function ensureSecurityInDoc(
  docId: string,
  securityId: string
): Promise<void> {
  const canonicalId = await resolveSlugToId(docId);

  // Load base snapshot
  const baseBuf = await getDocSnapshotBuffer(canonicalId);
  const baseDoc = new Y.Doc();
  if (baseBuf && baseBuf.byteLength) {
    try {
      Y.applyUpdate(baseDoc, new Uint8Array(baseBuf));
    } catch (error) {
      throw new Error(`Failed to apply base doc update: ${error}`);
    }
  }

  const doc = new Y.Doc();
  if (baseBuf && baseBuf.byteLength) {
    try {
      Y.applyUpdate(doc, new Uint8Array(baseBuf));
    } catch (error) {
      throw new Error(`Failed to apply doc update: ${error}`);
    }
  }

  const yNodes = doc.getMap<RFNode>("nodes");
  const yEdges = doc.getMap<RFEdge>("edges");

  const isEdge = securityId.startsWith("edge:");
  if (!isEdge) {
    ensureNode(yNodes, securityId);
  } else {
    const parsed = parseEdgeSecurity(securityId);
    if (!parsed) return;
    const { source, target } = parsed;
    ensureNode(yNodes, source);
    ensureNode(yNodes, target);
    if (!edgeExists(yEdges, securityId)) {
      const edge: RFEdge = { id: securityId, source, target, type: "support" };
      yEdges.set(edge.id, edge);
    }
  }

  const update = Y.encodeStateAsUpdate(doc, Y.encodeStateVector(baseDoc));
  if (!update || !update.byteLength) return;

  await db
    .insert(mpDocsTable)
    .values({ id: canonicalId })
    .onConflictDoNothing();
  await db
    .insert(mpDocUpdatesTable)
    .values({
      docId: canonicalId,
      updateBin: Buffer.from(update),
      userId: null,
    });
}
