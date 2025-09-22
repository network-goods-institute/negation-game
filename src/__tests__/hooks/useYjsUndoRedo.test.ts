import { renderHook, act } from "@testing-library/react";
import * as Y from "yjs";
import { useYjsUndoRedo } from "@/hooks/experiment/multiplayer/useYjsUndoRedo";
import type { Edge, Node } from "@xyflow/react";

describe("useYjsUndoRedo", () => {
  const setup = () => {
    const doc = new Y.Doc();
    const nodesMap = doc.getMap<Node>("nodes");
    const edgesMap = doc.getMap<Edge>("edges");
    const textMap = doc.getMap<Y.Text>("node_text");
    const metaMap = doc.getMap<unknown>("meta");
    const localOrigin = {};
    const isUndoRedoRef = { current: false };

    const hooks = renderHook(() =>
      useYjsUndoRedo({
        yNodesMapRef: { current: nodesMap },
        yEdgesMapRef: { current: edgesMap },
        yTextMapRef: { current: textMap },
        yMetaMapRef: { current: metaMap },
        localOriginRef: { current: localOrigin },
        isUndoRedoRef,
      })
    );

    return { doc, nodesMap, edgesMap, textMap, metaMap, localOrigin, hooks, isUndoRedoRef };
  };

  it("tracks structural mutations", () => {
    const { doc, nodesMap, localOrigin, hooks } = setup();
    let cleanup: (() => void) | undefined;

    act(() => {
      cleanup = hooks.result.current.setupUndoManager();
    });

    act(() => {
      doc.transact(() => {
        nodesMap.set("n1", {
          id: "n1",
          type: "point",
          position: { x: 0, y: 0 },
          data: { content: "hello" },
        } as Node);
      }, localOrigin);
    });

    expect(hooks.result.current.canUndo).toBe(true);

    act(() => {
      hooks.result.current.undo();
    });

    expect(nodesMap.has("n1")).toBe(false);
    expect(hooks.result.current.canRedo).toBe(true);

    act(() => {
      hooks.result.current.redo();
    });

    expect(nodesMap.has("n1")).toBe(true);

    act(() => {
      cleanup?.();
    });
  });

  it("keeps undo stacks scoped per client origin", () => {
    const doc = new Y.Doc();
    const nodesMap = doc.getMap<Node>("nodes");
    const edgesMap = doc.getMap<Edge>("edges");
    const textMap = doc.getMap<Y.Text>("node_text");
    const metaMap = doc.getMap<unknown>("meta");

    const originA = {};
    const originB = {};

    const localHook = renderHook(() =>
      useYjsUndoRedo({
        yNodesMapRef: { current: nodesMap },
        yEdgesMapRef: { current: edgesMap },
        yTextMapRef: { current: textMap },
        yMetaMapRef: { current: metaMap },
        localOriginRef: { current: originA },
        isUndoRedoRef: { current: false },
      })
    );

    const remoteHook = renderHook(() =>
      useYjsUndoRedo({
        yNodesMapRef: { current: nodesMap },
        yEdgesMapRef: { current: edgesMap },
        yTextMapRef: { current: textMap },
        yMetaMapRef: { current: metaMap },
        localOriginRef: { current: originB },
        isUndoRedoRef: { current: false },
      })
    );

    let cleanupA: (() => void) | undefined;
    let cleanupB: (() => void) | undefined;

    act(() => {
      cleanupA = localHook.result.current.setupUndoManager();
      cleanupB = remoteHook.result.current.setupUndoManager();
    });

    act(() => {
      doc.transact(() => {
        nodesMap.set("local-node", {
          id: "local-node",
          type: "point",
          position: { x: 0, y: 0 },
          data: { content: "Local", favor: 5 },
        } as Node);
      }, originA);
    });

    expect(localHook.result.current.canUndo).toBe(true);
    expect(remoteHook.result.current.canUndo).toBe(false);

    act(() => {
      remoteHook.result.current.undo();
    });
    expect(nodesMap.has("local-node")).toBe(true);

    act(() => {
      localHook.result.current.undo();
    });
    expect(nodesMap.has("local-node")).toBe(false);

    act(() => {
      localHook.result.current.redo();
    });
    expect(nodesMap.has("local-node")).toBe(true);

    act(() => {
      cleanupA?.();
      cleanupB?.();
    });
  });
});
