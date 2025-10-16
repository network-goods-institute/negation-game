import React from "react";
import { render, act } from "@testing-library/react";
import { ReactFlowProvider, Node as FlowNode } from "@xyflow/react";
import * as Y from "yjs";
import { GraphUpdater } from "@/components/experiment/multiplayer/GraphUpdater";
import { mergeNodesWithText } from "@/hooks/experiment/multiplayer/yjs/text";

const clonePositions = (nodes: FlowNode[]) =>
  nodes.reduce<Record<string, { x: number; y: number }>>((acc, n) => {
    acc[n.id] = { x: n.position.x, y: n.position.y };
    return acc;
  }, {});

const samePositions = (
  before: Record<string, { x: number; y: number }>,
  after: Record<string, { x: number; y: number }>
) => {
  const ids = Object.keys(before);
  for (const id of ids) {
    const a = before[id];
    const b = after[id];
    if (!b) return false;
    if (a.x !== b.x || a.y !== b.y) return false;
  }
  return true;
};

describe("Board layout stability across updates", () => {
  test("positions remain unchanged across non-structural updates", async () => {
    const parent: any = {
      id: "p1",
      type: "point",
      position: { x: 200, y: 100 },
      data: { content: "Parent", favor: 5 },
      measured: { width: 300, height: 120 },
    };
    const child: any = {
      id: "c1",
      type: "point",
      position: { x: 220, y: 260 },
      data: { content: "Child", favor: 5 },
      measured: { width: 120, height: 80 },
    };
    const nodesInitial: any[] = [parent, child];
    const edges: any[] = [
      { id: "e1", type: "support", source: "c1", target: "p1" },
    ];

    let nodes = nodesInitial.slice();
    const setNodes = (updater: (n: any[]) => any[]) => {
      nodes = updater(nodes);
    };

    const snapshotA = clonePositions(nodes as any);

    const { rerender } = render(
      <ReactFlowProvider>
        <GraphUpdater
          nodes={nodes as any}
          edges={edges as any}
          setNodes={setNodes as any}
          documentId="doc-layout"
        />
      </ReactFlowProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    const snapshotAfterMount = clonePositions(nodes as any);
    expect(samePositions(snapshotA, snapshotAfterMount)).toBe(true);

    const doc = new Y.Doc();
    const yTextMap = doc.getMap<Y.Text>("node_text");
    const tParent = new Y.Text();
    tParent.insert(0, "Parent updated");
    const tChild = new Y.Text();
    tChild.insert(0, "Child updated");
    yTextMap.set("p1", tParent);
    yTextMap.set("c1", tChild);

    const prevById = new Map<string, any>(nodes.map((n: any) => [n.id, n]));
    nodes = mergeNodesWithText(nodes as any, yTextMap, prevById);

    rerender(
      <ReactFlowProvider>
        <GraphUpdater
          nodes={nodes as any}
          edges={edges as any}
          setNodes={setNodes as any}
          documentId="doc-layout"
        />
      </ReactFlowProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    const snapshotB = clonePositions(nodes as any);
    expect(samePositions(snapshotA, snapshotB)).toBe(true);
  });
});

