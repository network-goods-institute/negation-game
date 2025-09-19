import * as Y from "yjs";
import type { Node } from "@xyflow/react";
import { mergeNodesWithText } from "../text";

describe("mergeNodesWithText", () => {
  const basePoint = (): Node => ({
    id: "n1",
    type: "point",
    position: { x: 0, y: 0 },
    data: { content: "old", favor: 5 },
    draggable: true,
  });

  it("applies Y.Text content updates and preserves prior selection", () => {
    const doc = new Y.Doc();
    const yTextMap = doc.getMap<Y.Text>("node_text");
    const text = new Y.Text();
    text.insert(0, "new content");
    yTextMap.set("n1", text);

    const previous = new Map<string, Node>([["n1", { ...basePoint(), selected: true }]]);
    const nodes: Node[] = [{ ...basePoint(), selected: false }];

    const [result] = mergeNodesWithText(nodes, yTextMap, previous);

    expect(result.data?.content).toBe("new content");
    expect(result.selected).toBe(true);
  });

  it("falls back to previous content when text is missing", () => {
    const doc = new Y.Doc();
    const emptyMap = doc.getMap<Y.Text>("node_text");
    const previous = new Map<string, Node>([[
      "n1",
      { ...basePoint(), data: { content: "persisted", favor: 5 }, selected: true },
    ]]);

    const nodes: Node[] = [{ ...basePoint(), data: { content: "stale", favor: 5 }, selected: false }];

    const [result] = mergeNodesWithText(nodes, null, previous);

    expect(result.data?.content).toBe("stale");
    expect(result.selected).toBe(false);

    const [fallbackResult] = mergeNodesWithText(nodes, emptyMap, previous);
    expect(fallbackResult.data?.content).toBe("persisted");
    expect(fallbackResult.selected).toBe(true);
  });

  it("disables dragging for nodes with a parent and keeps statement text", () => {
    const doc = new Y.Doc();
    const yTextMap = doc.getMap<Y.Text>("node_text");
    const text = new Y.Text();
    text.insert(0, "updated statement");
    yTextMap.set("n2", text);

    const statementNode: Node = {
      id: "n2",
      type: "statement",
      position: { x: 0, y: 0 },
      parentId: "group-1",
      data: { statement: "initial" },
      draggable: true,
    };

    const [result] = mergeNodesWithText([statementNode], yTextMap, undefined);

    expect(result.data?.statement).toBe("updated statement");
    expect(result.draggable).toBe(false);
    expect(result.selected).toBe(false);
  });
});
