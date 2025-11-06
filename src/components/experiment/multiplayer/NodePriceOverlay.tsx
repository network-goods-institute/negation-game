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
          // Exclude statement nodes entirely from price overlays
          if ((n as any)?.type === 'statement') return null;
          const p = prices[n.id];
          if (typeof p !== "number") return null;
          const { width: w, height: h, centerX, centerY } = getNodeDimensionsAndCenter(n);
          // Hide overlay when node is selected
          if ((n as any)?.selected) return null;
          const sx = centerX * zoom + vx;
          const sy = centerY * zoom + vy;
          const sw = Math.max(1, Math.round(w * zoom));
          const sh = Math.max(1, Math.round(h * zoom));
          // Scale text gently with zoom but clamp tightly (min 11px, max 12px)
          const fontSizePx = Math.max(11, Math.min(12, 11 + Math.min(1, Math.max(0, zoom - 1))));
          return (
            <div
              key={`price-${n.id}`}
              className="absolute bg-white/90 border border-stone-200 text-stone-800 shadow-sm rounded-md overflow-hidden"
              style={{ left: sx, top: sy, transform: "translate(-50%, -50%)", width: sw, height: sh }}
            >
              <div className="w-full h-full flex items-center justify-center px-2 py-1 font-semibold" style={{ fontSize: fontSizePx }}>
                {(p * 100).toFixed(1)}%
              </div>
            </div>
          );
        })}
    </div>
  );
}
