import { createGraphChangeHandlers } from "@/utils/experiment/multiplayer/graphSync";

type Edge = any;

describe("edge sync upsert-only", () => {
  const immediateRaf = () => {
    const g: any = global as any;
    if (!g.window) (g.window = {} as any);
    g.window.requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0 as any);
      return 0 as any;
    };
    g.window.cancelAnimationFrame = () => {};
  };

  beforeEach(() => {
    immediateRaf();
  });

  it("does not delete unknown remote edges when local next is empty", () => {
    const yEdges = new Map<string, Edge>();
    yEdges.set("remote-1", { id: "remote-1", source: "a", target: "b", type: "negation" });
    const ydoc = { transact: (fn: () => void) => fn() } as any;

    let edges: Edge[] = [];
    const setEdges = (updater: any) => {
      edges = updater(edges);
      return edges;
    };

    const h = createGraphChangeHandlers(
      () => [],
      setEdges as any,
      null as any,
      yEdges as any,
      ydoc as any,
      // not used for edges now
      (() => {}) as any,
      {}
    );

    h.onEdgesChange([]);

    expect(yEdges.has("remote-1")).toBe(true);
  });

  it("upserts new local edges without deleting others", () => {
    const yEdges = new Map<string, Edge>();
    yEdges.set("remote-2", { id: "remote-2", source: "x", target: "y", type: "option" });
    const ydoc = { transact: (fn: () => void) => fn() } as any;

    let edges: Edge[] = [];
    const setEdges = (updater: any) => {
      edges = updater(edges);
      return edges;
    };

    const h = createGraphChangeHandlers(
      () => [],
      setEdges as any,
      null as any,
      yEdges as any,
      ydoc as any,
      (() => {}) as any,
      {}
    );

    const newEdge: Edge = { id: "local-1", source: "n1", target: "n2", type: "negation" };
    h.onEdgesChange([{ type: "add", item: newEdge } as any]);

    expect(yEdges.has("remote-2")).toBe(true);
    expect(yEdges.has("local-1")).toBe(true);
  });
});

