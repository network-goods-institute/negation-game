import React from "react";
import { createPortal } from "react-dom";
import { SNAP_CONFIG } from "@/lib/canvas/snapConfig";

interface SnapLinesProps {
  snappedX: boolean;
  snappedY: boolean;
  snapX: number | null;
  snapY: number | null;
  edgesLayer: SVGElement | null;
}

const LINE_EXTENT = 1000000;

export const SnapLines: React.FC<SnapLinesProps> = ({
  snappedX,
  snappedY,
  snapX,
  snapY,
  edgesLayer,
}) => {
  if (!edgesLayer) return null;

  const lines: React.ReactNode[] = [];

  if (snappedX && snapX !== null && isFinite(snapX)) {
    lines.push(
      <line
        key="snap-x"
        x1={snapX}
        y1={-LINE_EXTENT}
        x2={snapX}
        y2={LINE_EXTENT}
        stroke={SNAP_CONFIG.SNAP_LINE_COLOR}
        strokeWidth={SNAP_CONFIG.SNAP_LINE_STROKE_WIDTH}
        strokeDasharray={SNAP_CONFIG.SNAP_LINE_DASH_ARRAY}
        opacity={SNAP_CONFIG.SNAP_LINE_OPACITY}
        pointerEvents="none"
      />
    );
  }

  if (snappedY && snapY !== null && isFinite(snapY)) {
    lines.push(
      <line
        key="snap-y"
        x1={-LINE_EXTENT}
        y1={snapY}
        x2={LINE_EXTENT}
        y2={snapY}
        stroke={SNAP_CONFIG.SNAP_LINE_COLOR}
        strokeWidth={SNAP_CONFIG.SNAP_LINE_STROKE_WIDTH}
        strokeDasharray={SNAP_CONFIG.SNAP_LINE_DASH_ARRAY}
        opacity={SNAP_CONFIG.SNAP_LINE_OPACITY}
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
