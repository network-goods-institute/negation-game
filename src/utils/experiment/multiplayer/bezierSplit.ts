export interface Point {
  x: number;
  y: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpPoint(p1: Point, p2: Point, t: number): Point {
  return {
    x: lerp(p1.x, p2.x, t),
    y: lerp(p1.y, p2.y, t),
  };
}

export function splitCubicBezierAt(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): { first: [Point, Point, Point, Point]; second: [Point, Point, Point, Point] } {
  const p01 = lerpPoint(p0, p1, t);
  const p12 = lerpPoint(p1, p2, t);
  const p23 = lerpPoint(p2, p3, t);

  const p012 = lerpPoint(p01, p12, t);
  const p123 = lerpPoint(p12, p23, t);

  const p0123 = lerpPoint(p012, p123, t);

  return {
    first: [p0, p01, p012, p0123],
    second: [p0123, p123, p23, p3],
  };
}

export function cubicBezierToPath(p0: Point, p1: Point, p2: Point, p3: Point): string {
  return `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}`;
}

export function parseCubicBezierPath(pathD: string): {
  start: Point;
  cp1: Point;
  cp2: Point;
  end: Point;
} | null {
  const match = pathD.match(
    /M\s*([-\d.]+)[,\s]+([-\d.]+)\s*C\s*([-\d.]+)[,\s]+([-\d.]+)[,\s]+([-\d.]+)[,\s]+([-\d.]+)[,\s]+([-\d.]+)[,\s]+([-\d.]+)/i
  );
  if (!match) return null;

  return {
    start: { x: parseFloat(match[1]), y: parseFloat(match[2]) },
    cp1: { x: parseFloat(match[3]), y: parseFloat(match[4]) },
    cp2: { x: parseFloat(match[5]), y: parseFloat(match[6]) },
    end: { x: parseFloat(match[7]), y: parseFloat(match[8]) },
  };
}

export function getHalfBezierPaths(pathD: string): { firstHalf: string; secondHalf: string } | null {
  const parsed = parseCubicBezierPath(pathD);
  if (!parsed) return null;

  const { start, cp1, cp2, end } = parsed;
  const { first, second } = splitCubicBezierAt(start, cp1, cp2, end, 0.5);

  return {
    firstHalf: cubicBezierToPath(first[0], first[1], first[2], first[3]),
    secondHalf: cubicBezierToPath(second[0], second[1], second[2], second[3]),
  };
}

