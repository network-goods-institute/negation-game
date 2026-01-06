import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { GraphProvider } from "../GraphContext";
import { GraphCanvas } from "../GraphCanvas";
import { dispatchMarketPanelClose } from "@/utils/market/marketEvents";

jest.mock("@/utils/market/marketEvents", () => ({
  dispatchMarketPanelClose: jest.fn(),
}));

jest.mock("@xyflow/react", () => {
  return {
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
      getNode: () => null,
    }),
    useNodesInitialized: () => true,
    useViewport: () => ({ x: 0, y: 0, zoom: 1 }),
  };
});

describe("GraphCanvas panning does not close market panel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not dispatch panel close when mousedown on pane in grabMode", () => {
    const { getByTestId } = render(
      <GraphProvider
        value={{
          clearNodeSelection: jest.fn(),
          setSelectedEdge: jest.fn(),
          connectMode: false,
        } as any}
      >
        <GraphCanvas
          nodes={[] as any}
          edges={[] as any}
          authenticated={true}
          onNodesChange={() => {}}
          onEdgesChange={() => {}}
          onConnect={() => {}}
          onNodeClick={() => {}}
          provider={null as any}
          cursors={new Map()}
          username={"u"}
          userColor={"#000"}
          grabMode={true}
          panOnDrag={[1]}
          panOnScroll={true}
          zoomOnScroll={false}
          selectMode={false}
          blurAllNodes={0}
          isMarketPanelVisible={true}
        />
      </GraphProvider>
    );

    const paneEl = document.createElement("div");
    paneEl.className = "react-flow__pane";
    document.body.appendChild(paneEl);

    fireEvent.mouseDown(paneEl, { button: 0, bubbles: true });

    expect(dispatchMarketPanelClose).not.toHaveBeenCalled();

    document.body.removeChild(paneEl);
  });

  it("does not dispatch panel close when mousedown with middle mouse button", () => {
    const { getByTestId } = render(
      <GraphProvider
        value={{
          clearNodeSelection: jest.fn(),
          setSelectedEdge: jest.fn(),
          connectMode: false,
        } as any}
      >
        <GraphCanvas
          nodes={[] as any}
          edges={[] as any}
          authenticated={true}
          onNodesChange={() => {}}
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
          selectMode={true}
          blurAllNodes={0}
          isMarketPanelVisible={true}
        />
      </GraphProvider>
    );

    const paneEl = document.createElement("div");
    paneEl.className = "react-flow__pane";
    document.body.appendChild(paneEl);

    fireEvent.mouseDown(paneEl, { button: 1, bubbles: true });

    expect(dispatchMarketPanelClose).not.toHaveBeenCalled();

    document.body.removeChild(paneEl);
  });

  it("dispatches panel close on left click when not in grabMode", () => {
    const root = render(
      <GraphProvider
        value={{
          clearNodeSelection: jest.fn(),
          setSelectedEdge: jest.fn(),
          connectMode: false,
        } as any}
      >
        <GraphCanvas
          nodes={[] as any}
          edges={[] as any}
          authenticated={true}
          onNodesChange={() => {}}
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
          selectMode={true}
          blurAllNodes={0}
          isMarketPanelVisible={true}
        />
      </GraphProvider>
    );

    const graphRoot = root.getByTestId("graph-canvas-root");

    const paneEl = document.createElement("div");
    paneEl.className = "react-flow__pane";
    graphRoot.appendChild(paneEl);

    fireEvent.mouseDown(paneEl, { button: 0, bubbles: true });

    expect(dispatchMarketPanelClose).toHaveBeenCalled();

    graphRoot.removeChild(paneEl);
  });
});
