import { renderHook, act } from "@testing-library/react";
import * as Y from "yjs";
import { useYjsUndoRedo } from "@/hooks/experiment/multiplayer/useYjsUndoRedo";

describe("mindchange meta is undo/redoable", () => {
  it("tracks yMetaMap mindchange entries with undo manager", () => {
    const doc = new Y.Doc();
    const yNodesMap = doc.getMap<any>("nodes");
    const yEdgesMap = doc.getMap<any>("edges");
    const yTextMap = doc.getMap<Y.Text>("node_text");
    const yMetaMap = doc.getMap("meta");
    const localOrigin: Record<string, never> = {};

    const hook = renderHook(() =>
      useYjsUndoRedo({
        yNodesMapRef: { current: yNodesMap },
        yEdgesMapRef: { current: yEdgesMap },
        yTextMapRef: { current: yTextMap },
        yMetaMapRef: { current: yMetaMap },
        localOriginRef: { current: localOrigin },
        isUndoRedoRef: { current: false },
      })
    );

    let cleanup: (() => void) | undefined;
    act(() => {
      cleanup = hook.result.current.setupUndoManager();
    });

    act(() => {
      doc.transact(() => {
        yMetaMap.set("mindchange:e1", {
          forward: 60,
          backward: 20,
          forwardCount: 3,
          backwardCount: 2,
        });
      }, localOrigin);
    });
    act(() => {
      hook.result.current.stopCapturing();
    });
    expect(yMetaMap.get("mindchange:e1")).toBeTruthy();
    const firstValue = yMetaMap.get("mindchange:e1") as any;
    expect(firstValue.forward).toBe(60);

    act(() => {
      doc.transact(() => {
        yMetaMap.set("mindchange:e1", {
          forward: 10,
          backward: 5,
          forwardCount: 1,
          backwardCount: 1,
        });
      }, localOrigin);
    });
    const secondValue = yMetaMap.get("mindchange:e1") as any;
    expect(secondValue.forward).toBe(10);

    act(() => {
      hook.result.current.undo();
    });
    const afterUndo = yMetaMap.get("mindchange:e1") as any;
    expect(afterUndo.forward).toBe(60);

    act(() => {
      hook.result.current.redo();
    });
    const afterRedo = yMetaMap.get("mindchange:e1") as any;
    expect(afterRedo.forward).toBe(10);

    act(() => {
      cleanup?.();
    });
  });
});
