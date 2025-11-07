import { createGraphChangeHandlers } from "@/utils/experiment/multiplayer/graphSync";
import * as Y from "yjs";

describe("graphSync onEdgeAdded callback", () => {
  it("invokes onEdgeAdded after onConnect persists edge", () => {
    const doc = new Y.Doc();
    const yNodes = doc.getMap<any>("nodes");
    const yEdges = doc.getMap<any>("edges");

    // Seed nodes so connect can succeed
    yNodes.set("a", { id: "a", type: "point", position: { x: 0, y: 0 }, data: {} });
    yNodes.set("b", { id: "b", type: "point", position: { x: 0, y: 0 }, data: {} });

    const setNodes = (updater: any) => { /* no-op for this unit */ };
    const setEdges = (updater: any) => { /* no-op for this unit */ };

    const onEdgeAdded = jest.fn();

    const { onConnect } = createGraphChangeHandlers(
      setNodes as any,
      setEdges as any,
      yNodes as any,
      yEdges as any,
      doc as any,
      () => {},
      {},
      () => [{ id: "a" } as any, { id: "b" } as any],
      () => "support",
      false,
      onEdgeAdded
    );

    onConnect({ source: "a", target: "b", sourceHandle: null, targetHandle: null });

    expect(onEdgeAdded).toHaveBeenCalledTimes(1);
    const edgeArg = onEdgeAdded.mock.calls[0][0];
    expect(edgeArg.source).toBe("a");
    expect(edgeArg.target).toBe("b");
  });
});
