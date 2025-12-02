import { SNAP_CONFIG } from "./snapConfig";

interface Node {
  id: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  type?: string;
  measured?: { width?: number; height?: number };
  style?: any;
}

interface SnapCalculationResult {
  snapX: number | null;
  snapY: number | null;
  snapLineX: number | null;
  snapLineY: number | null;
}

export type SizeOverrides = Record<string, { width: number; height: number }>;

const getDims = (
  node: Node,
  overrides?: SizeOverrides
): { width: number; height: number } => {
  const override = overrides?.[node.id];
  if (override) return override;
  // Use style.width (base CSS width) over measured.width (which includes expansion during editing)
  const width =
    Number(node?.width ?? (node as any)?.style?.width ?? node?.measured?.width ?? 0) || 0;
  const height =
    Number(node?.height ?? (node as any)?.style?.height ?? node?.measured?.height ?? 0) || 0;
  // Normalize to integers to avoid sub-pixel drift at different zooms
  return { width: Math.round(width), height: Math.round(height) };
};

// Cache for snap line positions to prevent jitter
let snapLineCache: {
  snapLineX: number | null;
  snapLineY: number | null;
  xRounded: number | null;
  yRounded: number | null;
} = {
  snapLineX: null,
  snapLineY: null,
  xRounded: null,
  yRounded: null,
};

export const calculateSnapPositions = (
  draggedNode: Node,
  draggedPosition: { x: number; y: number },
  otherNodes: Node[],
  zoom: number,
  sizeOverrides?: SizeOverrides
): SnapCalculationResult => {
  const thresholdFlow = SNAP_CONFIG.THRESHOLD_PX / zoom;

  let snapX: number | null = null;
  let snapY: number | null = null;
  let snapLineX: number | null = null;
  let snapLineY: number | null = null;
  let minXDist = Infinity;
  let minYDist = Infinity;

  const draggedDims = getDims(draggedNode, sizeOverrides);
  const draggedCenterX = draggedPosition.x + draggedDims.width / 2;
  const draggedCenterY = draggedPosition.y + draggedDims.height / 2;

  for (const otherNode of otherNodes) {
    const result = checkNodeSnap(
      draggedNode,
      draggedPosition,
      draggedCenterX,
      draggedCenterY,
      otherNode,
      thresholdFlow,
      minXDist,
      minYDist,
      sizeOverrides
    );

    if (result.xDist < minXDist) {
      minXDist = result.xDist;
      snapX = result.snapX;
      snapLineX = result.snapLineX;
    }

    if (result.yDist < minYDist) {
      minYDist = result.yDist;
      snapY = result.snapY;
      snapLineY = result.snapLineY;
    }
  }

  // Round snap line positions to prevent sub-pixel jitter
  // and use cache to stabilize the line position
  if (snapLineX !== null) {
    const rounded = Math.round(snapLineX);
    // Use cached value if it's close enough (within 0.5px)
    if (snapLineCache.xRounded !== null && Math.abs(rounded - snapLineCache.xRounded) < 1) {
      snapLineX = snapLineCache.snapLineX;
    } else {
      snapLineX = rounded;
      snapLineCache.snapLineX = rounded;
      snapLineCache.xRounded = rounded;
    }
  } else {
    snapLineCache.snapLineX = null;
    snapLineCache.xRounded = null;
  }

  if (snapLineY !== null) {
    const rounded = Math.round(snapLineY);
    // Use cached value if it's close enough (within 0.5px)
    if (snapLineCache.yRounded !== null && Math.abs(rounded - snapLineCache.yRounded) < 1) {
      snapLineY = snapLineCache.snapLineY;
    } else {
      snapLineY = rounded;
      snapLineCache.snapLineY = rounded;
      snapLineCache.yRounded = rounded;
    }
  } else {
    snapLineCache.snapLineY = null;
    snapLineCache.yRounded = null;
  }

  return { snapX, snapY, snapLineX, snapLineY };
};

