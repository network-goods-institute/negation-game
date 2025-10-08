import { renderHook, act } from "@testing-library/react";
import * as Y from "yjs";
import { useYjsUndoRedo } from "@/hooks/experiment/multiplayer/useYjsUndoRedo";
import { ORIGIN } from "@/hooks/experiment/multiplayer/yjs/origins";
import type { Edge, Node } from "@xyflow/react";

describe("undo stacks ignore meta (save) writes", () => {
  it("meta writes do not affect canUndo and are not undone", () => {
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

    // Save/meta write with SAVE origin
    act(() => {
      doc.transact(() => {
        metaMap.set("saving", true);
        metaMap.set("savingSince", Date.now());
      }, ORIGIN.SAVE);
    });

    expect(hook.result.current.canUndo).toBe(false);

    // Real user op: add a node
    act(() => {
      doc.transact(() => {
        nodesMap.set("n1", { id: "n1", type: "point", position: { x: 0, y: 0 }, data: {} } as Node);
      }, userOrigin);
    });

    expect(hook.result.current.canUndo).toBe(true);

    act(() => hook.result.current.undo());
    expect(nodesMap.has("n1")).toBe(false);

    act(() => cleanup?.());
  });
});
