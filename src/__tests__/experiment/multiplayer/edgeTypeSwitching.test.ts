import { createUpdateEdgeType } from "@/utils/experiment/multiplayer/graphOperations/edgeOperations";

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

describe("createUpdateEdgeType", () => {
  it("switches support edge to negation edge", () => {
    const edgeId = "e1";
    const nodes = [
      { id: "n1", type: "point", position: { x: 0, y: 0 } },
      { id: "n2", type: "point", position: { x: 100, y: 100 } },
    ];
    const edges = [{ id: edgeId, type: "support", source: "n1", target: "n2" }];

    const yNodes = new YMapMock<any>();
    const yEdges = new YMapMock<any>();
    // Pre-populate Yjs with the initial edge
    yEdges.set(edgeId, edges[0]);
    const ydoc = { transact: (fn: Function) => fn() } as any;
    const localOrigin = {};

    let latestEdges = edges.slice();
    const setEdges = (updater: (e: any[]) => any[]) => {
      latestEdges = updater(latestEdges);
    };

    const updateEdgeType = createUpdateEdgeType(
      nodes,
      edges,
      yNodes as any,
      yEdges as any,
      ydoc,
      true,
      localOrigin,
      () => {},
      setEdges
    );

    updateEdgeType(edgeId, "negation");

    expect(latestEdges[0].type).toBe("negation");
    // Verify edge was written to Yjs
    expect(yEdges.has(edgeId)).toBe(true);
    expect(yEdges.get(edgeId).type).toBe("negation");
  });

  it("switches negation edge to support edge", () => {
    const edgeId = "e1";
    const nodes = [
      { id: "n1", type: "point", position: { x: 0, y: 0 } },
      { id: "n2", type: "point", position: { x: 100, y: 100 } },
    ];
    const edges = [
      { id: edgeId, type: "negation", source: "n1", target: "n2" },
    ];

    const yNodes = new YMapMock<any>();
    const yEdges = new YMapMock<any>();
    // Pre-populate Yjs with the initial edge
    yEdges.set(edgeId, edges[0]);
    const ydoc = { transact: (fn: Function) => fn() } as any;
    const localOrigin = {};

    let latestEdges = edges.slice();
    const setEdges = (updater: (e: any[]) => any[]) => {
      latestEdges = updater(latestEdges);
    };

    const updateEdgeType = createUpdateEdgeType(
      nodes,
      edges,
      yNodes as any,
      yEdges as any,
      ydoc,
      true,
      localOrigin,
      () => {},
      setEdges
    );

    updateEdgeType(edgeId, "support");

    expect(latestEdges[0].type).toBe("support");
    // Verify edge was written to Yjs
    expect(yEdges.has(edgeId)).toBe(true);
    expect(yEdges.get(edgeId).type).toBe("support");
  });

  it("ignores invalid edge types", () => {
    const edgeId = "e1";
    const nodes = [
      { id: "n1", type: "point", position: { x: 0, y: 0 } },
      { id: "n2", type: "point", position: { x: 100, y: 100 } },
    ];
    const edges = [
      { id: edgeId, type: "objection", source: "n1", target: "n2" },
    ];

    const yNodes = new YMapMock<any>();
    const yEdges = new YMapMock<any>();
    const ydoc = { transact: (fn: Function) => fn() } as any;
    const localOrigin = {};

    let latestEdges = edges.slice();
    const setEdges = (updater: (e: any[]) => any[]) => {
      latestEdges = updater(latestEdges);
    };

    const updateEdgeType = createUpdateEdgeType(
      nodes,
      edges,
      yNodes as any,
      yEdges as any,
      ydoc,
      true,
      localOrigin,
      () => {},
      setEdges
    );

    // Try to switch objection edge to negation - should be ignored
    updateEdgeType(edgeId, "negation");

    expect(latestEdges[0].type).toBe("objection");
    expect(yEdges.map.size).toBe(0); // No changes written to Yjs
  });

  it("prevents switching to same type", () => {
    const edgeId = "e1";
    const nodes = [
      { id: "n1", type: "point", position: { x: 0, y: 0 } },
      { id: "n2", type: "point", position: { x: 100, y: 100 } },
    ];
    const edges = [{ id: edgeId, type: "support", source: "n1", target: "n2" }];

    const yNodes = new YMapMock<any>();
    const yEdges = new YMapMock<any>();
    const ydoc = { transact: (fn: Function) => fn() } as any;
    const localOrigin = {};

    let latestEdges = edges.slice();
    const setEdges = (updater: (e: any[]) => any[]) => {
      latestEdges = updater(latestEdges);
    };

    const updateEdgeType = createUpdateEdgeType(
      nodes,
      edges,
      yNodes as any,
      yEdges as any,
      ydoc,
      true,
      localOrigin,
      () => {},
      setEdges
    );

    // Try to switch support to support - should be ignored
    updateEdgeType(edgeId, "support");

    expect(latestEdges[0].type).toBe("support");
    expect(yEdges.map.size).toBe(0); // No changes written to Yjs
  });

  it("respects read-only mode", () => {
    const edgeId = "e1";
    const nodes = [
      { id: "n1", type: "point", position: { x: 0, y: 0 } },
      { id: "n2", type: "point", position: { x: 100, y: 100 } },
    ];
    const edges = [{ id: edgeId, type: "support", source: "n1", target: "n2" }];

    const yNodes = new YMapMock<any>();
    const yEdges = new YMapMock<any>();
    const ydoc = { transact: (fn: Function) => fn() } as any;
    const localOrigin = {};

    let latestEdges = edges.slice();
    const setEdges = (updater: (e: any[]) => any[]) => {
      latestEdges = updater(latestEdges);
    };

    const updateEdgeType = createUpdateEdgeType(
      nodes,
      edges,
      yNodes as any,
      yEdges as any,
      ydoc,
      false, // read-only mode
      localOrigin,
      () => {},
      setEdges
    );

    updateEdgeType(edgeId, "negation");

    expect(latestEdges[0].type).toBe("support"); // No change
    expect(yEdges.map.size).toBe(0); // No Yjs changes
  });

  it("ignores node locks", () => {
    const edgeId = "e1";
    const nodes = [
      { id: "n1", type: "point", position: { x: 0, y: 0 } },
      { id: "n2", type: "point", position: { x: 100, y: 100 } },
    ];
    const edges = [{ id: edgeId, type: "support", source: "n1", target: "n2" }];

    const yNodes = new YMapMock<any>();
    const yEdges = new YMapMock<any>();
    yEdges.set(edgeId, edges[0]);
    const ydoc = { transact: (fn: Function) => fn() } as any;
    const localOrigin = {};

    let latestEdges = edges.slice();
    const setEdges = (updater: (e: any[]) => any[]) => {
      latestEdges = updater(latestEdges);
    };

    const updateEdgeType = createUpdateEdgeType(
      nodes,
      edges,
      yNodes as any,
      yEdges as any,
      ydoc,
      true,
      localOrigin,
      () => {},
      setEdges,
      (nodeId) => nodeId === "n1", // n1 is locked
      () => ({ name: "X" }) as any
    );

    updateEdgeType(edgeId, "negation");

    expect(latestEdges[0].type).toBe("negation");
    expect(yEdges.get(edgeId).type).toBe("negation");
  });
});
