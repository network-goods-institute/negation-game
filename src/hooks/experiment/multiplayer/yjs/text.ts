import * as Y from "yjs";
import { Node } from "@xyflow/react";

type NodeMap = Map<string, Node>;

type MutableNode = Node & { dragging?: boolean };

const applySelection = (node: Node, shouldSelect: boolean): Node => ({
  ...node,
  selected: shouldSelect,
});

const sanitizeNode = (
  node: Node,
  isLockedForMe?: (nodeId: string) => boolean
): MutableNode => {
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
  const sameLegacy = (data as any)[key] === content;
  const sameTitle = (data as any).title === content;
  if (sameLegacy && sameTitle) return node;
  return {
    ...node,
    data: {
      ...data,
      [key]: content,
      title: content,
    },
  } as Node;
};

const pickComparable = (node: Node) => {
  const data = (node.data || {}) as Record<string, unknown>;
  const legacy =
    node.type === "statement" ? (data as any).statement : (data as any).content;
  const titleNormalized =
    typeof (data as any).title === "string"
      ? (data as any).title
      : typeof legacy === "string"
        ? legacy
        : undefined;
  const votesRaw = (data as any).votes;
  const votes = Array.isArray(votesRaw)
    ? votesRaw
        .map((entry: any) =>
          typeof entry === "string"
            ? { id: entry, name: undefined }
            : { id: String(entry?.id || ""), name: entry?.name }
        )
        .filter((v) => v.id)
        .sort((a, b) => a.id.localeCompare(b.id))
    : [];
  return {
    id: node.id,
    type: node.type,
    parentId: (node as any).parentId || undefined,
    position: node.position,
    draggable: node.draggable,
    selected: node.selected,
    data: {
      content: (data as any).content,
      statement: (data as any).statement,
      title: titleNormalized,
      hidden: (data as any).hidden,
      votes,
    },
  };
};

const equalComparable = (a: Node | null | undefined, b: Node) => {
  if (!a) return false;
  const pa = pickComparable(a);
  const pb = pickComparable(b);
  try {
    return JSON.stringify(pa) === JSON.stringify(pb);
  } catch {
    return false;
  }
};

export const mergeNodesWithText = (
  nodes: Node[],
  yTextMap: Y.Map<Y.Text> | null,
  prevById?: NodeMap,
  isLockedForMe?: (nodeId: string) => boolean,
  activeAnchorIds?: Set<string>
): Node[] => {
  if (!yTextMap) return nodes;

  const yjsNodeIds = new Set(nodes.map((n) => n.id));

  const merged = nodes.map((node) => {
    const text = yTextMap.get(node.id);
    const previous = prevById?.get(node.id);

    // Sanitize and merge content from Y.Text
    const base = sanitizeNode(node, isLockedForMe);
    let withContent: Node = base;
    if (text) {
      const value = text.toString();
      withContent =
        base.type === "statement"
          ? (mergeContent(base, value, "statement") as Node)
          : (mergeContent(base, value, "content") as Node);
    } else if (previous && previous.data) {
      const previousData = previous.data as Record<string, unknown>;
      const fallbackValue =
        typeof previousData["title"] === "string"
          ? (previousData["title"] as string)
          : base.type === "statement"
            ? (previousData["statement"] as string | undefined)
            : (previousData["content"] as string | undefined);
      if (typeof fallbackValue === "string") {
        withContent =
          base.type === "statement"
            ? (mergeContent(base, fallbackValue, "statement") as Node)
            : (mergeContent(base, fallbackValue, "content") as Node);
      }
    }

    // Preserve local-only fields from previous instance (style, measured dimensions, etc.)
    if (previous) {
      const prevAny = previous as any;
      const nextAny = withContent as any;
      if (prevAny.style && !nextAny.style) nextAny.style = prevAny.style;
      if (prevAny.measured && !nextAny.measured)
        nextAny.measured = prevAny.measured;
      if (prevAny.width && !nextAny.width) nextAny.width = prevAny.width;
      if (prevAny.height && !nextAny.height) nextAny.height = prevAny.height;
      if (
        typeof prevAny.draggable !== "undefined" &&
        typeof nextAny.draggable === "undefined"
      ) {
        nextAny.draggable = prevAny.draggable;
      }
    }

    const selected = previous?.selected === true;
    const withSelection = applySelection(withContent, selected);

    // If nothing meaningful changed, keep the previous object identity to avoid remounts
    if (previous && equalComparable(previous, withSelection)) {
      return previous;
    }
    return withSelection;
  });

  // Preserve local-only anchors that are still referenced so objection overlays stay stable between Yjs merges.
  if (prevById && activeAnchorIds?.size) {
    prevById.forEach((prevNode, id) => {
      if (
        !yjsNodeIds.has(id) &&
        (prevNode as any).type === "edge_anchor" &&
        activeAnchorIds.has(id)
      ) {
        merged.push(prevNode);
      }
    });
  }

  return merged;
};
