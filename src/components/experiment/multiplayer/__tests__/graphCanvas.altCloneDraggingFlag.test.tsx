import React from "react";
import { render, act } from "@testing-library/react";
import { GraphProvider } from "../GraphContext";
import { GraphCanvas } from "../GraphCanvas";

jest.mock("@xyflow/react", () => ({
  __esModule: true,
  SelectionMode: { Partial: "partial", Full: "full" },
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
  ReactFlow: (props: any) => {
    (globalThis as any).__rfProps = props;
    return React.createElement("div", { "data-testid": "rf" });
  },
  useReactFlow: () => ({
    getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
    setViewport: () => void 0,
    screenToFlowPosition: ({ x, y }: any) => ({ x, y }),
    getEdges: () => [],
    getNodes: () => [],
    getNode: () => null,
  }),
  useNodesInitialized: () => true,
  useViewport: () => ({ x: 0, y: 0, zoom: 1 }),
}));

const original = { id: "point-1", type: "point", position: { x: 100, y: 200 } };

const dragChange = (dragging: boolean, position: { x: number; y: number }) => ({
  id: original.id,
  type: "position",
  position,
  dragging,
});

const renderCanvas = () => {
  const onNodesChange = jest.fn();
  const graph = {
    clearNodeSelection: jest.fn(),
    setSelectedEdge: jest.fn(),
    connectMode: false,
    duplicateNodeWithConnections: jest.fn(() => "point-2"),
    lockNode: jest.fn(),
    unlockNode: jest.fn(),
    updateNodePosition: jest.fn(),
    stopCapturing: jest.fn(),
  };
  render(
    <GraphProvider value={graph as any}>
      <GraphCanvas
        nodes={[] as any}
        edges={[] as any}
        authenticated={true}
        canWrite={true}
        onNodesChange={onNodesChange}
        onEdgesChange={() => {}}
        onConnect={() => {}}
        onNodeClick={() => {}}
        provider={null as any}
        cursors={new Map()}
        username={"u"}
        userColor={"#000"}
        grabMode={false}
        panOnDrag={[1]}
        panOnScroll={true}
        zoomOnScroll={false}
        selectMode={false}
        blurAllNodes={0}
      />
    </GraphProvider>
  );
  const rf = () => (globalThis as any).__rfProps;
  return { onNodesChange, graph, rf };
};

describe("GraphCanvas alt-drag clone dragging flag", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("routes in-flight drag changes to the clone and clears both when React Flow ends the drag", () => {
    const { onNodesChange, graph, rf } = renderCanvas();

    act(() => {
      rf().onNodeDragStart({ altKey: true, clientX: 120, clientY: 220 }, original);
    });
    expect(graph.duplicateNodeWithConnections).toHaveBeenCalledWith("point-1", { x: 20, y: 20 });

    act(() => {
      rf().onNodesChange([dragChange(true, { x: 140, y: 240 })]);
    });
    expect(onNodesChange).toHaveBeenLastCalledWith([
      { id: "point-2", type: "position", position: { x: 140, y: 240 }, dragging: true },
    ]);

    act(() => {
      rf().onNodesChange([dragChange(false, { x: 160, y: 260 })]);
    });
    expect(onNodesChange).toHaveBeenLastCalledWith([
      { id: "point-1", type: "position", dragging: false },
      { id: "point-2", type: "position", dragging: false },
    ]);
  });

  it("clears the clone's dragging flag when the end change arrives after drag stop", () => {
    const { onNodesChange, rf } = renderCanvas();

    act(() => {
      rf().onNodeDragStart({ altKey: true, clientX: 120, clientY: 220 }, original);
      rf().onNodesChange([dragChange(true, { x: 140, y: 240 })]);
      rf().onNodeDragStop({}, { ...original, position: { x: 160, y: 260 } });
    });

    act(() => {
      rf().onNodesChange([dragChange(false, { x: 160, y: 260 })]);
    });
    expect(onNodesChange).toHaveBeenLastCalledWith([
      { id: "point-1", type: "position", dragging: false },
      { id: "point-2", type: "position", dragging: false },
    ]);
  });

  it("only clears the dragged node when a plain drag ends", () => {
    const { onNodesChange, graph, rf } = renderCanvas();

    act(() => {
      rf().onNodeDragStart({ altKey: false, clientX: 120, clientY: 220 }, original);
      rf().onNodesChange([dragChange(true, { x: 140, y: 240 })]);
    });
    expect(graph.duplicateNodeWithConnections).not.toHaveBeenCalled();
    expect(onNodesChange).toHaveBeenLastCalledWith([dragChange(true, { x: 140, y: 240 })]);

    act(() => {
      rf().onNodesChange([dragChange(false, { x: 160, y: 260 })]);
    });
    expect(onNodesChange).toHaveBeenLastCalledWith([
      { id: "point-1", type: "position", dragging: false },
    ]);
  });
});
