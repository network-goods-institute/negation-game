import { renderHook } from "@testing-library/react";
import { useNodeDragSnapping } from "@/hooks/experiment/multiplayer/useNodeDragSnapping";
import { useReactFlow, useViewport } from "@xyflow/react";

jest.mock("@xyflow/react", () => ({
  useReactFlow: jest.fn(),
  useViewport: jest.fn(),
}));

describe("useNodeDragSnapping", () => {
  const mockUseReactFlow = useReactFlow as jest.Mock;
  const mockUseViewport = useViewport as jest.Mock;

  beforeEach(() => {
    mockUseViewport.mockReturnValue({ x: 0, y: 0, zoom: 1 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when not enabled", () => {
    mockUseReactFlow.mockReturnValue({
      getNodes: jest.fn().mockReturnValue([]),
    });

    const { result } = renderHook(() =>
      useNodeDragSnapping({
        draggedNodeId: "node1",
        draggedPosition: { x: 100, y: 100 },
        enabled: false,
      })
    );

    expect(result.current).toBeNull();
  });

  it("returns null when draggedNodeId is null", () => {
    mockUseReactFlow.mockReturnValue({
      getNodes: jest.fn().mockReturnValue([]),
    });

    const { result } = renderHook(() =>
      useNodeDragSnapping({
        draggedNodeId: null,
        draggedPosition: { x: 100, y: 100 },
        enabled: true,
      })
    );

    expect(result.current).toBeNull();
  });

  it("returns null when draggedPosition is null", () => {
    mockUseReactFlow.mockReturnValue({
      getNodes: jest.fn().mockReturnValue([]),
    });

    const { result } = renderHook(() =>
      useNodeDragSnapping({
        draggedNodeId: "node1",
        draggedPosition: null,
        enabled: true,
      })
    );

    expect(result.current).toBeNull();
  });

  it("snaps to center alignment when nodes are close", () => {
    const draggedNode = {
      id: "node1",
      position: { x: 100, y: 200 },
      width: 100,
      height: 50,
    };

    const otherNode = {
      id: "node2",
      type: "point",
      position: { x: 110, y: 300 },
      width: 100,
      height: 50,
    };

    mockUseReactFlow.mockReturnValue({
      getNodes: jest.fn().mockReturnValue([draggedNode, otherNode]),
    });

    const { result } = renderHook(() =>
      useNodeDragSnapping({
        draggedNodeId: "node1",
        draggedPosition: { x: 100, y: 200 },
        enabled: true,
      })
    );

    expect(result.current).not.toBeNull();
    expect(result.current?.snappedX).toBe(true);
    expect(result.current?.x).toBe(110);
  });

  it("snaps to left edge alignment when edges are close", () => {
    const draggedNode = {
      id: "node1",
      position: { x: 105, y: 200 },
      width: 100,
      height: 50,
    };

    const otherNode = {
      id: "node2",
      type: "point",
      position: { x: 100, y: 300 },
      width: 100,
      height: 50,
    };

    mockUseReactFlow.mockReturnValue({
      getNodes: jest.fn().mockReturnValue([draggedNode, otherNode]),
    });

    const { result } = renderHook(() =>
      useNodeDragSnapping({
        draggedNodeId: "node1",
        draggedPosition: { x: 105, y: 200 },
        enabled: true,
      })
    );

    expect(result.current).not.toBeNull();
    expect(result.current?.snappedX).toBe(true);
    expect(result.current?.x).toBe(100);
  });

  it("snaps to top edge alignment when edges are close", () => {
    const draggedNode = {
      id: "node1",
      position: { x: 100, y: 203 },
      width: 100,
      height: 50,
    };

    const otherNode = {
      id: "node2",
      type: "point",
      position: { x: 300, y: 200 },
      width: 100,
      height: 50,
    };

    mockUseReactFlow.mockReturnValue({
      getNodes: jest.fn().mockReturnValue([draggedNode, otherNode]),
    });

    const { result } = renderHook(() =>
      useNodeDragSnapping({
        draggedNodeId: "node1",
        draggedPosition: { x: 100, y: 203 },
        enabled: true,
      })
    );

    expect(result.current).not.toBeNull();
    expect(result.current?.snappedY).toBe(true);
    expect(result.current?.y).toBe(200);
  });

  it("does not snap when nodes are too far apart", () => {
    const draggedNode = {
      id: "node1",
      position: { x: 100, y: 200 },
      width: 100,
      height: 50,
    };

    const otherNode = {
      id: "node2",
      type: "point",
      position: { x: 200, y: 300 },
      width: 100,
      height: 50,
    };

    mockUseReactFlow.mockReturnValue({
      getNodes: jest.fn().mockReturnValue([draggedNode, otherNode]),
    });

    const { result } = renderHook(() =>
      useNodeDragSnapping({
        draggedNodeId: "node1",
        draggedPosition: { x: 100, y: 200 },
        enabled: true,
      })
    );

    expect(result.current).not.toBeNull();
    expect(result.current?.snappedX).toBe(false);
    expect(result.current?.snappedY).toBe(false);
    expect(result.current?.x).toBe(100);
    expect(result.current?.y).toBe(200);
  });

  it("excludes edge_anchor nodes from snapping", () => {
    const draggedNode = {
      id: "node1",
      position: { x: 100, y: 200 },
      width: 100,
      height: 50,
    };

    const edgeAnchorNode = {
      id: "anchor1",
      type: "edge_anchor",
      position: { x: 105, y: 300 },
      width: 10,
      height: 10,
    };

    mockUseReactFlow.mockReturnValue({
      getNodes: jest.fn().mockReturnValue([draggedNode, edgeAnchorNode]),
    });

    const { result } = renderHook(() =>
      useNodeDragSnapping({
        draggedNodeId: "node1",
        draggedPosition: { x: 100, y: 200 },
        enabled: true,
      })
    );

    expect(result.current).not.toBeNull();
    expect(result.current?.snappedX).toBe(false);
    expect(result.current?.snappedY).toBe(false);
  });

  it("provides snap line coordinates when snapped", () => {
    const draggedNode = {
      id: "node1",
      position: { x: 100, y: 200 },
      width: 100,
      height: 50,
    };

    const otherNode = {
      id: "node2",
      type: "point",
      position: { x: 110, y: 205 },
      width: 100,
      height: 50,
    };

    mockUseReactFlow.mockReturnValue({
      getNodes: jest.fn().mockReturnValue([draggedNode, otherNode]),
    });

    const { result } = renderHook(() =>
      useNodeDragSnapping({
        draggedNodeId: "node1",
        draggedPosition: { x: 100, y: 200 },
        enabled: true,
      })
    );

    expect(result.current).not.toBeNull();
    expect(result.current?.snapLineX).not.toBeNull();
    expect(result.current?.snapLineY).not.toBeNull();
  });
});
