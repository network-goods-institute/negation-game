import { Position } from '@xyflow/react';
import {
  getOrthogonalPath,
  getOrthogonalPathSimple,
  getPointAtPercentage,
  getPercentageFromPoint,
  getHalfOrthogonalPaths,
  PathSegment,
} from '../orthogonalPath';

describe('getOrthogonalPath', () => {
  it('generates a path with vertical-first routing when source is above target', () => {
    const result = getOrthogonalPath(
      100, 100,
      200, 300,
      Position.Bottom,
      Position.Top,
      { cornerRadius: 6 }
    );

    expect(result.path).toBeDefined();
    expect(result.path.length).toBeGreaterThan(0);
    expect(result.segments.length).toBeGreaterThan(0);
    expect(result.totalLength).toBeGreaterThan(0);
  });

  it('generates a path with correct midpoint', () => {
    const result = getOrthogonalPath(
      0, 0,
      100, 200,
      Position.Bottom,
      Position.Top,
      { cornerRadius: 0 }
    );

    expect(result.labelX).toBeGreaterThanOrEqual(0);
    expect(result.labelX).toBeLessThanOrEqual(100);
    expect(result.labelY).toBeGreaterThanOrEqual(0);
    expect(result.labelY).toBeLessThanOrEqual(200);
  });

  it('creates segments for simple vertical connection', () => {
    const result = getOrthogonalPath(
      100, 0,
      200, 200,
      Position.Bottom,
      Position.Top,
      { cornerRadius: 0 }
    );

    expect(result.segments.length).toBe(3);
    expect(result.segments[0].type).toBe('vertical');
    expect(result.segments[1].type).toBe('horizontal');
    expect(result.segments[2].type).toBe('vertical');
  });

  it('handles same x coordinate', () => {
    const result = getOrthogonalPath(
      100, 0,
      100, 200,
      Position.Bottom,
      Position.Top,
      { cornerRadius: 0 }
    );

    expect(result.path).toBeDefined();
    expect(result.segments.length).toBeGreaterThanOrEqual(1);
  });

  it('handles same y coordinate', () => {
    const result = getOrthogonalPath(
      0, 100,
      200, 100,
      Position.Right,
      Position.Left,
      { cornerRadius: 0 }
    );

    expect(result.path).toBeDefined();
    expect(result.segments.length).toBeGreaterThanOrEqual(1);
  });

  it('respects gridSize option', () => {
    const result = getOrthogonalPath(
      13, 17,
      103, 207,
      Position.Bottom,
      Position.Top,
      { cornerRadius: 0, gridSize: 10 }
    );

    expect(result.path).toContain('M 10 20');
  });

  it('handles horizontal-first routing', () => {
    const result = getOrthogonalPath(
      0, 100,
      200, 100,
      Position.Right,
      Position.Left,
      { cornerRadius: 0 }
    );

    expect(result.segments[0].type).toBe('horizontal');
  });
});

describe('getOrthogonalPathSimple', () => {
  it('automatically determines positions based on coordinates', () => {
    const result = getOrthogonalPathSimple(
      100, 0,
      200, 200,
      { cornerRadius: 6 }
    );

    expect(result.path).toBeDefined();
    expect(result.labelX).toBeDefined();
    expect(result.labelY).toBeDefined();
    expect(result.segments.length).toBeGreaterThan(0);
  });

  it('handles inverted y coordinates', () => {
    const result = getOrthogonalPathSimple(
      100, 200,
      200, 0,
      { cornerRadius: 6 }
    );

    expect(result.path).toBeDefined();
    expect(result.segments.length).toBeGreaterThan(0);
  });
});

describe('getPointAtPercentage', () => {
  it('returns start point at t=0', () => {
    const segments: PathSegment[] = [
      { type: 'vertical', startX: 0, startY: 0, endX: 0, endY: 100 },
      { type: 'horizontal', startX: 0, startY: 100, endX: 100, endY: 100 },
    ];

    const point = getPointAtPercentage(segments, 0);
    expect(point.x).toBe(0);
    expect(point.y).toBe(0);
  });

  it('returns end point at t=1', () => {
    const segments: PathSegment[] = [
      { type: 'vertical', startX: 0, startY: 0, endX: 0, endY: 100 },
      { type: 'horizontal', startX: 0, startY: 100, endX: 100, endY: 100 },
    ];

    const point = getPointAtPercentage(segments, 1);
    expect(point.x).toBe(100);
    expect(point.y).toBe(100);
  });

  it('returns midpoint at t=0.5', () => {
    const segments: PathSegment[] = [
      { type: 'vertical', startX: 0, startY: 0, endX: 0, endY: 100 },
      { type: 'horizontal', startX: 0, startY: 100, endX: 100, endY: 100 },
    ];

    const point = getPointAtPercentage(segments, 0.5);
    expect(point.x).toBe(0);
    expect(point.y).toBe(100);
  });

  it('interpolates correctly within a segment', () => {
    const segments: PathSegment[] = [
      { type: 'horizontal', startX: 0, startY: 0, endX: 200, endY: 0 },
    ];

    const point = getPointAtPercentage(segments, 0.25);
    expect(point.x).toBe(50);
    expect(point.y).toBe(0);
  });

  it('handles empty segments array', () => {
    const point = getPointAtPercentage([], 0.5);
    expect(point.x).toBe(0);
    expect(point.y).toBe(0);
  });

  it('clamps t values outside 0-1 range', () => {
    const segments: PathSegment[] = [
      { type: 'horizontal', startX: 0, startY: 0, endX: 100, endY: 0 },
    ];

    const pointNegative = getPointAtPercentage(segments, -0.5);
    expect(pointNegative.x).toBe(0);
    expect(pointNegative.y).toBe(0);

    const pointOverOne = getPointAtPercentage(segments, 1.5);
    expect(pointOverOne.x).toBe(100);
    expect(pointOverOne.y).toBe(0);
  });
});

