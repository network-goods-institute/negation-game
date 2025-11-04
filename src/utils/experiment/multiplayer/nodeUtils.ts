/**
 * Utility functions for working with ReactFlow nodes
 */

/**
 * Get node dimensions and center position
 */
export function getNodeDimensionsAndCenter(node: any): {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  x: number;
  y: number;
} {
  let w = Number(node?.width ?? node?.measured?.width ?? node?.style?.width ?? 120) || 120;
  let h = Number(node?.height ?? node?.measured?.height ?? node?.style?.height ?? 60) || 60;

  // Use defaults if dimensions are invalid (negative, zero, or NaN)
  if (w <= 0 || !Number.isFinite(w)) w = 120;
  if (h <= 0 || !Number.isFinite(h)) h = 60;

  const x = Number(node?.position?.x ?? 0);
  const y = Number(node?.position?.y ?? 0);
  const centerX = x + w / 2;
  const centerY = y + h / 2;

  return { width: w, height: h, centerX, centerY, x, y };
}
