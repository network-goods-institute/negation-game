import { Position } from '@xyflow/react';

export interface OrthogonalPathOptions {
  gridSize?: number;
  cornerRadius?: number;
  preferredDirection?: 'horizontal-first' | 'vertical-first';
}

export interface PathSegment {
  type: 'horizontal' | 'vertical';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface OrthogonalPathResult {
  path: string;
  labelX: number;
  labelY: number;
  segments: PathSegment[];
  totalLength: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundToGrid(value: number, gridSize: number): number {
  if (gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

export function getOrthogonalPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePosition: Position,
  targetPosition: Position,
  options: OrthogonalPathOptions = {}
): OrthogonalPathResult {
  const { gridSize = 0, cornerRadius = 6 } = options;

  const sx = gridSize > 0 ? roundToGrid(sourceX, gridSize) : sourceX;
  const sy = gridSize > 0 ? roundToGrid(sourceY, gridSize) : sourceY;
  const tx = gridSize > 0 ? roundToGrid(targetX, gridSize) : targetX;
  const ty = gridSize > 0 ? roundToGrid(targetY, gridSize) : targetY;

  const dx = tx - sx;
  const dy = ty - sy;

  const segments: PathSegment[] = [];
  const points: Array<{ x: number; y: number }> = [{ x: sx, y: sy }];

  const isSourceVertical = sourcePosition === Position.Top || sourcePosition === Position.Bottom;
  const isTargetVertical = targetPosition === Position.Top || targetPosition === Position.Bottom;

  const minExtension = 30;

  if (isSourceVertical && isTargetVertical) {
    const sourceGoesDown = sourcePosition === Position.Bottom;
    const targetComesFromTop = targetPosition === Position.Top;

    if (sourceGoesDown && targetComesFromTop && sy < ty) {
      const midY = sy + dy / 2;
      points.push({ x: sx, y: midY });
      points.push({ x: tx, y: midY });
      points.push({ x: tx, y: ty });

      segments.push({ type: 'vertical', startX: sx, startY: sy, endX: sx, endY: midY });
      segments.push({ type: 'horizontal', startX: sx, startY: midY, endX: tx, endY: midY });
      segments.push({ type: 'vertical', startX: tx, startY: midY, endX: tx, endY: ty });
    } else if (!sourceGoesDown && !targetComesFromTop && sy > ty) {
      const midY = sy + dy / 2;
      points.push({ x: sx, y: midY });
      points.push({ x: tx, y: midY });
      points.push({ x: tx, y: ty });

      segments.push({ type: 'vertical', startX: sx, startY: sy, endX: sx, endY: midY });
      segments.push({ type: 'horizontal', startX: sx, startY: midY, endX: tx, endY: midY });
      segments.push({ type: 'vertical', startX: tx, startY: midY, endX: tx, endY: ty });
    } else {
      const extensionY = sourceGoesDown ? minExtension : -minExtension;
      const firstY = sy + extensionY;
      const midX = sx + dx / 2;
      const secondY = ty + (targetComesFromTop ? -minExtension : minExtension);

      points.push({ x: sx, y: firstY });
      points.push({ x: midX, y: firstY });
      points.push({ x: midX, y: secondY });
      points.push({ x: tx, y: secondY });
      points.push({ x: tx, y: ty });

      segments.push({ type: 'vertical', startX: sx, startY: sy, endX: sx, endY: firstY });
      segments.push({ type: 'horizontal', startX: sx, startY: firstY, endX: midX, endY: firstY });
      segments.push({ type: 'vertical', startX: midX, startY: firstY, endX: midX, endY: secondY });
      segments.push({ type: 'horizontal', startX: midX, startY: secondY, endX: tx, endY: secondY });
      segments.push({ type: 'vertical', startX: tx, startY: secondY, endX: tx, endY: ty });
    }
  } else if (!isSourceVertical && !isTargetVertical) {
    const sourceGoesRight = sourcePosition === Position.Right;
    const targetComesFromLeft = targetPosition === Position.Left;

    if (sourceGoesRight && targetComesFromLeft && sx < tx) {
      const midX = sx + dx / 2;
      points.push({ x: midX, y: sy });
      points.push({ x: midX, y: ty });
      points.push({ x: tx, y: ty });

      segments.push({ type: 'horizontal', startX: sx, startY: sy, endX: midX, endY: sy });
      segments.push({ type: 'vertical', startX: midX, startY: sy, endX: midX, endY: ty });
      segments.push({ type: 'horizontal', startX: midX, startY: ty, endX: tx, endY: ty });
    } else if (!sourceGoesRight && !targetComesFromLeft && sx > tx) {
      const midX = sx + dx / 2;
      points.push({ x: midX, y: sy });
      points.push({ x: midX, y: ty });
      points.push({ x: tx, y: ty });

      segments.push({ type: 'horizontal', startX: sx, startY: sy, endX: midX, endY: sy });
      segments.push({ type: 'vertical', startX: midX, startY: sy, endX: midX, endY: ty });
      segments.push({ type: 'horizontal', startX: midX, startY: ty, endX: tx, endY: ty });
    } else {
      const extensionX = sourceGoesRight ? minExtension : -minExtension;
      const firstX = sx + extensionX;
      const midY = sy + dy / 2;
      const secondX = tx + (targetComesFromLeft ? -minExtension : minExtension);

      points.push({ x: firstX, y: sy });
      points.push({ x: firstX, y: midY });
      points.push({ x: secondX, y: midY });
      points.push({ x: secondX, y: ty });
      points.push({ x: tx, y: ty });

      segments.push({ type: 'horizontal', startX: sx, startY: sy, endX: firstX, endY: sy });
      segments.push({ type: 'vertical', startX: firstX, startY: sy, endX: firstX, endY: midY });
      segments.push({ type: 'horizontal', startX: firstX, startY: midY, endX: secondX, endY: midY });
      segments.push({ type: 'vertical', startX: secondX, startY: midY, endX: secondX, endY: ty });
      segments.push({ type: 'horizontal', startX: secondX, startY: ty, endX: tx, endY: ty });
    }
  } else if (isSourceVertical && !isTargetVertical) {
    const sourceGoesDown = sourcePosition === Position.Bottom;
    const targetGoesRight = targetPosition === Position.Right;

    if ((sourceGoesDown && ty > sy) || (!sourceGoesDown && ty < sy)) {
      points.push({ x: sx, y: ty });
      points.push({ x: tx, y: ty });

      segments.push({ type: 'vertical', startX: sx, startY: sy, endX: sx, endY: ty });
      segments.push({ type: 'horizontal', startX: sx, startY: ty, endX: tx, endY: ty });
    } else {
      const extensionY = sourceGoesDown ? minExtension : -minExtension;
      const firstY = sy + extensionY;
      const secondX = targetGoesRight ? tx + minExtension : tx - minExtension;

      points.push({ x: sx, y: firstY });
      points.push({ x: secondX, y: firstY });
      points.push({ x: secondX, y: ty });
      points.push({ x: tx, y: ty });

      segments.push({ type: 'vertical', startX: sx, startY: sy, endX: sx, endY: firstY });
      segments.push({ type: 'horizontal', startX: sx, startY: firstY, endX: secondX, endY: firstY });
      segments.push({ type: 'vertical', startX: secondX, startY: firstY, endX: secondX, endY: ty });
      segments.push({ type: 'horizontal', startX: secondX, startY: ty, endX: tx, endY: ty });
    }
  } else {
    const sourceGoesRight = sourcePosition === Position.Right;
    const targetComesFromTop = targetPosition === Position.Top;

    if ((sourceGoesRight && tx > sx) || (!sourceGoesRight && tx < sx)) {
      points.push({ x: tx, y: sy });
      points.push({ x: tx, y: ty });

      segments.push({ type: 'horizontal', startX: sx, startY: sy, endX: tx, endY: sy });
      segments.push({ type: 'vertical', startX: tx, startY: sy, endX: tx, endY: ty });
    } else {
      const extensionX = sourceGoesRight ? minExtension : -minExtension;
      const firstX = sx + extensionX;
      const secondY = targetComesFromTop ? ty - minExtension : ty + minExtension;

      points.push({ x: firstX, y: sy });
      points.push({ x: firstX, y: secondY });
      points.push({ x: tx, y: secondY });
      points.push({ x: tx, y: ty });

      segments.push({ type: 'horizontal', startX: sx, startY: sy, endX: firstX, endY: sy });
      segments.push({ type: 'vertical', startX: firstX, startY: sy, endX: firstX, endY: secondY });
      segments.push({ type: 'horizontal', startX: firstX, startY: secondY, endX: tx, endY: secondY });
      segments.push({ type: 'vertical', startX: tx, startY: secondY, endX: tx, endY: ty });
    }
  }

  const path = buildPathWithRoundedCorners(points, cornerRadius);
  const totalLength = calculateSegmentsTotalLength(segments);
  const midpoint = getPointAtPercentageInternal(segments, 0.5, totalLength);

  return {
    path,
    labelX: midpoint.x,
    labelY: midpoint.y,
    segments,
    totalLength,
  };
}

function buildPathWithRoundedCorners(
  points: Array<{ x: number; y: number }>,
  cornerRadius: number
): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  const r = Math.max(0, cornerRadius);
  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const toPrev = { x: prev.x - curr.x, y: prev.y - curr.y };
    const toNext = { x: next.x - curr.x, y: next.y - curr.y };

    const lenToPrev = Math.sqrt(toPrev.x * toPrev.x + toPrev.y * toPrev.y);
    const lenToNext = Math.sqrt(toNext.x * toNext.x + toNext.y * toNext.y);

    if (lenToPrev === 0 || lenToNext === 0) {
      path += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    const maxRadius = Math.min(r, lenToPrev / 2, lenToNext / 2);

    if (maxRadius <= 0) {
      path += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    const unitToPrev = { x: toPrev.x / lenToPrev, y: toPrev.y / lenToPrev };
    const unitToNext = { x: toNext.x / lenToNext, y: toNext.y / lenToNext };

    const startArc = {
      x: curr.x + unitToPrev.x * maxRadius,
      y: curr.y + unitToPrev.y * maxRadius,
    };
    const endArc = {
      x: curr.x + unitToNext.x * maxRadius,
      y: curr.y + unitToNext.y * maxRadius,
    };

    const cross = unitToPrev.x * unitToNext.y - unitToPrev.y * unitToNext.x;
    const sweepFlag = cross < 0 ? 1 : 0;

    path += ` L ${startArc.x} ${startArc.y}`;
    path += ` A ${maxRadius} ${maxRadius} 0 0 ${sweepFlag} ${endArc.x} ${endArc.y}`;
  }

  const last = points[points.length - 1];
  path += ` L ${last.x} ${last.y}`;

  return path;
}

function calculateSegmentsTotalLength(segments: PathSegment[]): number {
  return segments.reduce((total, seg) => {
    const dx = seg.endX - seg.startX;
    const dy = seg.endY - seg.startY;
    return total + Math.abs(dx) + Math.abs(dy);
  }, 0);
}

function getPointAtPercentageInternal(
  segments: PathSegment[],
  t: number,
  totalLength: number
): { x: number; y: number } {
  const clampedT = clamp(t, 0, 1);
  const targetDist = clampedT * totalLength;

  let accumulatedDist = 0;

  for (const seg of segments) {
    const dx = seg.endX - seg.startX;
    const dy = seg.endY - seg.startY;
    const segLength = Math.abs(dx) + Math.abs(dy);

    if (accumulatedDist + segLength >= targetDist) {
      const remainingDist = targetDist - accumulatedDist;
      const segT = segLength > 0 ? remainingDist / segLength : 0;

      return {
        x: seg.startX + dx * segT,
        y: seg.startY + dy * segT,
      };
    }

    accumulatedDist += segLength;
  }

  if (segments.length > 0) {
    const last = segments[segments.length - 1];
    return { x: last.endX, y: last.endY };
  }

  return { x: 0, y: 0 };
}

export function getPointAtPercentage(
  segments: PathSegment[],
  t: number
): { x: number; y: number } {
  const totalLength = calculateSegmentsTotalLength(segments);
  return getPointAtPercentageInternal(segments, t, totalLength);
}

export function getPercentageFromPoint(
  segments: PathSegment[],
  point: { x: number; y: number }
): number {
  const totalLength = calculateSegmentsTotalLength(segments);
  if (totalLength === 0) return 0;

  let accumulatedDist = 0;
  let closestT = 0;
  let closestDistSq = Infinity;

  for (const seg of segments) {
    const dx = seg.endX - seg.startX;
    const dy = seg.endY - seg.startY;
    const segLength = Math.abs(dx) + Math.abs(dy);

    if (segLength === 0) continue;

    let projT: number;
    if (seg.type === 'horizontal') {
      const minX = Math.min(seg.startX, seg.endX);
      const maxX = Math.max(seg.startX, seg.endX);
      const clampedX = clamp(point.x, minX, maxX);
      projT = dx !== 0 ? (clampedX - seg.startX) / dx : 0;
    } else {
      const minY = Math.min(seg.startY, seg.endY);
      const maxY = Math.max(seg.startY, seg.endY);
      const clampedY = clamp(point.y, minY, maxY);
      projT = dy !== 0 ? (clampedY - seg.startY) / dy : 0;
    }

    projT = clamp(projT, 0, 1);
    const projX = seg.startX + dx * projT;
    const projY = seg.startY + dy * projT;

    const distSq = (point.x - projX) ** 2 + (point.y - projY) ** 2;

    if (distSq < closestDistSq) {
      closestDistSq = distSq;
      closestT = (accumulatedDist + projT * segLength) / totalLength;
    }

    accumulatedDist += segLength;
  }

  return clamp(closestT, 0, 1);
}

export function getHalfOrthogonalPaths(
  segments: PathSegment[],
  cornerRadius: number = 6
): { firstHalf: string; secondHalf: string } | null {
  if (segments.length === 0) return null;

  const totalLength = calculateSegmentsTotalLength(segments);
  const midpoint = getPointAtPercentageInternal(segments, 0.5, totalLength);

  const firstHalfSegments: PathSegment[] = [];
  const secondHalfSegments: PathSegment[] = [];

  let accumulatedDist = 0;
  const targetDist = totalLength / 2;
  let foundMid = false;

  for (const seg of segments) {
    const dx = seg.endX - seg.startX;
    const dy = seg.endY - seg.startY;
    const segLength = Math.abs(dx) + Math.abs(dy);

    if (!foundMid) {
      if (accumulatedDist + segLength >= targetDist) {
        const remainingDist = targetDist - accumulatedDist;
        const segT = segLength > 0 ? remainingDist / segLength : 0;

        firstHalfSegments.push({
          type: seg.type,
          startX: seg.startX,
          startY: seg.startY,
          endX: seg.startX + dx * segT,
          endY: seg.startY + dy * segT,
        });

        secondHalfSegments.push({
          type: seg.type,
          startX: seg.startX + dx * segT,
          startY: seg.startY + dy * segT,
          endX: seg.endX,
          endY: seg.endY,
        });

        foundMid = true;
      } else {
        firstHalfSegments.push(seg);
      }
    } else {
      secondHalfSegments.push(seg);
    }

    accumulatedDist += segLength;
  }

  const firstPoints = segmentsToPoints(firstHalfSegments);
  const secondPoints = segmentsToPoints(secondHalfSegments);

  return {
    firstHalf: buildPathWithRoundedCorners(firstPoints, cornerRadius),
    secondHalf: buildPathWithRoundedCorners(secondPoints, cornerRadius),
  };
}

function segmentsToPoints(segments: PathSegment[]): Array<{ x: number; y: number }> {
  if (segments.length === 0) return [];

  const points: Array<{ x: number; y: number }> = [
    { x: segments[0].startX, y: segments[0].startY }
  ];

  for (const seg of segments) {
    const lastPoint = points[points.length - 1];
    if (lastPoint.x !== seg.endX || lastPoint.y !== seg.endY) {
      points.push({ x: seg.endX, y: seg.endY });
    }
  }

  return points;
}

export function getOrthogonalPathSimple(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  options: OrthogonalPathOptions = {}
): OrthogonalPathResult {
  const sourcePosition = sourceY < targetY ? Position.Bottom : Position.Top;
  const targetPosition = sourceY < targetY ? Position.Top : Position.Bottom;

  return getOrthogonalPath(
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    options
  );
}
