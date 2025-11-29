import { renderHook, act } from "@testing-library/react";
import * as Y from "yjs";
import type { Edge, Node } from "@xyflow/react";
import { MutableRefObject } from "react";

import {
  createAddPointBelow,
  createDeleteNode,
  createUpdateNodeContent,
} from "@/utils/experiment/multiplayer/graphOperations";
import { useYjsUndoRedo } from "@/hooks/experiment/multiplayer/useYjsUndoRedo";


interface TestEnv {
  doc: Y.Doc;
  yNodesMap: Y.Map<Node>;
  yEdgesMap: Y.Map<Edge>;
  yTextMap: Y.Map<Y.Text>;
  yMetaMap: Y.Map<unknown>;
  localOrigin: Record<string, never>;
  getNodes: () => any[];
  getEdges: () => any[];
  setNodes: (updater: (nodes: any[]) => any[]) => any[];
  setEdges: (updater: (edges: any[]) => any[]) => any[];
  syncFromDoc: () => void;
}

const buildEnv = (
  initialNodes: Node[],
  initialEdges: Edge[],
  initialTexts: Record<string, string> = {}
): TestEnv => {
  const doc = new Y.Doc();
  const yNodesMap = doc.getMap<Node>("nodes");
  const yEdgesMap = doc.getMap<Edge>("edges");
  const yTextMap = doc.getMap<Y.Text>("node_text");
  const yMetaMap = doc.getMap<unknown>("meta");
  const localOrigin: Record<string, never> = {};

  doc.transact(() => {
    initialNodes.forEach((node) => {
      yNodesMap.set(node.id, node as any);
      const textValue =
        node.type === "statement"
          ? (node.data as any)?.statement
          : (node.data as any)?.content;
      if (typeof textValue === "string" && textValue.length > 0) {
        const text = new Y.Text();
        text.insert(0, textValue);
        yTextMap.set(node.id, text);
      }
    });
    initialEdges.forEach((edge) => yEdgesMap.set(edge.id, edge as any));
    Object.entries(initialTexts).forEach(([id, value]) => {
      const text = new Y.Text();
      text.insert(0, value);
      yTextMap.set(id, text);
    });
  }, localOrigin);

  let latestNodes = initialNodes.map((node) => ({
    ...node,
    data: { ...(node.data as any) },
  }));
  let latestEdges = initialEdges.map((edge) => ({
    ...edge,
    data: { ...(edge.data as any) },
  }));

  const setNodes = (updater: (nodes: any[]) => any[]) => {
    latestNodes = updater(latestNodes);
    return latestNodes;
  };

  const setEdges = (updater: (edges: any[]) => any[]) => {
    latestEdges = updater(latestEdges);
    return latestEdges;
  };

  const syncFromDoc = () => {
    latestNodes = Array.from(yNodesMap.values()).map((node) => ({
      ...node,
      data: { ...(node.data as any) },
    }));
    latestEdges = Array.from(yEdgesMap.values()).map((edge) => ({
      ...edge,
      data: { ...(edge.data as any) },
    }));
  };

  return {
    doc,
    yNodesMap,
    yEdgesMap,
    yTextMap,
    yMetaMap,
    localOrigin,
    getNodes: () => latestNodes,
    getEdges: () => latestEdges,
    setNodes,
    setEdges,
    syncFromDoc,
  };
};

const makeLastAddRef = () =>
  ({ current: {} }) as MutableRefObject<Record<string, number>>;
