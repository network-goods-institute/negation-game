import React from "react";
import { render, act } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { GraphUpdater } from "../../multiplayer/GraphUpdater";

describe("GraphUpdater centering behavior", () => {
  test("does not reposition existing nodes on initial mount; centers only new nodes", async () => {
    const parent: any = {
      id: "parent-1",
      type: "point",
      position: { x: 100, y: 100 },
      data: {},
      measured: { width: 200, height: 100 },
    };
    const childExisting: any = {
      id: "child-existing",
      type: "point",
      position: { x: 120, y: 220 },
      data: {},
      measured: { width: 100, height: 80 },
    };
    const edgeExisting: any = {
      id: "e1",
      type: "support",
      source: "child-existing",
      target: "parent-1",
    };

    let latestNodes: any[] = [parent, childExisting];
    const edges: any[] = [edgeExisting];
    const setNodes = (updater: (nodes: any[]) => any[]) => {
      latestNodes = updater(latestNodes);
    };
    const setNodesSpy = jest.fn(setNodes);

    let centerQueue: string[] = [];
    let version = 0;
    const consume = () => {
      const out = centerQueue;
      centerQueue = [];
      return out;
    };

    const { rerender } = render(
      <ReactFlowProvider>
        <GraphUpdater
          nodes={latestNodes as any}
          edges={edges as any}
          setNodes={setNodesSpy as any}
          documentId="doc-1"
          centerQueueVersion={version}
          consumeCenterQueue={consume}
        />
      </ReactFlowProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(setNodesSpy).toHaveBeenCalledTimes(0);

    const childNew: any = {
      id: "child-new",
      type: "point",
      position: { x: 0, y: 300 },
      data: {},
      measured: { width: 120, height: 80 },
    };
    const edgeNew: any = {
      id: "e2",
      type: "support",
      source: "child-new",
      target: "parent-1",
    };

    latestNodes = [parent, childExisting, childNew];
    const edges2 = [edgeExisting, edgeNew];

    // Queue the new node for centering and bump version
    centerQueue = ["child-new"];
    version += 1;

    rerender(
      <ReactFlowProvider>
        <GraphUpdater
          nodes={latestNodes as any}
          edges={edges2 as any}
          setNodes={setNodesSpy as any}
          documentId="doc-1"
          centerQueueVersion={version}
          consumeCenterQueue={consume}
        />
      </ReactFlowProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(setNodesSpy).toHaveBeenCalledTimes(1);

    const centeredX = 100 + 200 / 2 - 120 / 2; // parent.x + parent.w/2 - child.w/2
    const updatedNew = latestNodes.find((n) => n.id === "child-new");
    expect(Math.abs(updatedNew.position.x - centeredX)).toBeLessThan(0.11);
  });
});
