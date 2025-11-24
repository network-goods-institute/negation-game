import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { EdgePriceOverlay } from "../EdgePriceOverlay";

const mockUseViewport = jest.fn();
const mockGetNode = jest.fn();
const mockGetEdge = jest.fn();
const mockGetNodes = jest.fn();
const mockUseAtomValue = jest.fn();

jest.mock("@xyflow/react", () => ({
  __esModule: true,
  Position: { Right: "right", Left: "left" },
  getBezierPath: jest.fn(() => ["", 0, 0, 0, 0, 0]),
  getStraightPath: jest.fn(() => ["", 0, 0]),
  useReactFlow: () => ({
    getNode: mockGetNode,
    getEdge: mockGetEdge,
    getNodes: mockGetNodes,
  }),
  useViewport: () => mockUseViewport(),
}));

jest.mock("react-dom", () => {
  const actual = jest.requireActual("react-dom");
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

jest.mock("../GraphContext", () => ({
  useGraphActions: () => ({ overlayActiveEdgeId: null, hoveredEdgeId: null }),
}));

jest.mock("jotai", () => ({
  atom: (...args: any[]) => ({ key: args }),
  useAtomValue: (...args: any[]) => mockUseAtomValue(...args),
}));

const makeRect = (left: number, top: number) => ({
  left,
  top,
  width: 40,
  height: 20,
  right: left + 40,
  bottom: top + 20,
  x: left,
  y: top,
  toJSON: () => ({}),
});

const attachAnchor = (edgeId: string, rect = makeRect(100, 50)) => {
  const anchor = document.createElement("div");
  anchor.setAttribute("data-anchor-edge-id", edgeId);
  (anchor as any).getBoundingClientRect = () => rect;
  document.querySelector(".react-flow__viewport")?.appendChild(anchor);
};

beforeAll(() => {
  (global as any).requestAnimationFrame = () => 0;
  (global as any).cancelAnimationFrame = () => {};
});

beforeEach(() => {
  mockUseAtomValue.mockReturnValue("PRICE");
  mockUseViewport.mockReturnValue({ zoom: 1, x: 0, y: 0 });
  mockGetNode.mockReset();
  mockGetEdge.mockReset();
  mockGetNodes.mockReset();
  document.body.innerHTML = "";
  const viewport = document.createElement("div");
  viewport.className = "react-flow__viewport";
  (viewport as any).getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 800,
    height: 600,
    right: 800,
    bottom: 600,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  document.body.appendChild(viewport);
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  jest.clearAllMocks();
});

describe("EdgePriceOverlay", () => {
  it("keeps overlay size stable across zoom by scaling in flow coordinates", () => {
    attachAnchor("edge-1");
    const edge = { id: "edge-1", source: "a", target: "b", type: "support", data: { market: { price: 0.5 } } };
    mockGetNodes.mockReturnValue([]);
    mockGetNode.mockReturnValue({ position: { x: 0, y: 0 }, width: 10, height: 10 });
    mockGetEdge.mockReturnValue(edge as any);
    let viewportState = { zoom: 1, x: 0, y: 0 };
    mockUseViewport.mockImplementation(() => viewportState);

    const { rerender } = render(<EdgePriceOverlay edges={[edge as any]} />);
    const svgAtOne = document.querySelector("svg") as SVGElement;
    const widthAtOne = Number(svgAtOne.getAttribute("width"));
    expect(widthAtOne).toBeGreaterThan(0);

    viewportState = { zoom: 0.2, x: 0, y: 0 };
    rerender(<EdgePriceOverlay edges={[edge as any]} />);
    const svgAtLowZoom = document.querySelector("svg") as SVGElement;
    const widthAtLowZoom = Number(svgAtLowZoom.getAttribute("width"));

    expect(widthAtOne).toBeGreaterThan(0);
    expect(widthAtOne).toBeCloseTo(widthAtLowZoom * 0.2, 1);
  });

  it("falls back to the parent edge price for objections without their own market price", () => {
    attachAnchor("base-1", makeRect(40, 40));
    attachAnchor("obj-1", makeRect(140, 40));
    const baseEdge = { id: "base-1", source: "n1", target: "n2", type: "support", data: { market: { price: 0.37 } } };
    const objectionEdge = { id: "obj-1", source: "obj", target: "anchor:base-1", type: "objection", data: {} };
    const edgesById: Record<string, any> = {
      "base-1": baseEdge,
      "obj-1": objectionEdge,
    };
    mockGetNodes.mockReturnValue([]);
    mockGetEdge.mockImplementation((id: string) => edgesById[id] || null);
    mockGetNode.mockImplementation((id: string) => {
      if (id === "anchor:base-1") {
        return { data: { parentEdgeId: "base-1" } };
      }
      return { position: { x: 0, y: 0 }, width: 10, height: 10 };
    });

    render(<EdgePriceOverlay edges={[baseEdge as any, objectionEdge as any]} />);

    expect(screen.getAllByText("37%")).toHaveLength(2);
    expect(screen.queryByText("50%")).toBeNull();
  });
});
