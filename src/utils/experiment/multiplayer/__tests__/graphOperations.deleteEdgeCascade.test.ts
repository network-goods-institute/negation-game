import { createDeleteNode } from "@/utils/experiment/multiplayer/graphOperations";

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

describe("graph operations: delete cascade", () => {
  it("deletes base edge, anchor and connected objections", () => {
    const nodes: any[] = [
      { id: "s", type: "point", position: { x: 0, y: 0 }, data: {} },
      { id: "t", type: "point", position: { x: 100, y: 0 }, data: {} },
      {
        id: "anchor:e1",
        type: "edge_anchor",
        position: { x: 50, y: 0 },
        data: { parentEdgeId: "e1" },
      },
      { id: "o1", type: "objection", position: { x: 50, y: 60 }, data: {} },
    ];
    const edges: any[] = [
      { id: "e1", source: "s", target: "t", type: "negation" },
      { id: "oe", source: "o1", target: "anchor:e1", type: "objection" },
    ];
    const yNodesMap = makeYMap();
    const yEdgesMap = makeYMap();
    const yTextMap = makeYMap();
    const ydoc = { transact: (cb: () => void) => cb() } as any;
    const isLeader = true;
    const localOrigin = {};
    let stateNodes = nodes.slice();
    let stateEdges = edges.slice();
    const setNodes = (updater: any) => {
      stateNodes = updater(stateNodes);
    };
    const setEdges = (updater: any) => {
      stateEdges = updater(stateEdges);
    };

    const del = createDeleteNode(
      stateNodes,
      stateEdges,
      yNodesMap,
      yEdgesMap,
      yTextMap,
      ydoc,
      isLeader,
      localOrigin,
      setNodes,
      setEdges
    );

    del("e1");

    expect(stateEdges.find((e) => e.id === "e1")).toBeFalsy();
    expect(stateNodes.find((n) => n.id === "anchor:e1")).toBeFalsy();
    expect(stateNodes.find((n) => n.id === "o1")).toBeFalsy();
  });
});
