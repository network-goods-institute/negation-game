import React from "react";
import { render, act } from "@testing-library/react";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { GraphUpdater } from "../GraphUpdater";

jest.mock("@xyflow/react", () => {
  const actual = jest.requireActual("@xyflow/react");
  return {
    ...actual,
    useReactFlow: jest.fn(),
  };
});

const mockGetNode = jest.fn();
const mockUseReactFlow = useReactFlow as jest.Mock;

describe("GraphUpdater nested objection anchor creation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReactFlow.mockReturnValue({
      getNode: mockGetNode,
    });
  });

  test("creates anchor nodes for objection edges targeting base edges", async () => {
    const pointA: any = {
      id: "point-a",
      type: "point",
      position: { x: 0, y: 0 },
      data: {},
      measured: { width: 100, height: 50 },
    };
    const pointB: any = {
      id: "point-b",
      type: "point",
      position: { x: 200, y: 0 },
      data: {},
      measured: { width: 100, height: 50 },
    };
    const objectionNode: any = {
      id: "obj-1",
      type: "objection",
      position: { x: 100, y: -100 },
      data: { parentEdgeId: "edge-1" },
      measured: { width: 80, height: 40 },
    };

    const baseEdge: any = {
      id: "edge-1",
      type: "support",
      source: "point-a",
      target: "point-b",
    };
    const objectionEdge: any = {
      id: "obj-edge-1",
      type: "objection",
      source: "obj-1",
      target: "anchor:edge-1",
    };

    mockGetNode.mockImplementation((id: string) => {
      if (id === "point-a") return pointA;
      if (id === "point-b") return pointB;
      if (id === "obj-1") return objectionNode;
      return undefined;
    });

    let latestNodes: any[] = [pointA, pointB, objectionNode];
    const edges: any[] = [baseEdge, objectionEdge];
    const setNodes = (updater: (nodes: any[]) => any[]) => {
      latestNodes = updater(latestNodes);
    };
    const setNodesSpy = jest.fn(setNodes);

    render(
      <ReactFlowProvider>
        <GraphUpdater
          nodes={latestNodes as any}
          edges={edges as any}
          setNodes={setNodesSpy as any}
          documentId="doc-1"
        />
      </ReactFlowProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(setNodesSpy).toHaveBeenCalled();

    const anchorNode = latestNodes.find((n) => n.id === "anchor:edge-1");
    expect(anchorNode).toBeDefined();
    expect(anchorNode?.type).toBe("edge_anchor");
    expect(anchorNode?.data?.parentEdgeId).toBe("edge-1");
  });

  test("creates anchor nodes for nested objection edges (objection targeting objection edge)", async () => {
    const pointA: any = {
      id: "point-a",
      type: "point",
      position: { x: 0, y: 0 },
      data: {},
      measured: { width: 100, height: 50 },
    };
    const pointB: any = {
      id: "point-b",
      type: "point",
      position: { x: 200, y: 0 },
      data: {},
      measured: { width: 100, height: 50 },
    };
    const objectionNodeA: any = {
      id: "obj-a",
      type: "objection",
      position: { x: 100, y: -100 },
      data: { parentEdgeId: "base-edge" },
      measured: { width: 80, height: 40 },
    };
    const objectionNodeB: any = {
      id: "obj-b",
      type: "objection",
      position: { x: 100, y: -200 },
      data: { parentEdgeId: "obj-edge-a" },
      measured: { width: 80, height: 40 },
    };

    const baseEdge: any = {
      id: "base-edge",
      type: "support",
      source: "point-a",
      target: "point-b",
    };
    const objectionEdgeA: any = {
      id: "obj-edge-a",
      type: "objection",
      source: "obj-a",
      target: "anchor:base-edge",
    };
    const objectionEdgeB: any = {
      id: "obj-edge-b",
      type: "objection",
      source: "obj-b",
      target: "anchor:obj-edge-a",
    };

    mockGetNode.mockImplementation((id: string) => {
      if (id === "point-a") return pointA;
      if (id === "point-b") return pointB;
      if (id === "obj-a") return objectionNodeA;
      if (id === "obj-b") return objectionNodeB;
      return undefined;
    });

    let latestNodes: any[] = [pointA, pointB, objectionNodeA, objectionNodeB];
    const edges: any[] = [baseEdge, objectionEdgeA, objectionEdgeB];
    const setNodes = (updater: (nodes: any[]) => any[]) => {
      latestNodes = updater(latestNodes);
    };
    const setNodesSpy = jest.fn(setNodes);

    render(
      <ReactFlowProvider>
        <GraphUpdater
          nodes={latestNodes as any}
          edges={edges as any}
          setNodes={setNodesSpy as any}
          documentId="doc-1"
        />
      </ReactFlowProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(setNodesSpy).toHaveBeenCalled();

    const anchorBaseEdge = latestNodes.find((n) => n.id === "anchor:base-edge");
    expect(anchorBaseEdge).toBeDefined();
    expect(anchorBaseEdge?.type).toBe("edge_anchor");
    expect(anchorBaseEdge?.data?.parentEdgeId).toBe("base-edge");

    const anchorObjEdgeA = latestNodes.find((n) => n.id === "anchor:obj-edge-a");
    expect(anchorObjEdgeA).toBeDefined();
    expect(anchorObjEdgeA?.type).toBe("edge_anchor");
    expect(anchorObjEdgeA?.data?.parentEdgeId).toBe("obj-edge-a");
  });

  test("handles triple-nested objection edges", async () => {
    const pointA: any = {
      id: "point-a",
      type: "point",
      position: { x: 0, y: 0 },
      data: {},
      measured: { width: 100, height: 50 },
    };
    const pointB: any = {
      id: "point-b",
      type: "point",
      position: { x: 200, y: 0 },
      data: {},
      measured: { width: 100, height: 50 },
    };
    const objA: any = {
      id: "obj-a",
      type: "objection",
      position: { x: 100, y: -100 },
      data: {},
      measured: { width: 80, height: 40 },
    };
    const objB: any = {
      id: "obj-b",
      type: "objection",
      position: { x: 100, y: -200 },
      data: {},
      measured: { width: 80, height: 40 },
    };
    const objC: any = {
      id: "obj-c",
      type: "objection",
      position: { x: 100, y: -300 },
      data: {},
      measured: { width: 80, height: 40 },
    };

    const baseEdge: any = { id: "e-base", type: "support", source: "point-a", target: "point-b" };
    const objEdgeA: any = { id: "e-obj-a", type: "objection", source: "obj-a", target: "anchor:e-base" };
    const objEdgeB: any = { id: "e-obj-b", type: "objection", source: "obj-b", target: "anchor:e-obj-a" };
    const objEdgeC: any = { id: "e-obj-c", type: "objection", source: "obj-c", target: "anchor:e-obj-b" };

    mockGetNode.mockImplementation((id: string) => {
      if (id === "point-a") return pointA;
      if (id === "point-b") return pointB;
      if (id === "obj-a") return objA;
      if (id === "obj-b") return objB;
      if (id === "obj-c") return objC;
      return undefined;
    });

    let latestNodes: any[] = [pointA, pointB, objA, objB, objC];
    const edges: any[] = [baseEdge, objEdgeA, objEdgeB, objEdgeC];
    const setNodes = (updater: (nodes: any[]) => any[]) => {
      latestNodes = updater(latestNodes);
    };
    const setNodesSpy = jest.fn(setNodes);

    render(
      <ReactFlowProvider>
        <GraphUpdater
          nodes={latestNodes as any}
          edges={edges as any}
          setNodes={setNodesSpy as any}
          documentId="doc-1"
        />
      </ReactFlowProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(setNodesSpy).toHaveBeenCalled();

    expect(latestNodes.find((n) => n.id === "anchor:e-base")).toBeDefined();
    expect(latestNodes.find((n) => n.id === "anchor:e-obj-a")).toBeDefined();
    expect(latestNodes.find((n) => n.id === "anchor:e-obj-b")).toBeDefined();

    expect(latestNodes.find((n) => n.id === "anchor:e-base")?.type).toBe("edge_anchor");
    expect(latestNodes.find((n) => n.id === "anchor:e-obj-a")?.type).toBe("edge_anchor");
    expect(latestNodes.find((n) => n.id === "anchor:e-obj-b")?.type).toBe("edge_anchor");
  });

  test("does not create anchors while in connect mode", async () => {
    const pointA: any = {
      id: "point-a",
      type: "point",
      position: { x: 0, y: 0 },
      data: {},
    };
    const objNode: any = {
      id: "obj-1",
      type: "objection",
      position: { x: 100, y: -100 },
      data: {},
    };
    const baseEdge: any = { id: "e1", type: "support", source: "point-a", target: "point-a" };
    const objEdge: any = { id: "obj-e1", type: "objection", source: "obj-1", target: "anchor:e1" };

    mockGetNode.mockImplementation((id: string) => {
      if (id === "point-a") return pointA;
      if (id === "obj-1") return objNode;
      return undefined;
    });

    let latestNodes: any[] = [pointA, objNode];
    const setNodes = (updater: (nodes: any[]) => any[]) => {
      latestNodes = updater(latestNodes);
    };
    const setNodesSpy = jest.fn(setNodes);

    render(
      <ReactFlowProvider>
        <GraphUpdater
          nodes={latestNodes as any}
          edges={[baseEdge, objEdge] as any}
          setNodes={setNodesSpy as any}
          documentId="doc-1"
          connectMode={true}
        />
      </ReactFlowProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(setNodesSpy).not.toHaveBeenCalled();
    expect(latestNodes.find((n) => n.id === "anchor:e1")).toBeUndefined();
  });
});

