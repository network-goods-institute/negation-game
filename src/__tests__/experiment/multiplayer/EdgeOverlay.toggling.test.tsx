import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { getDefaultStore } from "jotai";
import { QueryClientProvider } from "@/components/providers/QueryClientProvider";

import { EdgeOverlay, EdgeOverlayProps } from "@/components/experiment/multiplayer/common/EdgeOverlay";
import { MarketOverlayState, defaultZoomThreshold, marketOverlayStateAtom, marketOverlayZoomThresholdAtom } from "@/atoms/marketOverlayAtom";

let mockTransform: [number, number, number] = [0, 0, 1];

jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@xyflow/react", () => ({
  __esModule: true,
  EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useStore: (selector: (state: { transform: [number, number, number] }) => [number, number, number]) =>
    selector({ transform: mockTransform }),
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

const store = getDefaultStore();
const originalMarketEnv = process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED;

const setOverlayState = (state: MarketOverlayState, zoomThreshold = defaultZoomThreshold) => {
  store.set(marketOverlayStateAtom, state);
  store.set(marketOverlayZoomThresholdAtom, zoomThreshold);
};

beforeEach(() => {
  setOverlayState("AUTO_TEXT", defaultZoomThreshold);
  mockTransform = [0, 0, 1];
  process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED = originalMarketEnv;
});

afterAll(() => {
  setOverlayState("AUTO_TEXT", defaultZoomThreshold);
  mockTransform = [0, 0, 1];
  process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED = originalMarketEnv;
});

const createProps = (overrides: Partial<EdgeOverlayProps> = {}): EdgeOverlayProps => ({
  cx: 40,
  cy: 80,
  isHovered: false,
  edgeId: "edge-1",
  edgeType: "support",
  onMouseEnter: jest.fn(),
  onMouseLeave: jest.fn(),
  onAddObjection: jest.fn(),
  onToggleEdgeType: jest.fn(),
  ...overrides,
});

describe("EdgeOverlay edge type toggling", () => {
  it("keeps overlay visible when switching edge type", () => {
    const onMouseEnter = jest.fn();
    const onMouseLeave = jest.fn();
    const onToggleEdgeType = jest.fn();

    const props = createProps({
      onMouseEnter,
      onMouseLeave,
      onToggleEdgeType,
    });

    render(
      <QueryClientProvider>
        <EdgeOverlay {...props} />
      </QueryClientProvider>
    );

    const anchor = screen.getByTestId("edge-overlay-anchor");
    fireEvent.mouseEnter(anchor);

    const toggleButton = screen.getByTestId("toggle-edge-type");
    fireEvent.mouseEnter(toggleButton);
    fireEvent.mouseLeave(anchor);

    fireEvent.click(toggleButton);

    expect(onToggleEdgeType).toHaveBeenCalledTimes(1);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expect(onMouseLeave).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("toggle-edge-type")).toBeInTheDocument();
  });
});

describe("EdgeOverlay market overlay visibility", () => {
  it("shows price circle when overlay side is TEXT", () => {
    process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED = "true";
    setOverlayState("LOCK_TEXT");

    render(
      <QueryClientProvider>
        <EdgeOverlay {...createProps()} />
      </QueryClientProvider>
    );

    const anchor = screen.getByTestId("edge-overlay-anchor");
    fireEvent.mouseEnter(anchor);

    expect(screen.getByText("Mitigate")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /buy/i })).toBeInTheDocument();
  });

  it("shows price circle when overlay side is PRICE", () => {
    process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED = "true";
    mockTransform = [0, 0, 0.4];

    render(
      <QueryClientProvider>
        <EdgeOverlay {...createProps({ marketPrice: 0.4 })} />
      </QueryClientProvider>
    );

    const anchor = screen.getByTestId("edge-overlay-anchor");
    fireEvent.mouseEnter(anchor);

    expect(screen.getByRole("button", { name: /buy/i })).toBeInTheDocument();
  });
});

