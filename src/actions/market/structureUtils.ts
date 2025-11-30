import { createStructure, CarrollStructure, CarrollEdge } from "@/lib/carroll/structure";

export type CarrollStructureWithSupports = CarrollStructure & { supportEdges: CarrollEdge[] };

export const createStructureWithSupports = (
  nodes: string[],
  negationTriples: Array<[string, string, string]>,
  supportTriples: Array<[string, string, string]> = []
): CarrollStructureWithSupports => {
  const nodesWithSupportNames = Array.from(
    new Set([
      ...nodes,
      ...supportTriples.map(([name]) => name),
    ])
  );
  const base = createStructure(nodesWithSupportNames, negationTriples);
  const supportEdges = supportTriples.map(([name, from, to]) => ({ name, from, to }));

  // Extend names/index map to include support edge ids for downstream lookups (objections, securities)
  const extraNames = supportEdges
    .flatMap((e) => [e.name, e.from, e.to])
    .filter((name) => !base.names.includes(name));
  const names = [...base.names, ...extraNames];
  const indexMap = new Map<string, number>(names.map((n, i) => [n, i]));
  const indexOf = (name: string) => {
    const v = indexMap.get(name);
    if (v == null) throw new Error(`unknown name ${name}`);
    return v;
  };

  return { ...base, names, indexOf, supportEdges };
};
