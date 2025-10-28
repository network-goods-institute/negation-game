import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { EdgeOverlay, EdgeOverlayProps } from "@/components/experiment/multiplayer/common/EdgeOverlay";

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
    selector({ transform: [0, 0, 1] }),
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

    render(<EdgeOverlay {...props} />);

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

