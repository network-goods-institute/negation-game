import { createUpdateNodesFromY } from "@/hooks/experiment/multiplayer/yjs/nodeSync";
import { createUpdateEdgesFromY } from "@/hooks/experiment/multiplayer/yjs/edgeSync";

class YMapMock<V> implements Iterable<[string, V]> {
  map = new Map<string, V>();
  values() {
    return this.map.values();
  }
  doc: { transact: (cb: () => void, origin?: any) => void };
  origins: any[] = [];
  constructor() {
    this.doc = {
      transact: (cb: () => void, origin?: any) => {
        this.origins.push(origin);
        cb();
      },
    } as any;
  }
  set(k: string, v: V) {
    this.map.set(k, v);
  }
  get(k: string) {
    return this.map.get(k) as any;
  }
  has(k: string) {
    return this.map.has(k);
  }
  delete(k: string) {
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    this.map.delete(k);
  }
  keys() {
    return this.map.keys();
  }
  get size() {
    return this.map.size as any;
  }
  [Symbol.iterator](): Iterator<[string, V]> {
    return this.map[Symbol.iterator]();
  }
}

describe("yjs observer migrations", () => {
  it("migrates question node to statement and writes back in a transaction", () => {
    const yNodes = new YMapMock<any>();
    yNodes.set("n1", { id: "n1", type: "question", position: { x: 0, y: 0 }, data: {} });
    yNodes.set("p1", { id: "p1", type: "point", position: { x: 0, y: 0 }, data: {} });

    const yTextMapRef = { current: null as any };
    const lastNodesSigRef = { current: "" };
    let latestNodes: any[] = [];
    const setNodes = (updater: any) => {
      latestNodes = updater([]);
    };

    const handler = createUpdateNodesFromY(
      yNodes as any,
      yTextMapRef as any,
      lastNodesSigRef as any,
      setNodes as any
    );
    handler(undefined as any, {} as any);

    const migrated = yNodes.get("n1");
    expect(migrated.type).toBe("statement");
    expect(latestNodes.find((n) => n.id === "n1")?.type).toBe("statement");
    expect(yNodes.origins.length).toBeGreaterThan(0);
  });

  it("migrates question edge to option and writes back in a transaction", () => {
    const yEdges = new YMapMock<any>();
    yEdges.set("e1", { id: "e1", type: "question", source: "s", target: "t" });

    const lastEdgesSigRef = { current: "" };
    let latestEdges: any[] = [];
    const setEdges = (updater: any) => {
      latestEdges = updater([]);
    };

    const handler = createUpdateEdgesFromY(
      yEdges as any,
      lastEdgesSigRef as any,
      setEdges as any
    );
    handler(undefined as any, {} as any);

    const migrated = yEdges.get("e1");
    expect(migrated.type).toBe("option");
    expect(latestEdges.find((e) => e.id === "e1")?.type).toBe("option");
    expect(yEdges.origins.length).toBeGreaterThan(0);
  });

  it("ignores local-origin node transactions", () => {
    const yNodes = new YMapMock<any>();
    yNodes.set("n1", { id: "n1", type: "point", position: { x: 0, y: 0 }, data: {} });
    const yTextMapRef = { current: null as any };
    const lastNodesSigRef = { current: "" };
    const localOriginRef = { current: { client: true } };
    const setNodes = jest.fn();

    const handler = createUpdateNodesFromY(
      yNodes as any,
      yTextMapRef as any,
      lastNodesSigRef as any,
      setNodes as any,
      localOriginRef as any
    );
    handler(undefined as any, { origin: localOriginRef.current } as any);
    expect(setNodes).not.toHaveBeenCalled();
  });
});
