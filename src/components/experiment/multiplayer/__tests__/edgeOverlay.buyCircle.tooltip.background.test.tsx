import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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

jest.mock("@/lib/logger", () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
  },
}));

let rafCallbacks: FrameRequestCallback[] = [];
let originalRaf: typeof requestAnimationFrame;
let originalCancel: typeof cancelAnimationFrame;

beforeAll(() => {
  // @ts-ignore
  global.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  originalRaf = global.requestAnimationFrame;
  originalCancel = global.cancelAnimationFrame;
  // @ts-ignore
  global.requestAnimationFrame = (cb: FrameRequestCallback) => {
    rafCallbacks.push(cb);
    return rafCallbacks.length;
  };
  // @ts-ignore
  global.cancelAnimationFrame = (id: number) => {
    const idx = id - 1;
    if (rafCallbacks[idx]) {
      rafCallbacks[idx] = () => {};
    }
  };
});

afterAll(() => {
  // @ts-ignore
  global.requestAnimationFrame = originalRaf;
  // @ts-ignore
  global.cancelAnimationFrame = originalCancel;
});

beforeEach(() => {
  rafCallbacks = [];
  document.body.innerHTML = "";
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

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient();
  const result = render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  return {
    ...result,
    rerender: (newUi: React.ReactElement) =>
      result.rerender(<QueryClientProvider client={queryClient}>{newUi}</QueryClientProvider>),
  };
};

describe("EdgeOverlay buy circle tooltip background", () => {
  it("shows a backgrounded chart tooltip on hover", () => {
    const props = createProps();
    renderWithProviders(<EdgeOverlay {...props} />);

    const buyButton = screen.getByRole("button", { name: /buy/i });
    fireEvent.mouseEnter(buyButton.parentElement as HTMLElement);

    const tooltip = screen.getByTestId("buy-circle-tooltip");
    expect(tooltip).toBeInTheDocument();
    expect(tooltip.className).toMatch(/bg-white|bg-amber-50/);
    expect(tooltip.className).toMatch(/rounded-md/);
    expect(tooltip.className).toMatch(/shadow-md/);
  });

  it("repositions once the anchor element appears", () => {
    const props = createProps({ selected: true, isHovered: false });
    const { container } = renderWithProviders(<EdgeOverlay {...props} />);

    const overlay = container.querySelector('[data-edge-overlay-container="edge-1"]') as HTMLElement;
    expect(overlay).toBeTruthy();
    const initialLeft = overlay.style.left;
    expect(rafCallbacks.length).toBeGreaterThan(0);

    const anchor = document.createElement("div");
    anchor.setAttribute("data-id", "anchor:edge-1");
    (anchor as any).getBoundingClientRect = () => ({
      left: 200,
      top: 300,
      width: 20,
      height: 20,
      right: 220,
      bottom: 320,
      x: 200,
      y: 300,
      toJSON: () => ({}),
    });
    document.body.appendChild(anchor);

    act(() => {
      while (rafCallbacks.length) {
        const cbs = [...rafCallbacks];
        rafCallbacks = [];
        cbs.forEach((cb) => cb(0));
      }
    });

    expect(overlay.style.left).not.toBe(initialLeft);
    expect(overlay.style.left).toBe("210px");
    expect(overlay.style.top).toBe("310px");
  });

  it("updates position when the window resizes", () => {
    const anchor = document.createElement("div");
    anchor.setAttribute("data-id", "anchor:edge-1");
    let rect = {
      left: 50,
      top: 60,
      width: 20,
      height: 20,
      right: 70,
      bottom: 80,
      x: 50,
      y: 60,
      toJSON: () => ({}),
    };
    (anchor as any).getBoundingClientRect = () => rect;
    document.body.appendChild(anchor);

    const props = createProps({ selected: true, isHovered: false, cx: 0, cy: 0 });
    const { container, rerender } = renderWithProviders(<EdgeOverlay {...props} />);

    act(() => {
      while (rafCallbacks.length) {
        const cbs = [...rafCallbacks];
        rafCallbacks = [];
        cbs.forEach((cb) => cb(0));
      }
    });

    const overlay = container.querySelector('[data-edge-overlay-container="edge-1"]') as HTMLElement;
    expect(overlay.style.left).toBe("60px");
    expect(overlay.style.top).toBe("70px");

    rect = { left: 150, top: 200, width: 40, height: 40, right: 190, bottom: 240, x: 150, y: 200, toJSON: () => ({}) };
    rerender(
      <QueryClientProvider>
        <EdgeOverlay {...props} />
      </QueryClientProvider>
    );

    act(() => {
      window.dispatchEvent(new Event("resize"));
      while (rafCallbacks.length) {
        const cbs = [...rafCallbacks];
        rafCallbacks = [];
        cbs.forEach((cb) => cb(0));
      }
    });

    expect(overlay.style.left).toBe("170px");
    expect(overlay.style.top).toBe("220px");
  });

  it("repositions when edge coordinates change without a resize", () => {
    const anchor = document.createElement("div");
    anchor.setAttribute("data-anchor-edge-id", "edge-1");
    let rect = { left: 10, top: 20, width: 20, height: 20, right: 30, bottom: 40, x: 10, y: 20, toJSON: () => ({}) };
    (anchor as any).getBoundingClientRect = () => rect;
    document.body.appendChild(anchor);

    const props = createProps({ selected: true, isHovered: false, cx: 0, cy: 0 });
    const { container, rerender } = renderWithProviders(<EdgeOverlay {...props} />);

    act(() => {
      while (rafCallbacks.length) {
        const cbs = [...rafCallbacks];
        rafCallbacks = [];
        cbs.forEach((cb) => cb(0));
      }
    });

    const overlay = container.querySelector('[data-edge-overlay-container="edge-1"]') as HTMLElement;
    expect(overlay.style.left).toBe("20px");
    expect(overlay.style.top).toBe("30px");

    rect = { left: 80, top: 120, width: 30, height: 30, right: 110, bottom: 150, x: 80, y: 120, toJSON: () => ({}) };
    rerender(
      <QueryClientProvider>
        <EdgeOverlay {...props} />
      </QueryClientProvider>
    );

    act(() => {
      while (rafCallbacks.length) {
        const cbs = [...rafCallbacks];
        rafCallbacks = [];
        cbs.forEach((cb) => cb(0));
      }
    });

    expect(overlay.style.left).toBe("95px");
    expect(overlay.style.top).toBe("135px");
  });
});
