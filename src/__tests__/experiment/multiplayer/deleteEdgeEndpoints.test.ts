import { createDeleteNode } from "@/utils/experiment/multiplayer/graphOperations";

describe("deleteEdge does not delete endpoints", () => {
  it("statement edge deletion keeps source and target nodes", () => {
    const sId = "s-1";
    const pId = "p-1";
    const eId = "e-statement-1";

    let nodes: any[] = [
      { id: sId, type: "statement", position: { x: 0, y: 0 }, data: {} },
      { id: pId, type: "point", position: { x: 100, y: 100 }, data: {} },
    ];
    let edges: any[] = [
      { id: eId, type: "statement", source: sId, target: pId },
    ];

    const setNodes = (updater: any) => {
      nodes = updater(nodes);
    };
    const setEdges = (updater: any) => {
      edges = updater(edges);
    };

    const del = createDeleteNode(
      nodes,
      edges,
      null,
      null,
      null,
      null,
      true,
      {},
      setNodes,
      setEdges
    );

    del(eId);

    // Edge removed
    expect(edges.find((e) => e.id === eId)).toBeUndefined();
    // Endpoints remain
    expect(nodes.find((n) => n.id === sId)).toBeDefined();
    expect(nodes.find((n) => n.id === pId)).toBeDefined();
  });

  it("negation edge deletion removes anchor/objections only, keeps endpoints", () => {
    const aId = "a-1";
    const bId = "b-1";
    const eId = "e-neg-1";
    const anchorId = `anchor:${eId}`;
    const objId = "o-1";
    const objEdgeId = "e-obj-1";

    let nodes: any[] = [
      { id: aId, type: "point", position: { x: 0, y: 0 }, data: {} },
      { id: bId, type: "point", position: { x: 100, y: 100 }, data: {} },
      {
        id: anchorId,
        type: "edge_anchor",
        position: { x: 50, y: 50 },
        data: { parentEdgeId: eId },
      },
      {
        id: objId,
        type: "objection",
        position: { x: 60, y: 60 },
        data: { parentEdgeId: eId },
      },
    ];
    let edges: any[] = [
      { id: eId, type: "negation", source: aId, target: bId },
      { id: objEdgeId, type: "objection", source: objId, target: anchorId },
    ];

    const setNodes = (updater: any) => {
      nodes = updater(nodes);
    };
    const setEdges = (updater: any) => {
      edges = updater(edges);
    };

    const del = createDeleteNode(
      nodes,
      edges,
      null,
      null,
      null,
      null,
      true,
      {},
      setNodes,
      setEdges
    );

    del(eId);

    // Main edge and objection edge removed
    expect(edges.find((e) => e.id === eId)).toBeUndefined();
    expect(edges.find((e) => e.id === objEdgeId)).toBeUndefined();
    // Anchor and objection node removed
    expect(nodes.find((n) => n.id === anchorId)).toBeUndefined();
    expect(nodes.find((n) => n.id === objId)).toBeUndefined();
    // Endpoints remain
    expect(nodes.find((n) => n.id === aId)).toBeDefined();
    expect(nodes.find((n) => n.id === bId)).toBeDefined();
  });
});
