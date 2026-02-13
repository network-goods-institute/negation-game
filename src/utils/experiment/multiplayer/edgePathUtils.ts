/**
 * Utility functions for edge path calculations and trimming
 */

export interface TrimmedLineCoords {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export interface ParallelEdgeOffset {
  index: number;
  count: number;
  offset: number;
}

interface NodeCenterData {
  x: number;
  y: number;
  width: number;
  height: number;
}

const getNodeDimension = (node: any, dim: "width" | "height"): number => {
  return (
    Number(node?.[dim] ?? node?.measured?.[dim] ?? node?.style?.[dim] ?? 0) ||
    0
  );
};

const getNodeCenterData = (node: any): NodeCenterData | null => {
  if (!node) return null;
  const pos =
    node?.positionAbsolute ??
    node?.position ??
    ({ x: 0, y: 0 } as { x: number; y: number });
  const width = getNodeDimension(node, "width");
  const height = getNodeDimension(node, "height");
  return {
    x: (Number(pos?.x ?? 0) || 0) + width / 2,
    y: (Number(pos?.y ?? 0) || 0) + height / 2,
    width,
    height,
  };
};

const intersectRect = (
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  dx: number,
  dy: number
): { x: number; y: number } => {
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  if (adx === 0 && ady === 0) return { x: cx, y: cy };
  const txScale = adx > 0 ? halfW / adx : Number.POSITIVE_INFINITY;
  const tyScale = ady > 0 ? halfH / ady : Number.POSITIVE_INFINITY;
  const t = Math.min(txScale, tyScale);
  return { x: cx + dx * t, y: cy + dy * t };
};

export const getNodeAttachmentPoint = (
  nodeId: string,
  otherNodeId: string,
  edgeId: string,
  edges: Array<{ id?: string; source?: string; target?: string }>,
  getNode: (id: string) => any | undefined,
  options?: { spacing?: number; basePoint?: { x: number; y: number }; directionalBase?: boolean }
): { x: number; y: number } | null => {
  const node = getNode(nodeId);
  if (!node) return null;
  const isAnchor = String(node?.type || "") === "edge_anchor";

  const center = getNodeCenterData(node);
  if (!center) return null;
  const connectedEdges = (edges || []).filter((edge) => {
    const s = String((edge as any)?.source ?? "");
    const t = String((edge as any)?.target ?? "");
    return s === nodeId || t === nodeId;
  });

  if (connectedEdges.length <= 1) {
    return null;
  }

  const other = getNode(otherNodeId);
  const otherCenter = getNodeCenterData(other);
  const spacing = options?.spacing ?? 12;
  type EdgeAngleEntry = {
    edge: { id?: string; source?: string; target?: string };
    angle: number | null;
  };

  const edgesWithAngles: EdgeAngleEntry[] = connectedEdges.map((edge) => {
    const s = String((edge as any)?.source ?? "");
    const t = String((edge as any)?.target ?? "");
    const otherId = s === nodeId ? t : s;
    const otherNode = getNode(otherId);
    const otherData = getNodeCenterData(otherNode);
    if (!otherData) {
      return { edge, angle: null as number | null };
    }
    const raw = Math.atan2(otherData.y - center.y, otherData.x - center.x);
    const angle = raw < 0 ? raw + Math.PI * 2 : raw;
    return { edge, angle };
  });

  const withAngles = edgesWithAngles.filter((entry) => entry.angle != null) as Array<{
    edge: { id?: string; source?: string; target?: string };
    angle: number;
  }>;
  const withoutAngles: EdgeAngleEntry[] = edgesWithAngles
    .filter((entry) => entry.angle == null)
    .slice()
    .sort((a, b) => {
      const aId = String((a.edge as any)?.id ?? "");
      const bId = String((b.edge as any)?.id ?? "");
      return aId.localeCompare(bId);
    });

  const sortedWithAngles: EdgeAngleEntry[] = withAngles.slice().sort((a, b) => {
    const diff = a.angle - b.angle;
    if (diff !== 0) return diff;
    const aId = String((a.edge as any)?.id ?? "");
    const bId = String((b.edge as any)?.id ?? "");
    return aId.localeCompare(bId);
  });

  let ordered = sortedWithAngles.concat(withoutAngles);
  if (sortedWithAngles.length > 1) {
    let maxGap = -1;
    let splitIndex = 0;
    for (let i = 0; i < sortedWithAngles.length; i += 1) {
      const current = sortedWithAngles[i].angle;
      const next = sortedWithAngles[(i + 1) % sortedWithAngles.length].angle;
      const wrappedNext = i + 1 === sortedWithAngles.length ? next + Math.PI * 2 : next;
      const gap = wrappedNext - current;
      if (gap > maxGap) {
        maxGap = gap;
        splitIndex = (i + 1) % sortedWithAngles.length;
      }
    }
    const rotated = sortedWithAngles.slice(splitIndex).concat(sortedWithAngles.slice(0, splitIndex));
    ordered = rotated.concat(withoutAngles);
  }

  const idx = ordered.findIndex((entry) => String((entry.edge as any)?.id ?? "") === String(edgeId ?? ""));
  const centerIdx = (ordered.length - 1) / 2;
  const offset = ((idx >= 0 ? idx : centerIdx) - centerIdx) * spacing;
  const halfW = center.width / 2;
  const halfH = center.height / 2;
  const anchorRadius = 8;
  const effectiveHalfW = isAnchor ? Math.max(halfW, anchorRadius) : halfW;
  const effectiveHalfH = isAnchor ? Math.max(halfH, anchorRadius) : halfH;
  if (!isAnchor && !(halfW > 0 && halfH > 0)) return null;

  const dx = (otherCenter?.x ?? center.x) - center.x;
  const dy = (otherCenter?.y ?? center.y) - center.y;
  const len = Math.hypot(dx, dy);
  const perpX = len > 0 ? (-dy / len) : 0;
  const perpY = len > 0 ? (dx / len) : 1;

  const providedBase = options?.basePoint;
  let base = providedBase ?? center;
  if (isAnchor) {
    const hasDirection = len > 0;
    const hasProvidedBase = !!providedBase && (
      Math.abs((providedBase as { x: number; y: number }).x - center.x) > 0.5 ||
      Math.abs((providedBase as { x: number; y: number }).y - center.y) > 0.5
    );
    if (!hasProvidedBase) {
      base = hasDirection
        ? intersectRect(center.x, center.y, effectiveHalfW, effectiveHalfH, dx, dy)
        : center;
    }
  } else if (options?.directionalBase) {
    if (halfW > 0 && halfH > 0 && len > 0) {
      base = intersectRect(center.x, center.y, halfW, halfH, dx, dy);
    }
  }

  const relX = base.x - center.x;
  const relY = base.y - center.y;
  let minOffset = Number.NEGATIVE_INFINITY;
  let maxOffset = Number.POSITIVE_INFINITY;
  if (Math.abs(perpX) > 0) {
    const o1 = (-effectiveHalfW - relX) / perpX;
    const o2 = (effectiveHalfW - relX) / perpX;
    minOffset = Math.max(minOffset, Math.min(o1, o2));
    maxOffset = Math.min(maxOffset, Math.max(o1, o2));
  }
  if (Math.abs(perpY) > 0) {
    const o1 = (-effectiveHalfH - relY) / perpY;
    const o2 = (effectiveHalfH - relY) / perpY;
    minOffset = Math.max(minOffset, Math.min(o1, o2));
    maxOffset = Math.min(maxOffset, Math.max(o1, o2));
  }
  const clampedOffset = Number.isFinite(minOffset) && Number.isFinite(maxOffset)
    ? Math.max(minOffset, Math.min(maxOffset, offset))
    : offset;

  return {
    x: base.x + perpX * clampedOffset,
    y: base.y + perpY * clampedOffset,
  };
};

export const getParallelEdgeOffset = (
  edgeId: string,
  source: string,
  target: string,
  edges: Array<{ id?: string; source?: string; target?: string }>,
  options?: { spacing?: number; includeReverse?: boolean }
): ParallelEdgeOffset => {
  const spacing = options?.spacing ?? 12;
  const includeReverse = options?.includeReverse ?? true;
  const sourceId = String(source ?? '');
  const targetId = String(target ?? '');

  const matches = (edges || []).filter((edge) => {
    const s = String((edge as any)?.source ?? '');
    const t = String((edge as any)?.target ?? '');
    if (includeReverse) {
      return (s === sourceId && t === targetId) || (s === targetId && t === sourceId);
    }
    return s === sourceId && t === targetId;
  });

  if (matches.length <= 1) {
    return { index: 0, count: matches.length, offset: 0 };
  }

  const ordered = matches.slice().sort((a, b) => {
    const aId = String((a as any)?.id ?? '');
    const bId = String((b as any)?.id ?? '');
    return aId.localeCompare(bId);
  });

  const idx = ordered.findIndex((edge) => String((edge as any)?.id ?? '') === String(edgeId ?? ''));
  if (idx < 0) {
    return { index: 0, count: ordered.length, offset: 0 };
  }

  const center = (ordered.length - 1) / 2;
  const offset = (idx - center) * spacing;
  return { index: idx, count: ordered.length, offset };
};

/**
 * Compute trimmed line coordinates that avoid nodes
 */
export const getTrimmedLineCoords = (
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  offsetX: number,
  offsetY: number,
  sourceNode: any,
  targetNode: any
): TrimmedLineCoords => {
  let fromX = sx + offsetX;
  let fromY = sy + offsetY;
  let toX = tx + offsetX;
  let toY = ty + offsetY;

  // Get node dimensions
  const sWidth = Number(sourceNode?.width ?? sourceNode?.measured?.width ?? 0) || 0;
  const sHeight = Number(sourceNode?.height ?? sourceNode?.measured?.height ?? 0) || 0;
  const tWidth = Number(targetNode?.width ?? targetNode?.measured?.width ?? 0) || 0;
  const tHeight = Number(targetNode?.height ?? targetNode?.measured?.height ?? 0) || 0;

  if (sWidth > 0 && sHeight > 0 && tWidth > 0 && tHeight > 0) {
    const sCX = Number(sourceNode?.position?.x ?? 0) + sWidth / 2 + offsetX;
    const sCY = Number(sourceNode?.position?.y ?? 0) + sHeight / 2 + offsetY;
    const tCX = Number(targetNode?.position?.x ?? 0) + tWidth / 2 + offsetX;
    const tCY = Number(targetNode?.position?.y ?? 0) + tHeight / 2 + offsetY;

    const dirVX = tCX - sCX;
    const dirVY = tCY - sCY;
    const len = Math.max(1, Math.sqrt(dirVX * dirVX + dirVY * dirVY));
    const ux = dirVX / len;
    const uy = dirVY / len;

    const start = intersectRect(sCX, sCY, sWidth / 2, sHeight / 2, ux, uy);
    const end = intersectRect(tCX, tCY, tWidth / 2, tHeight / 2, -ux, -uy);

    // Add padding
    const padStart = Math.max(1, Math.min(8, Math.min(sWidth, sHeight) * 0.02));
    const padEnd = Math.max(1, Math.min(8, Math.min(tWidth, tHeight) * 0.02));

    fromX = start.x + ux * padStart;
    fromY = start.y + uy * padStart;
    toX = end.x - ux * padEnd;
    toY = end.y - uy * padEnd;
  }

  return { fromX, fromY, toX, toY };
};

/**
 * Compute visual midpoint between node borders rather than between centers
 */
export const computeMidpointBetweenBorders = (
  sourceNode: any,
  targetNode: any,
  labelX: number,
  labelY: number
): [number, number] => {
  try {
    const s = sourceNode as any;
    const t = targetNode as any;
    if (!s || !t) return [labelX, labelY] as const;
    const getDim = (n: any, dim: 'width' | 'height') =>
      Number(n?.[dim] ?? (n?.measured?.[dim] ?? n?.style?.[dim] ?? 0)) || 0;
    const sw = getDim(s, 'width');
    const sh = getDim(s, 'height');
    const tw = getDim(t, 'width');
    const th = getDim(t, 'height');
    if (sw <= 0 || sh <= 0 || tw <= 0 || th <= 0) {
      return [labelX, labelY] as const;
    }
    const sx = Number(s?.position?.x ?? 0) + sw / 2;
    const sy = Number(s?.position?.y ?? 0) + sh / 2;
    const tx = Number(t?.position?.x ?? 0) + tw / 2;
    const ty = Number(t?.position?.y ?? 0) + th / 2;

    const dx = tx - sx;
    const dy = ty - sy;
    if (dx === 0 && dy === 0) return [labelX, labelY] as const;

    const fromS = intersectRect(sx, sy, sw / 2, sh / 2, dx, dy);
    const fromT = intersectRect(tx, ty, tw / 2, th / 2, -dx, -dy);
    return [(fromS.x + fromT.x) / 2, (fromS.y + fromT.y) / 2] as const;
  } catch {
    return [labelX, labelY] as const;
  }
};


