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

  it("preserves object identity when only position changes (critical for concurrent drag + edit)", () => {
    const doc = new Y.Doc();
    const yTextMap = doc.getMap<Y.Text>("node_text");
    const text = new Y.Text();
    text.insert(0, "stable content");
    yTextMap.set("n1", text);

    // First render: establish previous node
    const initialNode: Node = {
      id: "n1",
      type: "point",
      position: { x: 0, y: 0 },
      data: { content: "stable content", favor: 5 },
      draggable: true,
      selected: false,
    };

    const [firstResult] = mergeNodesWithText([initialNode], yTextMap, undefined);

    // Build previous map with the first result
    const previous = new Map<string, Node>([["n1", firstResult]]);

    // Second render: same content, different position (simulating remote drag)
    const movedNode: Node = {
      id: "n1",
      type: "point",
      position: { x: 100, y: 50 }, // Position changed
      data: { content: "stable content", favor: 5 }, // Content unchanged
      draggable: true,
      selected: false,
    };

    const [secondResult] = mergeNodesWithText([movedNode], yTextMap, previous);

    // Critical assertion: object identity preserved when only position changed
    // This prevents React from reconciling the component and losing contentEditable focus
    expect(secondResult).toBe(firstResult); // Same object reference!

    // Position should still be updated
    expect(secondResult.position).toEqual({ x: 100, y: 50 });
  });

  it("creates new object when content changes (does not preserve identity)", () => {
    const doc = new Y.Doc();
    const yTextMap = doc.getMap<Y.Text>("node_text");

    // First render with initial content
    const initialText = new Y.Text();
    initialText.insert(0, "initial content");
    yTextMap.set("n1", initialText);

    const initialNode: Node = {
      id: "n1",
      type: "point",
      position: { x: 0, y: 0 },
      data: { content: "initial content", favor: 5 },
      draggable: true,
      selected: false,
    };

    const [firstResult] = mergeNodesWithText([initialNode], yTextMap, undefined);
    const previous = new Map<string, Node>([["n1", firstResult]]);

    // Second render: content changed (simulating user edit)
    const editedText = new Y.Text();
    editedText.insert(0, "edited content");
    yTextMap.set("n1", editedText);

    const editedNode: Node = {
      id: "n1",
      type: "point",
      position: { x: 0, y: 0 }, // Position unchanged
      data: { content: "edited content", favor: 5 }, // Content changed
      draggable: true,
      selected: false,
    };

    const [secondResult] = mergeNodesWithText([editedNode], yTextMap, previous);

    // When content changes, we SHOULD create a new object to trigger re-render
    expect(secondResult).not.toBe(firstResult);
    expect(secondResult.data?.content).toBe("edited content");
  });
});
