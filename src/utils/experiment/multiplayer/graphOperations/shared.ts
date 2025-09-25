export const getParentNodeHeight = (
  parentNode: any,
  allNodes: any[]
): number => {
  if (parentNode?.parentId) {
    const groupNode = allNodes.find((n: any) => n.id === parentNode.parentId);
    if (groupNode?.type === "group") {
      if (
        groupNode?.measured?.height &&
        typeof groupNode.measured.height === "number"
      ) {
        return groupNode.measured.height;
      }
      try {
        const selector = `.react-flow__node[data-id="${groupNode?.id ?? ""}"]`;
        const el = document.querySelector(selector) as HTMLElement | null;
        if (el) {
          return Math.ceil(el.getBoundingClientRect().height);
        }
      } catch {}
    }
  }

  if (
    parentNode?.measured?.height &&
    typeof parentNode.measured.height === "number"
  ) {
    return parentNode.measured.height;
  }

  try {
    const selector = `.react-flow__node[data-id="${parentNode?.id ?? ""}"]`;
    const el = document.querySelector(selector) as HTMLElement | null;
    if (el) {
      return Math.ceil(el.getBoundingClientRect().height);
    }
  } catch {}

  return 80;
};

export const calculateNodePositionBelow = (
  parentNode: any,
  allNodes: any[],
  getViewportOffset?: () => { x: number; y: number }
) => {
  const parentPosition = getAbsolutePosition(parentNode, allNodes);
  const viewportOffset = getViewportOffset?.() || { x: 0, y: 0 };
  const parentHeight = getParentNodeHeight(parentNode, allNodes);
  const padding = 12;

  return {
    x: parentPosition.x + viewportOffset.x,
    y: parentPosition.y + parentHeight + padding + viewportOffset.y,
  };
};

export const getParentNodeWidth = (
  parentNode: any,
  allNodes: any[]
): number => {
  if (
    parentNode?.measured?.width &&
    typeof parentNode.measured.width === "number"
  ) {
    return parentNode.measured.width;
  }

  if (parentNode?.parentId) {
    const groupNode = allNodes.find((n: any) => n.id === parentNode.parentId);
    if (
      groupNode?.measured?.width &&
      typeof groupNode.measured.width === "number"
    ) {
      return groupNode.measured.width;
    }
  }

  try {
    const selector = `.react-flow__node[data-id="${parentNode?.id ?? ""}"]`;
    const el = document.querySelector(selector) as HTMLElement | null;
    if (el) {
      return Math.ceil(el.getBoundingClientRect().width);
    }
  } catch {}

  return 240;
};

export const calculateNodePositionRight = (
  parentNode: any,
  allNodes: any[],
  getViewportOffset?: () => { x: number; y: number }
) => {
  const parentPosition = getAbsolutePosition(parentNode, allNodes);
  const viewportOffset = getViewportOffset?.() || { x: 0, y: 0 };
  const parentWidth = getParentNodeWidth(parentNode, allNodes);
  const gap = 48;

  return {
    x: parentPosition.x + parentWidth + gap + viewportOffset.x,
    y: parentPosition.y + viewportOffset.y,
  };
};

export const getAbsolutePosition = (node: any, allNodes: any[]) => {
  if (!node) return { x: 0, y: 0 };
  const pos = node.position || { x: 0, y: 0 };
  if (node.parentId) {
    const parent = allNodes.find((n: any) => n.id === node.parentId);
    const ppos = parent?.position || { x: 0, y: 0 };
    return { x: (ppos.x || 0) + (pos.x || 0), y: (ppos.y || 0) + (pos.y || 0) };
  }
  return pos;
};

export const getDefaultContentForType = (
  type: "point" | "statement" | "title" | "objection"
): string => {
  switch (type) {
    case "point":
      return "New point";
    case "statement":
      return "New Question";
    case "title":
      return "New Title";
    case "objection":
      return "New mitigation";
    default:
      return "New point";
  }
};
