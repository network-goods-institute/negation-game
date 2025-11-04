"use client";
import React from "react";
import { useViewport } from "@xyflow/react";
import { getNodeDimensionsAndCenter } from "@/utils/experiment/multiplayer/nodeUtils";

type Props = {
  nodes: Array<{ id: string; position?: { x: number; y: number }; width?: number; height?: number; data?: any }>;
  prices: Record<string, number> | null;
  zoomThreshold?: number;
};

export function NodePriceOverlay({ nodes, prices, zoomThreshold = 0.9 }: Props) {
  const { zoom, x: vx, y: vy } = useViewport();
  if (!prices) return null;
  const show = zoom <= zoomThreshold; // show when zoomed OUT
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
      {show &&
        nodes.map((n) => {
          const p = prices[n.id];
          if (typeof p !== "number") return null;
          const { width: w, centerX, centerY } = getNodeDimensionsAndCenter(n);
          const sx = centerX * zoom + vx;
          const sy = centerY * zoom + vy;
          return (
            <div
              key={`price-${n.id}`}
              className="absolute text-[11px] font-semibold px-2 py-1 rounded-md bg-white/95 border border-stone-200 text-stone-800 shadow-sm"
              style={{ left: sx, top: sy, transform: "translate(-50%, -50%)", minWidth: Math.max(140, Math.round(w * 0.9)) }}
            >
              {`Price: ${p.toFixed(2)}`}
            </div>
          );
        })}
    </div>
  );
}
