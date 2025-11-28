"use server";
import * as Y from "yjs";
import { safeUnstableCache } from "@/lib/cache/nextCache";
import { getDocSnapshotBuffer } from "@/services/yjsCompaction";
import { buildSecurities } from "@/lib/carroll/structure";
import { resolveSlugToId } from "@/utils/slugResolver";
import { createStructureWithSupports } from "./structureUtils";

type RFNode = { id: string; type?: string };
type RFEdge = { id: string; source: string; target: string; type?: string };

export type BuiltMarket = {
  structure: ReturnType<typeof createStructureWithSupports>;
  securities: string[];
};

async function computeStructureFromDoc(
  canonicalId: string
): Promise<BuiltMarket> {
  const buf = await getDocSnapshotBuffer(canonicalId);
  const ydoc = new Y.Doc();
  if (buf && buf.byteLength) {
    Y.applyUpdate(ydoc, new Uint8Array(buf));
  }
  const yNodes = ydoc.getMap<RFNode>("nodes");
  const yEdges = ydoc.getMap<RFEdge>("edges");
  const allNodes = Array.from(yNodes.values());
  const allEdges = Array.from(yEdges.values());
  const nodeIdSet = new Set(
    allNodes
      .filter(
        (n) =>
          n && typeof n.id === "string" && !String(n.id).startsWith("anchor:")
      )
      .map((n) => n.id)
  );
  const edgeIdSet = new Set(allEdges.map((e) => e.id));
  const normalizeEndpoint = (id: string | undefined | null): string => {
    if (!id) return "";
    const s = String(id);
    return s.startsWith("anchor:") ? s.slice("anchor:".length) : s;
  };
  const nodes = Array.from(nodeIdSet);
  const negationEdges: Array<[string, string, string]> = [];
  const supportEdges: Array<[string, string, string]> = [];
  for (const e of allEdges) {
    if (!e || !e.id) continue;
    const from = normalizeEndpoint(e.source);
    const to = normalizeEndpoint(e.target);
    const fromOk = nodeIdSet.has(from) || edgeIdSet.has(from);
    const toOk = nodeIdSet.has(to) || edgeIdSet.has(to);
    if (!fromOk || !toOk) continue;
    if (e.type === "support") {
      supportEdges.push([e.id, from, to]);
    } else {
      negationEdges.push([e.id, from, to]);
    }
  }
  const structure = createStructureWithSupports(nodes, negationEdges, supportEdges);
  const negationAllow: string[] = Array.from(yEdges.values())
    .filter((e) => e?.type === "negation" || e?.type === "objection")
    .map((e) => e.id);
  const securities = buildSecurities(structure, {
    includeNegations: negationAllow,
  });
  return { structure, securities };
}

export async function buildStructureFromDoc(
  docId: string
): Promise<BuiltMarket> {
  const canonicalId = await resolveSlugToId(docId);

  const getCachedStructure = safeUnstableCache(
    async (id: string) => computeStructureFromDoc(id),
    ["market-build-structure", canonicalId],
    {
      tags: [`market-structure:${canonicalId}`],
      revalidate: 30,
    }
  );

  return getCachedStructure(canonicalId);
}

export async function buildStructureFromDocUncached(
  docId: string
): Promise<BuiltMarket> {
  const canonicalId = await resolveSlugToId(docId);
  return computeStructureFromDoc(canonicalId);
}