describe('getPercentageFromPoint', () => {
  it('returns 0 for point at start', () => {
    const segments: PathSegment[] = [
      { type: 'horizontal', startX: 0, startY: 0, endX: 100, endY: 0 },
    ];

    const t = getPercentageFromPoint(segments, { x: 0, y: 0 });
    expect(t).toBeCloseTo(0, 5);
  });

  it('returns 1 for point at end', () => {
    const segments: PathSegment[] = [
      { type: 'horizontal', startX: 0, startY: 0, endX: 100, endY: 0 },
    ];

    const t = getPercentageFromPoint(segments, { x: 100, y: 0 });
    expect(t).toBeCloseTo(1, 5);
  });

  it('returns 0.5 for point at midpoint', () => {
    const segments: PathSegment[] = [
      { type: 'horizontal', startX: 0, startY: 0, endX: 100, endY: 0 },
    ];

    const t = getPercentageFromPoint(segments, { x: 50, y: 0 });
    expect(t).toBeCloseTo(0.5, 5);
  });

  it('projects point to nearest path location', () => {
    const segments: PathSegment[] = [
      { type: 'horizontal', startX: 0, startY: 0, endX: 100, endY: 0 },
    ];

    const t = getPercentageFromPoint(segments, { x: 50, y: 50 });
    expect(t).toBeCloseTo(0.5, 5);
  });

  it('handles multi-segment paths', () => {
    const segments: PathSegment[] = [
      { type: 'vertical', startX: 0, startY: 0, endX: 0, endY: 100 },
      { type: 'horizontal', startX: 0, startY: 100, endX: 100, endY: 100 },
    ];

    const tStart = getPercentageFromPoint(segments, { x: 0, y: 0 });
    expect(tStart).toBeCloseTo(0, 5);

    const tEnd = getPercentageFromPoint(segments, { x: 100, y: 100 });
    expect(tEnd).toBeCloseTo(1, 5);
  });

  it('handles empty segments array', () => {
    const t = getPercentageFromPoint([], { x: 50, y: 50 });
    expect(t).toBe(0);
  });
});

describe('getHalfOrthogonalPaths', () => {
  it('splits path into two halves', () => {
    const segments: PathSegment[] = [
      { type: 'vertical', startX: 0, startY: 0, endX: 0, endY: 100 },
      { type: 'horizontal', startX: 0, startY: 100, endX: 100, endY: 100 },
    ];

    const result = getHalfOrthogonalPaths(segments, 0);
    expect(result).not.toBeNull();
    expect(result!.firstHalf).toBeDefined();
    expect(result!.secondHalf).toBeDefined();
  });

  it('first half starts at source', () => {
    const segments: PathSegment[] = [
      { type: 'horizontal', startX: 0, startY: 0, endX: 100, endY: 0 },
    ];

    const result = getHalfOrthogonalPaths(segments, 0);
    expect(result).not.toBeNull();
    expect(result!.firstHalf).toContain('M 0 0');
  });

  it('second half ends at target', () => {
    const segments: PathSegment[] = [
      { type: 'horizontal', startX: 0, startY: 0, endX: 100, endY: 0 },
    ];

    const result = getHalfOrthogonalPaths(segments, 0);
    expect(result).not.toBeNull();
    expect(result!.secondHalf).toContain('100 0');
  });

  it('returns null for empty segments', () => {
    const result = getHalfOrthogonalPaths([], 0);
    expect(result).toBeNull();
  });

  it('handles rounded corners', () => {
    const segments: PathSegment[] = [
      { type: 'vertical', startX: 0, startY: 0, endX: 0, endY: 100 },
      { type: 'horizontal', startX: 0, startY: 100, endX: 100, endY: 100 },
    ];

    const result = getHalfOrthogonalPaths(segments, 6);
    expect(result).not.toBeNull();
    expect(result!.firstHalf).toBeDefined();
    expect(result!.secondHalf).toBeDefined();
  });
});

describe('path roundtrip consistency', () => {
  it('getPointAtPercentage and getPercentageFromPoint are consistent', () => {
    const segments: PathSegment[] = [
      { type: 'vertical', startX: 0, startY: 0, endX: 0, endY: 100 },
      { type: 'horizontal', startX: 0, startY: 100, endX: 100, endY: 100 },
      { type: 'vertical', startX: 100, startY: 100, endX: 100, endY: 200 },
    ];

    const testTs = [0, 0.25, 0.5, 0.75, 1];
    for (const originalT of testTs) {
      const point = getPointAtPercentage(segments, originalT);
      const recoveredT = getPercentageFromPoint(segments, point);
      expect(recoveredT).toBeCloseTo(originalT, 3);
    }
  });
});
