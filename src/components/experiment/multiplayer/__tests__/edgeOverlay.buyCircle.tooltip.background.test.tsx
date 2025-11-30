import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { EdgeOverlay, EdgeOverlayProps } from "@/components/experiment/multiplayer/common/EdgeOverlay";

jest.mock("@xyflow/react", () => ({
  __esModule: true,
  EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useStore: (selector: (s: { transform: [number, number, number] }) => [number, number, number]) => selector({ transform: [0, 0, 0.5] }),
  useReactFlow: () => ({
    zoomIn: jest.fn(),
    zoomOut: jest.fn(),
  }),
}));

jest.mock("react-dom", () => {
  const actual = jest.requireActual("react-dom");
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

jest.mock("@/components/experiment/multiplayer/GraphContext", () => ({
  useGraphActions: () => ({ overlayActiveEdgeId: null, setOverlayActiveEdge: jest.fn(), grabMode: false, connectMode: false }),
}));

jest.mock("jotai", () => {
  const actual = jest.requireActual("jotai");
  return {
    ...actual,
    useAtomValue: () => "LOCK_PRICE",
  };
});

jest.mock("@/utils/market/marketUtils", () => ({
  ...jest.requireActual("@/utils/market/marketUtils"),
  isMarketEnabled: () => true,
}));

beforeAll(() => {
  // @ts-ignore
  global.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
});

const createProps = (overrides: Partial<EdgeOverlayProps> = {}): EdgeOverlayProps => ({
  cx: 40,
  cy: 80,
  isHovered: true,
  edgeId: "edge-1",
  edgeType: "support",
  onMouseEnter: jest.fn(),
  onMouseLeave: jest.fn(),
  onAddObjection: jest.fn(),
  onToggleEdgeType: jest.fn(),
  marketPrice: 0.42,
  ...overrides,
});

describe("EdgeOverlay buy circle tooltip background", () => {
  it("shows a backgrounded chart tooltip on hover", () => {
    const props = createProps();
    render(<EdgeOverlay {...props} />);

    const buyButton = screen.getByRole("button", { name: /buy/i });
    fireEvent.mouseEnter(buyButton.parentElement as HTMLElement);

    const tooltip = screen.getByTestId("buy-circle-tooltip");
    expect(tooltip).toBeInTheDocument();
    expect(tooltip.className).toMatch(/bg-white|bg-amber-50/);
    expect(tooltip.className).toMatch(/rounded-md/);
    expect(tooltip.className).toMatch(/shadow-md/);
  });
});
