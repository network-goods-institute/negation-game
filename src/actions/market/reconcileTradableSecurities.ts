"use server";

import * as Y from "yjs";
import { safeUnstableCache } from "@/lib/cache/nextCache";
import { getDocSnapshotBuffer } from "@/services/yjsCompaction";
import { buildSecurities } from "@/lib/carroll/structure";
import { resolveSlugToId } from "@/utils/slugResolver";
import { createStructureWithSupports } from "./structureUtils";

type RFNode = { id: string };
type RFEdge = { id: string; source: string; target: string; type?: string };

export type ReconciledMarket = {
  structure: ReturnType<typeof createStructureWithSupports>;
  securities: string[];
  persisted: boolean;
};

async function computeReconciledMarket(
  canonicalId: string
): Promise<ReconciledMarket> {
  const buf = await getDocSnapshotBuffer(canonicalId);
  const ydoc = new Y.Doc();
  if (buf && buf.byteLength) {
    try {
      Y.applyUpdate(ydoc, new Uint8Array(buf));
    } catch {}
  }
  const yNodes = ydoc.getMap<RFNode>("nodes");
  const yEdges = ydoc.getMap<RFEdge>("edges");

  const normalize = (id: string | undefined | null): string => {
    if (!id) return "";
    const s = String(id);
    return s.startsWith("anchor:") ? s.slice("anchor:".length) : s;
  };

  const nodeIds = new Set<string>();
  for (const n of yNodes.values()) {
    const id = normalize(n?.id);
    if (id) nodeIds.add(id);
  }
  const edgeEntries = Array.from(yEdges.values());
  const edgeIds = new Set<string>(
    edgeEntries.map((e) => e?.id).filter((id): id is string => Boolean(id))
  );
  const negationTriples: Array<[string, string, string]> = [];
  const supportTriples: Array<[string, string, string]> = [];
  const seenEdgeNames = new Set<string>();
  for (const e of edgeEntries) {
    if (!e || !e.id) continue;
    const from = normalize(e.source);
    const to = normalize(e.target);
    const fromOk = nodeIds.has(from) || edgeIds.has(from);
    const toOk = nodeIds.has(to) || edgeIds.has(to);
    if (!fromOk || !toOk) continue;
    if (seenEdgeNames.has(e.id)) continue;
    if (e.id === from || e.id === to) continue;
    if ((e.type || "").toLowerCase() === "support") {
      supportTriples.push([e.id, from, to]);
    } else {
      negationTriples.push([e.id, from, to]);
    }
    seenEdgeNames.add(e.id);
  }

  const structure = createStructureWithSupports(
    Array.from(nodeIds),
    negationTriples,
    supportTriples
  );
  const mintedEdgeIds = new Set(
    [...negationTriples, ...supportTriples].map(([id]) => id)
  );
  const negationAllow = edgeEntries
    .filter((e) => e && mintedEdgeIds.has(e.id))
    .filter((e) => e.type === "negation" || e.type === "objection")
    .map((e) => e!.id);
  const securities = buildSecurities(structure, {
    includeNegations: negationAllow,
  });

  // Read-only reconciliation: never mutate the collaborative document in view path
  return { structure, securities, persisted: false };
}

export async function reconcileTradableSecurities(
  docId: string
): Promise<ReconciledMarket> {
  const canonicalId = await resolveSlugToId(docId);

  // Use unstable_cache to cache structure parsing across serverless instances
  const getCachedStructure = safeUnstableCache(
    async (canonicalId: string) => {
      return computeReconciledMarket(canonicalId);
    },
    ["market-structure", canonicalId],
    {
      tags: [`market-structure:${canonicalId}`],
      revalidate: 30,
    }
  );

  return getCachedStructure(canonicalId);
}