const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe("multiplayer undo integration", () => {
  it("undoes and redoes node creation", () => {
    const env = buildEnv(
      [
        {
          id: "parent",
          type: "point",
          position: { x: 0, y: 0 },
          data: { content: "Parent", favor: 5 },
        } as Node,
      ],
      []
    );

    const hook = renderHook(() =>
      useYjsUndoRedo({
        yNodesMapRef: { current: env.yNodesMap },
        yEdgesMapRef: { current: env.yEdgesMap },
        yTextMapRef: { current: env.yTextMap },
        yMetaMapRef: { current: env.yMetaMap },
        localOriginRef: { current: env.localOrigin },
        isUndoRedoRef: { current: false },
      })
    );
    let cleanup: (() => void) | undefined;
    act(() => {
      cleanup = hook.result.current.setupUndoManager();
    });

    const addPointBelow = createAddPointBelow(
      env.getNodes(),
      env.yNodesMap,
      env.yEdgesMap,
      env.yTextMap,
      env.doc,
      true,
      env.localOrigin,
      makeLastAddRef(),
      env.setNodes,
      env.setEdges
    );

    act(() => {
      addPointBelow("parent");
    });
    env.syncFromDoc();
    const createdNode = env.getNodes().find((node) => node.id !== "parent");
    expect(createdNode).toBeDefined();
    expect(env.yNodesMap.has(createdNode!.id)).toBe(true);
    expect(env.getEdges().length).toBe(1);
    const createdEdgeIds = env.getEdges().map((edge) => edge.id);

    act(() => {
      hook.result.current.undo();
    });
    env.syncFromDoc();

    expect(env.yNodesMap.has(createdNode!.id)).toBe(false);
    expect(env.getNodes().some((node) => node.id === createdNode!.id)).toBe(
      false
    );
    createdEdgeIds.forEach((id) => {
      expect(env.yEdgesMap.has(id)).toBe(false);
    });
    expect(env.getEdges().length).toBe(0);

    act(() => {
      hook.result.current.redo();
    });
    env.syncFromDoc();

    expect(env.yNodesMap.has(createdNode!.id)).toBe(true);
    expect(env.getNodes().some((node) => node.id === createdNode!.id)).toBe(
      true
    );
    createdEdgeIds.forEach((id) => {
      expect(env.yEdgesMap.has(id)).toBe(true);
    });
    expect(env.getEdges().length).toBe(1);

    act(() => {
      cleanup?.();
    });
  });

  it("undoes node deletion", () => {
    const env = buildEnv(
      [
        {
          id: "parent",
          type: "point",
          position: { x: 0, y: 0 },
          data: { content: "Parent", favor: 5 },
        } as Node,
        {
          id: "child",
          type: "point",
          position: { x: 0, y: 120 },
          data: { content: "Child", favor: 5 },
        } as Node,
      ],
      [
        {
          id: "edge-1",
          type: "support",
          source: "child",
          target: "parent",
        } as Edge,
      ]
    );

    const hook = renderHook(() =>
      useYjsUndoRedo({
        yNodesMapRef: { current: env.yNodesMap },
        yEdgesMapRef: { current: env.yEdgesMap },
        yTextMapRef: { current: env.yTextMap },
        yMetaMapRef: { current: env.yMetaMap },
        localOriginRef: { current: env.localOrigin },
        isUndoRedoRef: { current: false },
      })
    );
    let cleanup: (() => void) | undefined;
    act(() => {
      cleanup = hook.result.current.setupUndoManager();
    });

    const deleteNode = createDeleteNode(
      env.getNodes(),
      env.getEdges(),
      env.yNodesMap,
      env.yEdgesMap,
      env.yTextMap,
      env.doc,
      true,
      env.localOrigin,
      env.setNodes,
      env.setEdges
    );

    act(() => {
      deleteNode("child");
    });
    env.syncFromDoc();

    expect(env.yNodesMap.has("child")).toBe(false);
    expect(env.yEdgesMap.has("edge-1")).toBe(false);

    act(() => {
      hook.result.current.undo();
    });
    env.syncFromDoc();

    expect(env.yNodesMap.has("child")).toBe(true);
    expect(env.yEdgesMap.has("edge-1")).toBe(true);

    act(() => {
      cleanup?.();
    });
  });

  it("undoes node content edits", () => {
    const env = buildEnv(
      [
        {
          id: "node-1",
          type: "point",
          position: { x: 0, y: 0 },
          data: { content: "Original", favor: 5 },
        } as Node,
      ],
      []
    );

    const hook = renderHook(() =>
      useYjsUndoRedo({
        yNodesMapRef: { current: env.yNodesMap },
        yEdgesMapRef: { current: env.yEdgesMap },
        yTextMapRef: { current: env.yTextMap },
        yMetaMapRef: { current: env.yMetaMap },
        localOriginRef: { current: env.localOrigin },
        isUndoRedoRef: { current: false },
      })
    );
    let cleanup: (() => void) | undefined;
    act(() => {
      cleanup = hook.result.current.setupUndoManager();
    });

    const updateContent = createUpdateNodeContent(
      env.yTextMap,
      env.doc,
      true,
      env.localOrigin,
      env.setNodes
    );

    act(() => {
      updateContent("node-1", "Updated content");
    });
    const text = env.yTextMap.get("node-1") as Y.Text;
    expect(text.toString()).toBe("Updated content");

    act(() => {
      hook.result.current.undo();
    });
    expect((env.yTextMap.get("node-1") as Y.Text).toString()).toBe("Original");

    act(() => {
      hook.result.current.redo();
    });
    expect((env.yTextMap.get("node-1") as Y.Text).toString()).toBe(
      "Updated content"
    );

    act(() => {
      cleanup?.();
    });
  });

});
