import * as Y from "yjs";
import { Node } from "@xyflow/react";

type NodeMap = Map<string, Node>;

type MutableNode = Node & { dragging?: boolean };

const applySelection = (node: Node, shouldSelect: boolean): Node => {
  // Preserve object identity if selection state matches
  if (node.selected === shouldSelect) return node;
  return {
    ...node,
    selected: shouldSelect,
  };
};

const sanitizeNode = (
  node: Node,
  previous: Node | undefined,
  isLockedForMe?: (nodeId: string) => boolean
): MutableNode => {
  const parentLocked = Boolean(node.parentId);
  const userLocked = isLockedForMe?.(node.id) || false;
  const lockedDrag = parentLocked || userLocked;
  const shouldBeDraggable = lockedDrag ? false : node.draggable;

  // Check if we can reuse the previous node object to preserve React identity
  if (previous) {
    const prevDraggable = previous.draggable ?? true;
    const prevSelected = previous.selected ?? false;

    // Compare critical fields that affect rendering
    const sameType = previous.type === node.type;
    const sameParent = previous.parentId === node.parentId;
    const sameDraggable = prevDraggable === shouldBeDraggable;
    const hasDragging = (previous as MutableNode).dragging !== undefined;

    // If only position/width/height changed, reuse previous object with shallow updates
    if (sameType && sameParent && sameDraggable && !hasDragging) {
      // Check if position/dimensions are the only differences
      const samePosition =
        previous.position?.x === node.position?.x &&
        previous.position?.y === node.position?.y;
      const sameDimensions =
        previous.width === node.width &&
        previous.height === node.height;

      // If nothing changed at all, return previous object
      if (samePosition && sameDimensions && prevSelected === false) {
        return previous as MutableNode;
      }

      // If only layout fields changed, mutate previous object in place
      // This preserves React component identity and prevents re-renders
      // (mutation is acceptable here because we control the node lifecycle)
      if (!samePosition || !sameDimensions) {
        // Mutate position/dimensions in place to preserve object identity
        (previous as any).position = node.position;
        if (node.width !== undefined) (previous as any).width = node.width;
        if (node.height !== undefined) (previous as any).height = node.height;
        (previous as any).selected = false;
        return previous as MutableNode;
      }
    }
  }

  // Create new object for actual changes
  const sanitized: MutableNode = {
    ...node,
    draggable: shouldBeDraggable,
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
): Node => {
  if (content == null) return node;
  const data =
    typeof node.data === "object" && node.data !== null
      ? (node.data as Record<string, unknown>)
      : {};
  // keep legacy key (content/statement) AND provide a stable alias: title
  const sameLegacy = data[key] === content;
  const sameTitle = (data as any).title === content;

  // Preserve object identity if content matches
  if (sameLegacy && sameTitle) return node;

  // Only create new object if content actually changed
  return {
    ...node,
    data: {
      ...data,
      [key]: content,
      title: content, // <- unified accessor for UI
    },
  } as Node;
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

    // Pass previous node to sanitizeNode to enable object identity preservation
    const base = sanitizeNode(node, previous, isLockedForMe);
    const selected = previous?.selected === true;

    if (text) {
      const value = text.toString();
      const updated =
        base.type === "statement"
          ? mergeContent(base, value, "statement")
          : mergeContent(base, value, "content");
      return applySelection(updated, selected);
    }

    if (previous && previous.data) {
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
        return applySelection(updated, selected);
      }
    }

    return applySelection(base, selected);
  });
};
