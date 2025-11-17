import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { MarketPanel } from "../MarketPanel";

const mockNode = {
  id: "node-1",
  data: {
    content: "Node content",
    market: { price: 0.5, mine: 0, total: 0 },
  },
};

jest.mock("@xyflow/react", () => ({
  useReactFlow: () => ({
    getNode: () => mockNode,
    getEdge: jest.fn(),
  }),
}));

jest.mock("@/hooks/market/useBuyAmountPreview", () => ({
  useBuyAmountPreview: () => ({ loading: false, shares: 0 }),
}));

jest.mock("@/utils/market/marketContextMenu", () => ({
  buyAmount: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/utils/market/marketUtils", () => ({
  normalizeSecurityId: (id: string) => id,
  dispatchMarketRefresh: jest.fn(),
}));

jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <>{children}</>,
}));

jest.mock("../MarketPanel/PriceHeader", () => ({
  PriceHeader: () => <div data-testid="price-header" />,
}));

jest.mock("../MarketPanel/ChartSection", () => ({
  ChartSection: () => <div data-testid="chart-section" />,
}));

jest.mock("../MarketPanel/PositionInfo", () => ({
  PositionInfo: () => <div data-testid="position-info" />,
}));

jest.mock("../MarketPanel/TradeControls", () => ({
  TradeControls: () => <div data-testid="trade-controls" />,
}));

jest.mock("../MarketPanel/BuySellButtons", () => ({
  BuySellButtons: () => <div data-testid="buy-sell-buttons" />,
}));

jest.mock("../MarketPanel/ActionButtons", () => ({
  ActionButtons: ({ onClose, onExpand }: any) => (
    <div>
      <button type="button" onClick={onExpand}>
        Expand
      </button>
      <button type="button" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

describe("MarketPanel live node content sync", () => {
  it("updates header title when selectedNodeContent changes", () => {
    const { rerender } = render(
      <MarketPanel
        selectedNodeId="node-1"
        selectedEdgeId={null}
        docId="doc-1"
        onClose={() => {}}
        updateNodeContent={() => {}}
        canEdit
        selectedNodeContent="First title"
      />
    );

    expect(screen.getAllByText("First title").length).toBeGreaterThan(0);

    rerender(
      <MarketPanel
        selectedNodeId="node-1"
        selectedEdgeId={null}
        docId="doc-1"
        onClose={() => {}}
        updateNodeContent={() => {}}
        canEdit
        selectedNodeContent="Updated title"
      />
    );

    expect(screen.getAllByText("Updated title").length).toBeGreaterThan(0);
    expect(screen.queryByText("First title")).toBeNull();
  });

  it("calls updateNodeContent when editing header in expanded mode", () => {
    const updateNodeContent = jest.fn();

    render(
      <MarketPanel
        selectedNodeId="node-1"
        selectedEdgeId={null}
        docId="doc-1"
        onClose={() => {}}
        updateNodeContent={updateNodeContent}
        canEdit
        selectedNodeContent="Header content"
      />
    );

    fireEvent.click(screen.getByText("Expand"));

    const headerInput = screen.getByDisplayValue("Header content");
    fireEvent.change(headerInput, { target: { value: "Changed content" } });

    expect(updateNodeContent).toHaveBeenCalledWith("node-1", "Changed content");
  });
});