const checkNodeSnap = (
  draggedNode: Node,
  draggedPosition: { x: number; y: number },
  draggedCenterX: number,
  draggedCenterY: number,
  otherNode: Node,
  thresholdFlow: number,
  currentMinXDist: number,
  currentMinYDist: number,
  sizeOverrides?: SizeOverrides
): {
  xDist: number;
  yDist: number;
  snapX: number | null;
  snapY: number | null;
  snapLineX: number | null;
  snapLineY: number | null;
} => {
  const draggedDims = getDims(draggedNode, sizeOverrides);
  const otherDims = getDims(otherNode, sizeOverrides);
  const otherCenterX = otherNode.position.x + otherDims.width / 2;
  const otherCenterY = otherNode.position.y + otherDims.height / 2;

  let xDist = currentMinXDist;
  let yDist = currentMinYDist;
  let snapX: number | null = null;
  let snapY: number | null = null;
  let snapLineX: number | null = null;
  let snapLineY: number | null = null;

  const centerXDist = Math.abs(draggedCenterX - otherCenterX);
  if (centerXDist <= thresholdFlow && centerXDist < xDist) {
    xDist = centerXDist;
    snapX = otherCenterX - draggedDims.width / 2;
    snapLineX = otherCenterX;
  }

  const centerYDist = Math.abs(draggedCenterY - otherCenterY);
  if (centerYDist <= thresholdFlow && centerYDist < yDist) {
    yDist = centerYDist;
    snapY = otherCenterY - draggedDims.height / 2;
    snapLineY = otherCenterY;
  }

  const leftEdgeResult = checkLeftEdgeSnap(
    draggedPosition,
    otherNode,
    otherDims,
    thresholdFlow,
    xDist
  );
  if (leftEdgeResult.dist < xDist) {
    xDist = leftEdgeResult.dist;
    snapX = leftEdgeResult.snapX;
    snapLineX = leftEdgeResult.snapLineX;
  }

  const rightEdgeResult = checkRightEdgeSnap(
    draggedNode,
    draggedPosition,
    otherNode,
    draggedDims,
    otherDims,
    thresholdFlow,
    xDist
  );
  if (rightEdgeResult.dist < xDist) {
    xDist = rightEdgeResult.dist;
    snapX = rightEdgeResult.snapX;
    snapLineX = rightEdgeResult.snapLineX;
  }

  const topEdgeResult = checkTopEdgeSnap(
    draggedPosition,
    otherNode,
    otherDims,
    thresholdFlow,
    yDist
  );
  if (topEdgeResult.dist < yDist) {
    yDist = topEdgeResult.dist;
    snapY = topEdgeResult.snapY;
    snapLineY = topEdgeResult.snapLineY;
  }

  const bottomEdgeResult = checkBottomEdgeSnap(
    draggedNode,
    draggedPosition,
    otherNode,
    draggedDims,
    otherDims,
    thresholdFlow,
    yDist
  );
  if (bottomEdgeResult.dist < yDist) {
    yDist = bottomEdgeResult.dist;
    snapY = bottomEdgeResult.snapY;
    snapLineY = bottomEdgeResult.snapLineY;
  }

  return { xDist, yDist, snapX, snapY, snapLineX, snapLineY };
};

const checkLeftEdgeSnap = (
  draggedPosition: { x: number; y: number },
  otherNode: Node,
  otherDims: { width: number; height: number },
  thresholdFlow: number,
  currentMinDist: number
): { dist: number; snapX: number | null; snapLineX: number | null } => {
  const otherLeftX = otherNode.position.x;
  const draggedLeftX = draggedPosition.x;
  const dist = Math.abs(draggedLeftX - otherLeftX);

  if (dist <= thresholdFlow && dist < currentMinDist) {
    return { dist, snapX: otherLeftX, snapLineX: otherLeftX };
  }

  return { dist: currentMinDist, snapX: null, snapLineX: null };
};

const checkRightEdgeSnap = (
  draggedNode: Node,
  draggedPosition: { x: number; y: number },
  otherNode: Node,
  draggedDims: { width: number; height: number },
  otherDims: { width: number; height: number },
  thresholdFlow: number,
  currentMinDist: number
): { dist: number; snapX: number | null; snapLineX: number | null } => {
  const otherRightX = otherNode.position.x + otherDims.width;
  const draggedRightX = draggedPosition.x + draggedDims.width;
  const dist = Math.abs(draggedRightX - otherRightX);

  if (dist <= thresholdFlow && dist < currentMinDist) {
    return {
      dist,
      snapX: otherRightX - draggedDims.width,
      snapLineX: otherRightX,
    };
  }

  return { dist: currentMinDist, snapX: null, snapLineX: null };
};

const checkTopEdgeSnap = (
  draggedPosition: { x: number; y: number },
  otherNode: Node,
  otherDims: { width: number; height: number },
  thresholdFlow: number,
  currentMinDist: number
): { dist: number; snapY: number | null; snapLineY: number | null } => {
  const otherTopY = otherNode.position.y;
  const draggedTopY = draggedPosition.y;
  const dist = Math.abs(draggedTopY - otherTopY);

  if (dist <= thresholdFlow && dist < currentMinDist) {
    return { dist, snapY: otherTopY, snapLineY: otherTopY };
  }

  return { dist: currentMinDist, snapY: null, snapLineY: null };
};

const checkBottomEdgeSnap = (
  draggedNode: Node,
  draggedPosition: { x: number; y: number },
  otherNode: Node,
  draggedDims: { width: number; height: number },
  otherDims: { width: number; height: number },
  thresholdFlow: number,
  currentMinDist: number
): { dist: number; snapY: number | null; snapLineY: number | null } => {
  const otherBottomY = otherNode.position.y + otherDims.height;
  const draggedBottomY = draggedPosition.y + draggedDims.height;
  const dist = Math.abs(draggedBottomY - otherBottomY);

  if (dist <= thresholdFlow && dist < currentMinDist) {
    return {
      dist,
      snapY: otherBottomY - draggedDims.height,
      snapLineY: otherBottomY,
    };
  }

  return { dist: currentMinDist, snapY: null, snapLineY: null };
};

