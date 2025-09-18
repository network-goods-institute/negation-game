import { createAddObjectionForEdge } from "@/utils/experiment/multiplayer/graphOperations";

const makeYMap = () => {
  const map = new Map<string, any>();
  return {
    set: (k: string, v: any) => map.set(k, v),
    get: (k: string) => map.get(k),
    has: (k: string) => map.has(k),
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    delete: (k: string) => map.delete(k),
    _map: map,
  } as any;
};

describe("graph operations: objection", () => {
  it("adds anchor, objection node and edge", () => {
    const nodes: any[] = [
      { id: "s", type: "point", position: { x: 0, y: 0 }, data: {} },
      { id: "t", type: "point", position: { x: 100, y: 0 }, data: {} },
    ];
    const edges: any[] = [
      { id: "e1", source: "s", target: "t", type: "negation" },
    ];
    const yNodesMap = makeYMap();
    const yEdgesMap = makeYMap();
    const yTextMap = makeYMap();
    const ydoc = { transact: (cb: () => void) => cb() } as any;
    const canWrite = true;
    const localOrigin = {};
    let stateNodes = nodes.slice();
    let stateEdges = edges.slice();
    const setNodes = (updater: any) => {
      stateNodes = updater(stateNodes);
    };
    const setEdges = (updater: any) => {
      stateEdges = updater(stateEdges);
    };

    const fn = createAddObjectionForEdge(
      stateNodes,
      stateEdges,
      yNodesMap,
      yEdgesMap,
      yTextMap,
      ydoc,
      canWrite,
      localOrigin,
      setNodes,
      setEdges
    );

    fn("e1");

    expect(stateNodes.find((n) => n.id === "anchor:e1")).toBeTruthy();
    const obj = stateNodes.find((n) => n.type === "objection");
    expect(obj).toBeTruthy();
    const objEdge = stateEdges.find((e) => e.type === "objection");
    expect(objEdge).toBeTruthy();
    expect(yNodesMap._map.size).toBeGreaterThan(0);
    expect(yEdgesMap._map.size).toBeGreaterThan(0);
    const t = yTextMap.get((obj as any).id);
    expect(t).toBeTruthy();
  });
});

