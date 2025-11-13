import React from "react";
import { createPortal } from "react-dom";

interface SnapLinesProps {
  snappedX: boolean;
  snappedY: boolean;
  snapX: number | null;
  snapY: number | null;
  edgesLayer: SVGElement | null;
}

export const SnapLines: React.FC<SnapLinesProps> = ({
  snappedX,
  snappedY,
  snapX,
  snapY,
  edgesLayer,
}) => {
  if (!edgesLayer) return null;

  const lines: React.ReactNode[] = [];

  if (snappedX && snapX !== null) {
    lines.push(
      <line
        key="snap-x"
        x1={snapX}
        y1={-100000}
        x2={snapX}
        y2={100000}
        stroke="#3b82f6"
        strokeWidth={1}
        strokeDasharray="4 4"
        opacity={0.5}
        pointerEvents="none"
      />
    );
  }

  if (snappedY && snapY !== null) {
    lines.push(
      <line
        key="snap-y"
        x1={-100000}
        y1={snapY}
        x2={100000}
        y2={snapY}
        stroke="#3b82f6"
        strokeWidth={1}
        strokeDasharray="4 4"
        opacity={0.5}
        pointerEvents="none"
      />
    );
  }

  if (lines.length === 0) return null;

  return createPortal(
    <g className="snap-lines" style={{ pointerEvents: "none" }}>
      {lines}
    </g>,
    edgesLayer
  );
};