export const filterSnapTargets = (
  allNodes: Node[],
  draggedNodeId: string
): Node[] => {
  return allNodes.filter(
    (n) => n.id !== draggedNodeId && n.type !== "edge_anchor"
  );
};

export const filterSnapTargetsMulti = (
  allNodes: Node[],
  selectedNodeIds: string[]
): Node[] => {
  const selectedSet = new Set(selectedNodeIds);
  return allNodes.filter(
    (n) => !selectedSet.has(n.id) && n.type !== "edge_anchor"
  );
};

export const calculateGroupBounds = (
  nodes: Node[],
  sizeOverrides?: SizeOverrides
): {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
} => {
  if (nodes.length === 0) {
    return {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      centerX: 0,
      centerY: 0,
      width: 0,
      height: 0,
    };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const dims = getDims(node, sizeOverrides);
    const left = node.position.x;
    const right = left + dims.width;
    const top = node.position.y;
    const bottom = top + dims.height;

    minX = Math.min(minX, left);
    maxX = Math.max(maxX, right);
    minY = Math.min(minY, top);
    maxY = Math.max(maxY, bottom);
  }

  return {
    left: minX,
    right: maxX,
    top: minY,
    bottom: maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    width: maxX - minX,
    height: maxY - minY,
  };
};

export const calculateGroupSnapPositions = (
  groupBounds: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    centerX: number;
    centerY: number;
    width: number;
    height: number;
  },
  otherNodes: Node[],
  zoom: number,
  sizeOverrides?: SizeOverrides
): SnapCalculationResult => {
  const thresholdFlow = SNAP_CONFIG.THRESHOLD_PX / zoom;

  let snapX: number | null = null;
  let snapY: number | null = null;
  let snapLineX: number | null = null;
  let snapLineY: number | null = null;
  let minXDist = Infinity;
  let minYDist = Infinity;

  for (const otherNode of otherNodes) {
    const otherDims = getDims(otherNode, sizeOverrides);
    const otherCenterX = otherNode.position.x + otherDims.width / 2;
    const otherCenterY = otherNode.position.y + otherDims.height / 2;
    const otherLeft = otherNode.position.x;
    const otherRight = otherNode.position.x + otherDims.width;
    const otherTop = otherNode.position.y;
    const otherBottom = otherNode.position.y + otherDims.height;

    const centerXDist = Math.abs(groupBounds.centerX - otherCenterX);
    if (centerXDist <= thresholdFlow && centerXDist < minXDist) {
      minXDist = centerXDist;
      snapX = otherCenterX - groupBounds.width / 2;
      snapLineX = otherCenterX;
    }

    const centerYDist = Math.abs(groupBounds.centerY - otherCenterY);
    if (centerYDist <= thresholdFlow && centerYDist < minYDist) {
      minYDist = centerYDist;
      snapY = otherCenterY - groupBounds.height / 2;
      snapLineY = otherCenterY;
    }

    const leftDist = Math.abs(groupBounds.left - otherLeft);
    if (leftDist <= thresholdFlow && leftDist < minXDist) {
      minXDist = leftDist;
      snapX = otherLeft;
      snapLineX = otherLeft;
    }

    const rightDist = Math.abs(groupBounds.right - otherRight);
    if (rightDist <= thresholdFlow && rightDist < minXDist) {
      minXDist = rightDist;
      snapX = otherRight - groupBounds.width;
      snapLineX = otherRight;
    }

    const topDist = Math.abs(groupBounds.top - otherTop);
    if (topDist <= thresholdFlow && topDist < minYDist) {
      minYDist = topDist;
      snapY = otherTop;
      snapLineY = otherTop;
    }

    const bottomDist = Math.abs(groupBounds.bottom - otherBottom);
    if (bottomDist <= thresholdFlow && bottomDist < minYDist) {
      minYDist = bottomDist;
      snapY = otherBottom - groupBounds.height;
      snapLineY = otherBottom;
    }
  }

  // Round snap line positions to prevent sub-pixel jitter
  // and use cache to stabilize the line position (same cache as single node)
  if (snapLineX !== null) {
    const rounded = Math.round(snapLineX);
    if (snapLineCache.xRounded !== null && Math.abs(rounded - snapLineCache.xRounded) < 1) {
      snapLineX = snapLineCache.snapLineX;
    } else {
      snapLineX = rounded;
      snapLineCache.snapLineX = rounded;
      snapLineCache.xRounded = rounded;
    }
  } else {
    snapLineCache.snapLineX = null;
    snapLineCache.xRounded = null;
  }

  if (snapLineY !== null) {
    const rounded = Math.round(snapLineY);
    if (snapLineCache.yRounded !== null && Math.abs(rounded - snapLineCache.yRounded) < 1) {
      snapLineY = snapLineCache.snapLineY;
    } else {
      snapLineY = rounded;
      snapLineCache.snapLineY = rounded;
      snapLineCache.yRounded = rounded;
    }
  } else {
    snapLineCache.snapLineY = null;
    snapLineCache.yRounded = null;
  }

  return { snapX, snapY, snapLineX, snapLineY };
};
