"use server";

import * as Y from "yjs";
import { safeUnstableCache } from "@/lib/cache/nextCache";
import { getDocSnapshotBuffer } from "@/services/yjsCompaction";
import { createStructure, buildSecurities } from "@/lib/carroll/structure";
import { resolveSlugToId } from "@/utils/slugResolver";

type RFNode = { id: string };
type RFEdge = { id: string; source: string; target: string; type?: string };

export type ReconciledMarket = {
  structure: ReturnType<typeof createStructure>;
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

  const rawNodeSet = new Set<string>();
  for (const n of yNodes.values()) {
    const id = normalize(n?.id);
    if (id) rawNodeSet.add(id);
  }
  const edgesList: Array<{
    id: string;
    source: string;
    target: string;
    type?: string;
  }> = [];
  for (const e of yEdges.values()) {
    if (!e || !e.id) continue;
    const src = normalize(e.source);
    const tgt = normalize(e.target);
    edgesList.push({ id: e.id, source: src, target: tgt, type: e.type });
  }

  const augNodes = new Set<string>(rawNodeSet);
  for (const e of edgesList) {
    if (e.source) augNodes.add(e.source);
    if (e.target) augNodes.add(e.target);
  }
  const triples: Array<[string, string, string]> = [];
  for (const e of edgesList) {
    if (!e.source || !e.target) continue;
    triples.push([e.id, e.source, e.target]);
  }

  const structure = createStructure(Array.from(augNodes), triples);
  const negationAllow = edgesList
    .filter((e) => e?.type === "negation" || e?.type === "objection")
    .map((e) => e.id);
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
