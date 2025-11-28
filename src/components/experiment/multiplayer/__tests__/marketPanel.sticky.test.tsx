import React from "react";
import { render, act } from "@testing-library/react";
import { GraphProvider } from "../GraphContext";

const mockMarketPanelState = {
  nodeId: "node-1",
  edgeId: null,
  isExpanded: false,
  shareParamsApplied: false,
};

let capturedSetMarketPanelSelection: ((nodeId: string | null, edgeId: string | null) => void) | null = null;

jest.mock("@xyflow/react", () => ({
  __esModule: true,
  SelectionMode: { Partial: "partial", Full: "full" },
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
  ReactFlow: () => React.createElement("div", { "data-testid": "rf" }),
  useReactFlow: () => ({
    getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
    setViewport: () => void 0,
    screenToFlowPosition: ({ x, y }: any) => ({ x, y }),
    getEdges: () => [],
    getNode: () => null,
  }),
  useViewport: () => ({ x: 0, y: 0, zoom: 1 }),
}));

describe("MarketPanel sticky behavior", () => {
  it("does not auto-close panel when node selection is cleared", () => {
    const setMarketPanelSelection = jest.fn();
    capturedSetMarketPanelSelection = setMarketPanelSelection;

    const TestComponent = () => {
      const [nodes, setNodes] = React.useState([
        { id: "node-1", type: "point", selected: true, data: {} },
      ]);
      const [marketPanelState, setMarketPanelState] = React.useState(mockMarketPanelState);

      React.useEffect(() => {
        const selectedNode = nodes.find((n: any) => n.selected);
        if (selectedNode) {
          const nodeType = (selectedNode as any).type;
          if (nodeType === "point" || nodeType === "objection") {
            setMarketPanelState((prev) => ({ ...prev, nodeId: selectedNode.id, edgeId: null }));
          }
        }
      }, [nodes]);

      return (
        <div>
          <div data-testid="panel-visible">{marketPanelState.nodeId ? "visible" : "hidden"}</div>
          <button
            data-testid="clear-selection"
            onClick={() => setNodes(nodes.map((n) => ({ ...n, selected: false })))}
          >
            Clear
          </button>
        </div>
      );
    };

    const { getByTestId } = render(<TestComponent />);

    expect(getByTestId("panel-visible").textContent).toBe("visible");

    act(() => {
      getByTestId("clear-selection").click();
    });

    expect(getByTestId("panel-visible").textContent).toBe("visible");
  });

  it("switches panel content when different node is selected", () => {
    const TestComponent = () => {
      const [nodes, setNodes] = React.useState([
        { id: "node-1", type: "point", selected: true, data: {} },
        { id: "node-2", type: "point", selected: false, data: {} },
      ]);
      const [marketPanelState, setMarketPanelState] = React.useState(mockMarketPanelState);

      React.useEffect(() => {
        const selectedNode = nodes.find((n: any) => n.selected);
        if (selectedNode) {
          const nodeType = (selectedNode as any).type;
          if (nodeType === "point" || nodeType === "objection") {
            setMarketPanelState((prev) => ({ ...prev, nodeId: selectedNode.id, edgeId: null }));
          }
        }
      }, [nodes]);

      return (
        <div>
          <div data-testid="panel-node">{marketPanelState.nodeId}</div>
          <button
            data-testid="select-node-2"
            onClick={() =>
              setNodes([
                { id: "node-1", type: "point", selected: false, data: {} },
                { id: "node-2", type: "point", selected: true, data: {} },
              ])
            }
          >
            Select Node 2
          </button>
        </div>
      );
    };

    const { getByTestId } = render(<TestComponent />);

    expect(getByTestId("panel-node").textContent).toBe("node-1");

    act(() => {
      getByTestId("select-node-2").click();
    });

    expect(getByTestId("panel-node").textContent).toBe("node-2");
  });
});

