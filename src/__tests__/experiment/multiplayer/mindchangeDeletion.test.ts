jest.mock("@/actions/experimental/mindchange", () => ({
  deleteMindchangeForEdge: jest.fn(async () => ({ ok: true })),
}));

import { createDeleteNode } from "@/utils/experiment/multiplayer/graphOperations";
import { deleteMindchangeForEdge as deleteMindchangeForEdgeMock } from "@/actions/experimental/mindchange";

describe("mindchange cleanup on delete", () => {
  const makeYdoc = () => ({ transact: (fn: any) => fn() });

  it("clears server and meta when deleting an edge", async () => {
    const docId = "doc-1";
    const edgeId = "e-1";

    const nodes: any[] = [
      { id: `anchor:${edgeId}`, type: "edge_anchor", data: { parentEdgeId: edgeId } },
    ];
    const edges: any[] = [
      { id: edgeId, type: "support", source: "a", target: "b" },
    ];

    const yEdgesMap = new Map<string, any>();
    yEdgesMap.set(edgeId, edges[0]);
    const yNodesMap = new Map<string, any>();
    const yTextMap = new Map<string, any>();
    const yMetaMap = new Map<string, any>([[`mindchange:${edgeId}`, { forward: 10 }]]);

    const setNodes = jest.fn((u) => (typeof u === "function" ? u(nodes) : u));
    const setEdges = jest.fn((u) => (typeof u === "function" ? u(edges) : u));

    const deleteNode = createDeleteNode(
      nodes,
      edges,
      yNodesMap as any,
      yEdgesMap as any,
      yTextMap as any,
      makeYdoc() as any,
      true,
      {},
      setNodes,
      setEdges,
      undefined,
      undefined,
      undefined,
      yMetaMap as any,
      docId
    );

    deleteNode(edgeId);

    expect(deleteMindchangeForEdgeMock).toHaveBeenCalledWith(docId, edgeId);
    expect(yMetaMap.has(`mindchange:${edgeId}`)).toBe(false);
  });

  it("clears server and meta for all incident edges when deleting a node", async () => {
    const docId = "doc-2";
    const nodeId = "n-1";
    const other = "n-2";
    const e1 = { id: "e1", type: "support", source: nodeId, target: other };
    const e2 = { id: "e2", type: "support", source: other, target: nodeId };
    const edges: any[] = [e1, e2];
    const nodes: any[] = [
      { id: nodeId, type: "point", data: {} },
      { id: other, type: "point", data: {} },
      { id: `anchor:${e1.id}`, type: "edge_anchor", data: { parentEdgeId: e1.id } },
      { id: `anchor:${e2.id}`, type: "edge_anchor", data: { parentEdgeId: e2.id } },
    ];

    const yEdgesMap = new Map<string, any>([
      [e1.id, e1],
      [e2.id, e2],
    ]);
    const yNodesMap = new Map<string, any>();
    const yTextMap = new Map<string, any>();
    const yMetaMap = new Map<string, any>([
      [`mindchange:${e1.id}`, { forward: 20 }],
      [`mindchange:${e2.id}`, { forward: 30 }],
    ]);

    const setNodes = jest.fn((u) => (typeof u === "function" ? u(nodes) : u));
    const setEdges = jest.fn((u) => (typeof u === "function" ? u(edges) : u));

    const deleteNode = createDeleteNode(
      nodes,
      edges,
      yNodesMap as any,
      yEdgesMap as any,
      yTextMap as any,
      makeYdoc() as any,
      true,
      {},
      setNodes,
      setEdges,
      undefined,
      undefined,
      undefined,
      yMetaMap as any,
      docId
    );

    deleteNode(nodeId);

    expect(deleteMindchangeForEdgeMock).toHaveBeenCalledWith(docId, e1.id);
    expect(deleteMindchangeForEdgeMock).toHaveBeenCalledWith(docId, e2.id);
    expect(yMetaMap.has(`mindchange:${e1.id}`)).toBe(false);
    expect(yMetaMap.has(`mindchange:${e2.id}`)).toBe(false);
  });
});
