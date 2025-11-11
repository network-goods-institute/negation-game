import React from "react";
import { render } from "@testing-library/react";
import ObjectionNode from "@/components/experiment/multiplayer/objection/ObjectionNode";
import { ReactFlowProvider } from "@xyflow/react";

// Mock only useStore from @xyflow/react to control edges/nodeInternals seen by the component.
const actualXY = jest.requireActual("@xyflow/react");

type StoreShape = {
  edges: Array<{ id: string; type?: string; source: string; target: string }>;
  nodeInternals: Map<string, { position?: { x?: number; y?: number } }>;
};

let mockStore: StoreShape = {
  edges: [],
  nodeInternals: new Map(),
};

jest.mock("@xyflow/react", () => {
  const actual = jest.requireActual("@xyflow/react");
  return {
    ...actual,
    useStore: (selector: (s: any) => any) => selector({
      edges: mockStore.edges,
      nodeInternals: {
        get: (id: string) => mockStore.nodeInternals.get(id),
      },
    }),
  };
});

describe("ObjectionNode point-like behavior", () => {
  const baseProps = {
    id: "obj-1",
    selected: false,
    data: { content: "" },
  } as any;

  beforeEach(() => {
    mockStore = { edges: [], nodeInternals: new Map() };
  });

  it("renders 'New point' when there are no objection edges", () => {
    mockStore.edges = [
      { id: "e1", type: "support", source: "x", target: "y" },
    ];

    const { getByText } = render(
      <ReactFlowProvider>
        <ObjectionNode {...baseProps} />
      </ReactFlowProvider>
    );
    expect(getByText(/New point/i)).toBeInTheDocument();
  });

  it("renders 'New mitigation' when there is an outgoing objection edge", () => {
    mockStore.edges = [
      { id: "oe1", type: "objection", source: "obj-1", target: "anchor-1" },
    ];

    const { getByText } = render(
      <ReactFlowProvider>
        <ObjectionNode {...baseProps} />
      </ReactFlowProvider>
    );
    expect(getByText(/New mitigation/i)).toBeInTheDocument();
  });

  it("renders 'New point' when a negation is connected, even with an outgoing objection", () => {
    mockStore.edges = [
      { id: "oe1", type: "objection", source: "obj-1", target: "anchor-1" },
      { id: "e2", type: "support", source: "obj-1", target: "n2" },
      { id: "e3", type: "negation", source: "n3", target: "obj-1" },
    ];

    const { getByText } = render(
      <ReactFlowProvider>
        <ObjectionNode {...baseProps} />
      </ReactFlowProvider>
    );
    expect(getByText(/New point/i)).toBeInTheDocument();
  });
});


