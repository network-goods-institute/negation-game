import { createDeleteInversePair } from "@/utils/experiment/multiplayer/graphOperations";

class YMapMock<V> {
  map = new Map<string, V>();
  set(k: string, v: V) {
    this.map.set(k, v);
  }
  get(k: string) {
    return this.map.get(k as any) as any;
  }
  has(k: string) {
    return this.map.has(k as any);
  }
  // eslint-disable-next-line drizzle/enforce-delete-with-where
  delete(k: string) {
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    this.map.delete(k as any);
  }
  forEach(cb: (v: V, k: string) => void) {
    this.map.forEach((v, k) => cb(v, k));
  }
  [Symbol.iterator]() {
    return this.map[Symbol.iterator]();
  }
}

describe("createDeleteInversePair", () => {
  it("restores original, removes inverse/group, removes edges, and uses correct origin", () => {
    const groupId = "group-1";
    const originalId = "p1";
    const inverseId = "inverse-1";
    const negEdgeId = `edge:negation:${originalId}->${inverseId}`;

    const nodes = [
      { id: groupId, type: "group", position: { x: 20, y: 30 }, data: {} },
      {
        id: originalId,
        type: "point",
        parentId: groupId,
        position: { x: 10, y: 10 },
        data: { groupId, originalInPair: true },
      },
      {
        id: inverseId,
        type: "point",
        parentId: groupId,
        position: { x: 100, y: 10 },
        data: { groupId, directInverse: true },
      },
    ];
    const edges = [
      {
        id: negEdgeId,
        type: "negation",
        source: originalId,
        target: inverseId,
      },
    ];

    const yNodes = new YMapMock<any>();
    const yEdges = new YMapMock<any>();
    const yText = new YMapMock<any>();
    nodes.forEach((n) => yNodes.set(n.id, n));
    edges.forEach((e) => yEdges.set(e.id, e));

    const origins: any[] = [];
    const localOrigin = { local: true };
    const ydoc = {
      transact: (cb: () => void, origin: any) => {
        origins.push(origin);
        cb();
      },
    } as any;

    let latestNodes: any[] = nodes.slice();
    let latestEdges: any[] = edges.slice();
    const setNodes = (updater: (n: any[]) => any[]) => {
      latestNodes = updater(latestNodes);
    };
    const setEdges = (updater: (e: any[]) => any[]) => {
      latestEdges = updater(latestEdges);
    };

    const isLeader = true;
    const del = createDeleteInversePair(
      nodes,
      edges,
      yNodes as any,
      yEdges as any,
      yText as any,
      ydoc as any,
      isLeader,
      localOrigin,
      setNodes,
      setEdges
    );

    del(inverseId);

    // origin used in transact must equal the provided localOrigin
    expect(origins[0]).toBe(localOrigin);

    // yjs maps updated
    expect(yNodes.has(groupId)).toBe(false);
    expect(yNodes.has(inverseId)).toBe(false);
    expect(yNodes.has(originalId)).toBe(true);
    const updatedOrig = yNodes.get(originalId);
    expect(updatedOrig.parentId).toBeUndefined();
    expect(updatedOrig.position).toEqual({ x: 30, y: 40 }); // group(20,30) + rel(10,10)
    expect(yEdges.has(negEdgeId)).toBe(false);

    // local state updated
    expect(latestNodes.find((n) => n.id === groupId)).toBeUndefined();
    expect(latestNodes.find((n) => n.id === inverseId)).toBeUndefined();
    const localOrig = latestNodes.find((n) => n.id === originalId);
    expect(localOrig.parentId).toBeUndefined();
    expect(localOrig.position).toEqual({ x: 30, y: 40 });
    expect(latestEdges.find((e) => e.id === negEdgeId)).toBeUndefined();
  });
});
