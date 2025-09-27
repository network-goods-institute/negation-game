import { createGraphChangeHandlers } from "@/utils/experiment/multiplayer/graphSync";

class YMapLike<V> {
  map = new Map<string, V>();
  setCalls: string[] = [];
  get(id: string) {
    return this.map.get(id) as any;
  }
  set(id: string, v: V) {
    this.setCalls.push(id);
    this.map.set(id, v);
  }
  has(id: string) {
    return this.map.has(id);
  }
}

describe("graphSync.onNodesChange writes only changed positions/dims", () => {
  it("updates only nodes whose position changed", () => {
    const yNodes = new YMapLike<any>();
    yNodes.set("a", { id: "a", type: "point", position: { x: 0, y: 0 } });
    yNodes.set("b", { id: "b", type: "point", position: { x: 10, y: 10 } });
    yNodes.set("c", { id: "c", type: "point", position: { x: 20, y: 20 } });
    const ydoc = { transact: (fn: () => void) => fn() } as any;

    let nodes = [
      { id: "a", type: "point", position: { x: 0, y: 0 }, data: {} },
      { id: "b", type: "point", position: { x: 10, y: 10 }, data: {} },
      { id: "c", type: "point", position: { x: 20, y: 20 }, data: {} },
    ];

    const setNodes = (updater: any) => {
      nodes = updater(nodes);
      return nodes;
    };
    const setEdges = (u: any) => u([]);
    const handlers = createGraphChangeHandlers(
      setNodes as any,
      setEdges as any,
      yNodes as any,
      null as any,
      ydoc as any,
      (() => {}) as any,
      {}
    );

    handlers.onNodesChange([
      { type: "position", id: "c", position: { x: 21, y: 20 } },
    ] as any);

    handlers.flushPendingChanges();

    const last = yNodes.setCalls[yNodes.setCalls.length - 1];
    expect(last).toBe("c");
    const counts = yNodes.setCalls.reduce(
      (m: any, k) => ((m[k] = (m[k] || 0) + 1), m),
      {} as any
    );
    expect(counts["a"]).toBe(1);
    expect(counts["b"]).toBe(1);
    expect(counts["c"]).toBe(2);
  });
});
