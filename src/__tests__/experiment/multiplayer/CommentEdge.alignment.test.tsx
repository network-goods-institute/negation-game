import React from "react";
import { render, screen } from "@testing-library/react";
import { ReactFlowProvider, Position } from "@xyflow/react";
import CommentNode from "@/components/experiment/multiplayer/CommentNode";

jest.mock("@xyflow/react", () => {
  const Position = { Top: "top", Bottom: "bottom", Left: "left", Right: "right" } as const;
  const ReactFlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
  const Handle: React.FC<any> = (props) => (
    <div data-testid="handle" data-position={props.position} data-left={props.style?.left} data-top={props.style?.top} />
  );
  const useReactFlow = () => ({
    setNodes: jest.fn(),
    getNodes: jest.fn(() => []),
    getEdges: jest.fn(() => []),
  });
  return { __esModule: true, Position, ReactFlowProvider, Handle, useReactFlow };
});

const Harness: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ReactFlowProvider>
    <div>{children}</div>
  </ReactFlowProvider>
);

describe("CommentNode edge anchor alignment", () => {
  it("uses the same anchor side for source and target handles", () => {
    const { getAllByTestId } = render(
      <Harness>
        <CommentNode id="c-1" selected={false} data={{ content: "" }} />
      </Harness>
    );
    const handles = getAllByTestId("handle");
    expect(handles).toHaveLength(2);
    expect(handles[0].getAttribute("data-position")).toBe(Position.Top);
    expect(handles[1].getAttribute("data-position")).toBe(Position.Top);
    expect(handles[0].getAttribute("data-left")).toBe("12%");
    expect(handles[1].getAttribute("data-left")).toBe("12%");
    expect(handles[0].getAttribute("data-top")).toBe("10%");
    expect(handles[1].getAttribute("data-top")).toBe("10%");
  });
});
