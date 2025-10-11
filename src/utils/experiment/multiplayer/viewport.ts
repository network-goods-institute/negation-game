export type RectLike = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type OffscreenSide = "left" | "right" | "top" | "bottom" | null;

export const getOffscreenSide = (
  rect: RectLike,
  vw = window.innerWidth,
  vh = window.innerHeight
): OffscreenSide => {
  const { left, right, top, bottom } = rect;
  const offLeft = right <= 0;
  const offRight = left >= vw;
  const offTop = bottom <= 0;
  const offBottom = top >= vh;
  if (!(offLeft || offRight || offTop || offBottom)) return null;
  const dxLeft = Math.max(0, -left);
  const dxRight = Math.max(0, right - vw);
  const dyTop = Math.max(0, -top);
  const dyBottom = Math.max(0, bottom - vh);
  const max = Math.max(dxLeft, dxRight, dyTop, dyBottom);
  if (max === dxLeft) return "left";
  if (max === dxRight) return "right";
  if (max === dyTop) return "top";
  return "bottom";
};

export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export type Viewport = { x: number; y: number; zoom: number };

export const panViewportByWheel = (
  current: Viewport,
  deltaX: number,
  deltaY: number
): Viewport => {
  return {
    x: current.x + deltaX,
    y: current.y + deltaY,
    zoom: current.zoom,
  };
};
