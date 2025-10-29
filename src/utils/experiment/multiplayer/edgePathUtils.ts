/**
 * Utility functions for edge path calculations and trimming
 */

export interface TrimmedLineCoords {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

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
 * Intersect with a rectangle
 */
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
    const sw = Number(s?.width);
    const sh = Number(s?.height);
    const tw = Number(t?.width);
    const th = Number(t?.height);
    if (!Number.isFinite(sw) || !Number.isFinite(sh) || !Number.isFinite(tw) || !Number.isFinite(th)) {
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
