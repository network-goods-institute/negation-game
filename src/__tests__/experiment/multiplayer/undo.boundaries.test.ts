import { renderHook, act } from "@testing-library/react";
import * as Y from "yjs";
import { useYjsUndoRedo } from "@/hooks/experiment/multiplayer/useYjsUndoRedo";
import type { Edge, Node } from "@xyflow/react";

describe("undo boundaries via stopCapturing", () => {
  it("separates operations into distinct undo steps", () => {
    const doc = new Y.Doc();
    const nodesMap = doc.getMap<Node>("nodes");
    const edgesMap = doc.getMap<Edge>("edges");
    const textMap = doc.getMap<Y.Text>("node_text");
    const metaMap = doc.getMap<unknown>("meta");

    const userOrigin: object = {};
    const hook = renderHook(() =>
      useYjsUndoRedo({
        yNodesMapRef: { current: nodesMap },
        yEdgesMapRef: { current: edgesMap },
        yTextMapRef: { current: textMap },
        yMetaMapRef: { current: metaMap },
        localOriginRef: { current: userOrigin },
        isUndoRedoRef: { current: false },
      })
    );

    let cleanup: (() => void) | undefined;
    act(() => {
      cleanup = hook.result.current.setupUndoManager();
    });

    // First op
    act(() => {
      doc.transact(() => {
        nodesMap.set("a", { id: "a", type: "point", position: { x: 0, y: 0 }, data: {} } as Node);
      }, userOrigin);
    });
    // Boundary
    act(() => hook.result.current.stopCapturing());

    // Second op
    act(() => {
      doc.transact(() => {
        nodesMap.set("b", { id: "b", type: "point", position: { x: 10, y: 0 }, data: {} } as Node);
      }, userOrigin);
    });

    // Undo should remove b but keep a
    act(() => hook.result.current.undo());
    expect(nodesMap.has("b")).toBe(false);
    expect(nodesMap.has("a")).toBe(true);

    // Undo again should remove a
    act(() => hook.result.current.undo());
    expect(nodesMap.has("a")).toBe(false);

    act(() => cleanup?.());
  });
});
