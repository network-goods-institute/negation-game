import { createAddSupportBelow } from "@/utils/experiment/multiplayer/graphOperations";

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
    this.map.delete(k as any);
  }
  forEach(cb: (v: V, k: string) => void) {
    this.map.forEach((v, k) => cb(v, k));
  }
  [Symbol.iterator]() {
    return this.map[Symbol.iterator]();
  }
}

describe("createAddSupportBelow", () => {
  it("adds support node below parent and creates support edge (local state)", () => {
    const now = Date.now();
    const parentId = "p1";
    const nodes = [
      {
        id: parentId,
        type: "point",
        position: { x: 100, y: 100 },
        data: { content: "A" },
      },
    ];
    const yNodes = new YMapMock<any>();
    const yEdges = new YMapMock<any>();
    const yText = new YMapMock<any>();
    const ydoc = { transact: (fn: Function) => fn() } as any;
    const localOrigin = {};
    const lastAddRef = { current: {} as Record<string, number> } as any;

    let latestNodes: any[] = nodes.slice();
    let latestEdges: any[] = [];
    const setNodes = (updater: (n: any[]) => any[]) => {
      latestNodes = updater(latestNodes);
    };
    const setEdges = (updater: (e: any[]) => any[]) => {
      latestEdges = updater(latestEdges);
    };

    const add = createAddSupportBelow(
      nodes,
      yNodes as any,
      yEdges as any,
      yText as any,
      ydoc,
      true,
      localOrigin,
      lastAddRef,
      setNodes,
      setEdges
    );

    add(parentId);

    expect(latestNodes.length).toBe(2);
    const child = latestNodes.find((n) => n.id !== parentId);
    expect(child?.type).toBe("point");
    expect(child?.position.y).toBeGreaterThan(100);

    expect(latestEdges.length).toBe(1);
    expect(latestEdges[0].type).toBe("support");
    expect(latestEdges[0].target).toBe(parentId);
    expect(typeof latestEdges[0].id).toBe("string");
  });

  it("writes support node/edge and Y.Text to yjs when leader", () => {
    const parentId = "p1";
    const nodes = [
      {
        id: parentId,
        type: "point",
        position: { x: 10, y: 10 },
        data: { content: "A" },
      },
    ];
    const yNodes = new YMapMock<any>();
    const yEdges = new YMapMock<any>();
    const yText = new YMapMock<any>();
    const ydoc = { transact: (fn: Function) => fn() } as any;
    const localOrigin = {};
    const lastAddRef = { current: {} as Record<string, number> } as any;

    let latestNodes: any[] = nodes.slice();
    let latestEdges: any[] = [];
    const setNodes = (updater: (n: any[]) => any[]) => {
      latestNodes = updater(latestNodes);
    };
    const setEdges = (updater: (e: any[]) => any[]) => {
      latestEdges = updater(latestEdges);
    };

    const add = createAddSupportBelow(
      nodes,
      yNodes as any,
      yEdges as any,
      yText as any,
      ydoc,
      true,
      localOrigin,
      lastAddRef,
      setNodes,
      setEdges,
      undefined
    );

    add(parentId);

    const child = latestNodes.find((n) => n.id !== parentId)!;
    const edge = latestEdges[0];
    expect(yNodes.has(child.id)).toBe(true);
    expect(yEdges.has(edge.id)).toBe(true);
    expect(yText.has(child.id)).toBe(true);
  });

  it("respects lock and throttling", () => {
    const parentId = "p1";
    const nodes = [
      { id: parentId, type: "point", position: { x: 0, y: 0 }, data: {} },
    ];
    const yNodes = new YMapMock<any>();
    const yEdges = new YMapMock<any>();
    const yText = new YMapMock<any>();
    const ydoc = { transact: (fn: Function) => fn() } as any;
    const localOrigin = {};
    const lastAddRef = { current: {} as Record<string, number> } as any;

    let latestNodes: any[] = nodes.slice();
    let latestEdges: any[] = [];
    const setNodes = (updater: (n: any[]) => any[]) => {
      latestNodes = updater(latestNodes);
    };
    const setEdges = (updater: (e: any[]) => any[]) => {
      latestEdges = updater(latestEdges);
    };

    const add = createAddSupportBelow(
      nodes,
      yNodes as any,
      yEdges as any,
      yText as any,
      ydoc,
      true,
      localOrigin,
      lastAddRef,
      setNodes,
      setEdges,
      undefined,
      (nodeId) => nodeId === parentId,
      () => ({ name: "X" }) as any
    );

    // Locked: no-op
    add(parentId);
    expect(latestNodes.length).toBe(1);
    expect(latestEdges.length).toBe(0);

    // Unlock and check throttle
    const add2 = createAddSupportBelow(
      nodes,
      yNodes as any,
      yEdges as any,
      yText as any,
      ydoc,
      true,
      localOrigin,
      lastAddRef,
      setNodes,
      setEdges
    );
    add2(parentId);
    const firstEdgeCount = latestEdges.length;
    add2(parentId); // within throttle window -> no change
    expect(latestEdges.length).toBe(firstEdgeCount);
  });
});
