import * as Y from "yjs";
import { Node } from "@xyflow/react";

type NodeMap = Map<string, Node>;

type MutableNode = Node & { dragging?: boolean };

const applySelection = (node: Node, shouldSelect: boolean): Node => ({
  ...node,
  selected: shouldSelect,
});

const sanitizeNode = (node: Node, isLockedForMe?: (nodeId: string) => boolean): MutableNode => {
  const parentLocked = Boolean(node.parentId);
  const userLocked = isLockedForMe?.(node.id) || false;
  const lockedDrag = parentLocked || userLocked;
  const sanitized: MutableNode = {
    ...node,
    draggable: lockedDrag ? false : node.draggable,
    selected: false,
  };
  if (sanitized.dragging !== undefined) {
    sanitized.dragging = undefined;
  }
  return sanitized;
};

const mergeContent = (
  node: MutableNode,
  content: string | undefined,
  key: "content" | "statement"
) => {
  if (content == null) return node;
  const data =
    typeof node.data === "object" && node.data !== null
      ? (node.data as Record<string, unknown>)
      : {};
  // keep legacy key (content/statement) AND provide a stable alias: title
  const sameLegacy = data[key] === content;
  const sameTitle = (data as any).title === content;
  if (sameLegacy && sameTitle) return node;
  return {
    ...node,
    data: {
      ...data,
      [key]: content,
      title: content, // <- unified accessor for UI
    },
  } as Node;
};

const shallowEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  return true;
};

const nodesAreEqual = (a: Node, b: Node): boolean => {
  if (a.id !== b.id || a.type !== b.type) return false;
  if (a.draggable !== b.draggable || a.selected !== b.selected) return false;
  if (!shallowEqual(a.position, b.position)) return false;
  if (!shallowEqual(a.data, b.data)) return false;
  return true;
};

export const mergeNodesWithText = (
  nodes: Node[],
  yTextMap: Y.Map<Y.Text> | null,
  prevById?: NodeMap,
  isLockedForMe?: (nodeId: string) => boolean
): Node[] => {
  if (!yTextMap) return nodes;
  return nodes.map((node) => {
    const text = yTextMap.get(node.id);
    const previous = prevById?.get(node.id);
    const base = sanitizeNode(node, isLockedForMe);
    const selected = previous?.selected === true;

    let result: Node;

    if (text) {
      const value = text.toString();
      const updated =
        base.type === "statement"
          ? mergeContent(base, value, "statement")
          : mergeContent(base, value, "content");
      result = applySelection(updated, selected);
    } else if (previous && previous.data) {
      const previousData = previous.data as Record<string, unknown>;
      const fallbackValue =
        typeof previousData["title"] === "string"
          ? previousData["title"]
          : base.type === "statement"
          ? previousData["statement"]
          : previousData["content"];
      if (typeof fallbackValue === "string") {
        const updated =
          base.type === "statement"
            ? mergeContent(base, fallbackValue, "statement")
            : mergeContent(base, fallbackValue, "content");
        result = applySelection(updated, selected);
      } else {
        result = applySelection(base, selected);
      }
    } else {
      result = applySelection(base, selected);
    }

    if (previous && nodesAreEqual(previous, result)) {
      return previous;
    }

    return result;
  });
};
