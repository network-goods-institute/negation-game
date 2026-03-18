"use client";

import React from "react";
import { useViewport } from "@xyflow/react";
import { useGraphActions } from "./GraphContext";
import { getNodeDimensionsAndCenter } from "@/utils/experiment/multiplayer/nodeUtils";

type StatementOverlayNode = {
  id: string;
  type?: string;
  selected?: boolean;
  position?: { x: number; y: number };
  width?: number;
  height?: number;
  measured?: { width?: number; height?: number };
  data?: {
    statement?: string;
    hidden?: boolean;
  };
};

type Props = {
  nodes: StatementOverlayNode[];
  minZoomThreshold?: number;
  maxZoomThreshold?: number;
};

const DEFAULT_MIN_ZOOM_THRESHOLD = 0.3;
const DEFAULT_MAX_ZOOM_THRESHOLD = 0.55;
const BASE_WIDTH_PX = 280;
const BASE_FONT_SIZE_PX = 14;
const BASE_LINE_HEIGHT_PX = 20;
const BASE_PADDING_X_PX = 14;
const BASE_PADDING_Y_PX = 8;

export function StatementReadabilityOverlay({
  nodes,
  minZoomThreshold = DEFAULT_MIN_ZOOM_THRESHOLD,
  maxZoomThreshold = DEFAULT_MAX_ZOOM_THRESHOLD,
}: Props) {
  const { zoom, x: vx, y: vy } = useViewport();
  const graph = useGraphActions() as any;
  const hoveredNodeId: string | null = graph?.hoveredNodeId ?? null;

  if (!Array.isArray(nodes) || nodes.length === 0) return null;
  if (!Number.isFinite(zoom) || zoom < minZoomThreshold || zoom > maxZoomThreshold) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 25 }}>
      {nodes.map((node) => {
        if ((node?.type || "").toLowerCase() !== "statement") return null;
        if (node?.selected) return null;
        if (hoveredNodeId && String(hoveredNodeId) === String(node.id)) return null;
        if (node?.data?.hidden === true) return null;

        const statement = typeof node?.data?.statement === "string"
          ? node.data.statement.trim()
          : "";

        if (!statement) return null;

        const { centerX, centerY } = getNodeDimensionsAndCenter(node);
        const sx = Math.round(centerX * zoom + vx);
        const sy = Math.round(centerY * zoom + vy);

        return (
          <div
            key={`statement-readable-${node.id}`}
            className="absolute rounded-xl border border-blue-300/80 bg-blue-50/96 text-blue-950 shadow-[0_10px_30px_rgba(59,130,246,0.18)] backdrop-blur-sm"
            style={{
              left: sx,
              top: sy,
              width: `${BASE_WIDTH_PX}px`,
              padding: `${BASE_PADDING_Y_PX}px ${BASE_PADDING_X_PX}px`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              className="whitespace-pre-wrap break-words text-center font-medium"
              style={{
                fontSize: `${BASE_FONT_SIZE_PX}px`,
                lineHeight: `${BASE_LINE_HEIGHT_PX}px`,
              }}
            >
              {statement}
            </div>
          </div>
        );
      })}
    </div>
  );
}
