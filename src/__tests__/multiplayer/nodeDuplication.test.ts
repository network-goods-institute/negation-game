import { createDuplicateNodeWithConnections } from "@/utils/experiment/multiplayer/graphOperations/nodeDuplication";

function makeUpdater<T>(arrRef: { current: T[] }) {
  return (updater: (list: T[]) => T[]) => {
    arrRef.current = updater(arrRef.current);
  };
}

test("duplicates point node and preserves incident edges", () => {
  const now = Date.now();
  const nodesRef = {
    current: [
      {
        id: "p-1",
        type: "point",
        position: { x: 0, y: 0 },
        data: { content: "A" },
      },
      {
        id: "p-2",
        type: "point",
        position: { x: 100, y: 0 },
        data: { content: "B" },
      },
    ] as any[],
  };
  const edgesRef = {
    current: [
      {
        id: "e-1",
        type: "negation",
        source: "p-1",
        target: "p-2",
        sourceHandle: "p-1-source-handle",
        targetHandle: "p-2-incoming-handle",
      },
    ] as any[],
  };

  const yNodesMap = new Map();
  const yEdgesMap = new Map();
  const yTextMap = new Map();
  const ydoc = { transact: (fn: () => void) => fn() } as any;

  const duplicate = createDuplicateNodeWithConnections(
    nodesRef.current,
    edgesRef.current,
    yNodesMap as any,
    yEdgesMap as any,
    yTextMap as any,
    ydoc as any,
    true,
    {},
    makeUpdater(nodesRef),
    makeUpdater(edgesRef)
  );

  const newId = duplicate("p-1", { x: 10, y: 10 });
  expect(newId).toBeTruthy();
  const nodes = nodesRef.current;
  const edges = edgesRef.current;
  const dup = nodes.find((n) => n.id === newId);
  expect(dup).toBeTruthy();
  expect(dup!.position).toEqual({ x: 10, y: 10 });
  const incident = edges.filter(
    (e) => e.source === newId || e.target === newId
  );
  expect(incident.length).toBe(1);
  expect(incident[0].type).toBe("negation");
});

test("reattaches objection edges to new copied connection's anchor", () => {
  const nodesRef = {
    current: [
      {
        id: "p-1",
        type: "point",
        position: { x: 0, y: 0 },
        data: { content: "A" },
      },
      {
        id: "p-2",
        type: "point",
        position: { x: 100, y: 0 },
        data: { content: "B" },
      },
      {
        id: "o-1",
        type: "objection",
        position: { x: 50, y: 60 },
        data: { content: "O" },
      },
    ] as any[],
  };
  const baseEdge = {
    id: "e-1",
    type: "negation",
    source: "p-1",
    target: "p-2",
  } as any;
  const objectionAnchorId = `anchor:${baseEdge.id}`;
  const edgesRef = {
    current: [
      baseEdge,
      {
        id: "e-obj",
        type: "objection",
        source: "o-1",
        target: objectionAnchorId,
      } as any,
    ] as any[],
  };

  const yNodesMap = new Map();
  const yEdgesMap = new Map();
  const yTextMap = new Map();
  const ydoc = { transact: (fn: () => void) => fn() } as any;

  const duplicate = createDuplicateNodeWithConnections(
    nodesRef.current,
    edgesRef.current,
    yNodesMap as any,
    yEdgesMap as any,
    yTextMap as any,
    ydoc as any,
    true,
    {},
    makeUpdater(nodesRef),
    makeUpdater(edgesRef)
  );

  const newId = duplicate("p-1", { x: 10, y: 0 });
  expect(newId).toBeTruthy();
  const newEdges = edgesRef.current.filter(
    (e) => e.source === newId || e.target === newId || e.type === "objection"
  );
  const copiedConn = newEdges.find(
    (e) => e.type !== "objection" && (e.source === newId || e.target === newId)
  );
  expect(copiedConn).toBeTruthy();
  const newAnchorId = `anchor:${copiedConn!.id}`;
  const reattached = edgesRef.current.find(
    (e) =>
      e.type === "objection" &&
      (e.source === newAnchorId || e.target === newAnchorId)
  );
  expect(reattached).toBeTruthy();
});
