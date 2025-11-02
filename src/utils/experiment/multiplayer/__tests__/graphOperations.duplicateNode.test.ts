import * as Y from "yjs";
import { createDuplicateNodeWithConnections } from "@/utils/experiment/multiplayer/graphOperations/nodeDuplication";

describe("createDuplicateNodeWithConnections - supports all node types", () => {
  const baseNow = Date.now;
  beforeEach(() => {
    jest.spyOn(global.Date, "now").mockReturnValue(1_700_000_000_000);
  });
  afterEach(() => {
    (Date.now as any) = baseNow;
    jest.restoreAllMocks();
  });

  function setupEnv() {
    const ydoc = new Y.Doc();
    const yNodesMap = ydoc.getMap<any>("nodes");
    const yEdgesMap = ydoc.getMap<any>("edges");
    const yTextMap = ydoc.getMap<Y.Text>("node_text");
    const localOrigin = {};
    let nodes: any[] = [];
    let edges: any[] = [];
    const setNodes = (updater: (nodes: any[]) => any[]) => {
      nodes = updater(nodes);
    };
    const setEdges = (updater: (edges: any[]) => any[]) => {
      edges = updater(edges);
    };
    return {
      ydoc,
      yNodesMap,
      yEdgesMap,
      yTextMap,
      localOrigin,
      nodesRef: () => nodes,
      edgesRef: () => edges,
      setNodes,
      setEdges,
    };
  }

  it("duplicates a statement node and copies text", () => {
    const {
      ydoc,
      yNodesMap,
      yEdgesMap,
      yTextMap,
      localOrigin,
      nodesRef,
      setNodes,
      setEdges,
    } = setupEnv();
    const nodes = [
      {
        id: "s-1",
        type: "statement",
        position: { x: 10, y: 10 },
        data: { statement: "Question?", createdAt: 1 },
      },
    ];
    const edges: any[] = [];
    setNodes(() => nodes);
    setEdges(() => edges);
    ydoc.transact(() => {
      yNodesMap.set("s-1", nodes[0] as any);
      const t = new Y.Text();
      t.insert(0, "Question?");
      yTextMap.set("s-1", t);
    });

    const dup = createDuplicateNodeWithConnections(
      nodesRef(),
      edges,
      yNodesMap as any,
      yEdgesMap as any,
      yTextMap as any,
      ydoc as any,
      true,
      localOrigin,
      setNodes as any,
      setEdges as any
    );

    const newId = dup("s-1", { x: 24, y: 24 });
    expect(newId).toBeTruthy();
    const t2 = yTextMap.get(newId!) as Y.Text;
    expect(t2).toBeInstanceOf(Y.Text);
    expect(t2.toString()).toBe("Question?");
  });

  it("duplicates a comment node and copies text", () => {
    const {
      ydoc,
      yNodesMap,
      yEdgesMap,
      yTextMap,
      localOrigin,
      nodesRef,
      setNodes,
      setEdges,
    } = setupEnv();
    const nodes = [
      {
        id: "c-1",
        type: "comment",
        position: { x: 0, y: 0 },
        data: { content: "Note", createdAt: 1 },
      },
    ];
    const edges: any[] = [];
    setNodes(() => nodes);
    setEdges(() => edges);
    ydoc.transact(() => {
      yNodesMap.set("c-1", nodes[0] as any);
      const t = new Y.Text();
      t.insert(0, "Note");
      yTextMap.set("c-1", t);
    });

    const dup = createDuplicateNodeWithConnections(
      nodesRef(),
      edges,
      yNodesMap as any,
      yEdgesMap as any,
      yTextMap as any,
      ydoc as any,
      true,
      localOrigin,
      setNodes as any,
      setEdges as any
    );

    const newId = dup("c-1");
    expect(newId).toBeTruthy();
    const t2 = yTextMap.get(newId!) as Y.Text;
    expect(t2).toBeInstanceOf(Y.Text);
    expect(t2.toString()).toBe("Note");
  });

  it("does not duplicate edge_anchor nodes", () => {
    const {
      ydoc,
      yNodesMap,
      yEdgesMap,
      yTextMap,
      localOrigin,
      nodesRef,
      setNodes,
      setEdges,
    } = setupEnv();
    const nodes = [
      {
        id: "anchor:e-1",
        type: "edge_anchor",
        position: { x: 0, y: 0 },
        data: { parentEdgeId: "e-1" },
      },
    ];
    const edges: any[] = [];
    setNodes(() => nodes);
    setEdges(() => edges);
    const dup = createDuplicateNodeWithConnections(
      nodesRef(),
      edges,
      yNodesMap as any,
      yEdgesMap as any,
      yTextMap as any,
      ydoc as any,
      true,
      localOrigin,
      setNodes as any,
      setEdges as any
    );
    const newId = dup("anchor:e-1");
    expect(newId).toBeNull();
  });
});
