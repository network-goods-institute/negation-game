"use client";
import React from "react";
import { useViewport } from "@xyflow/react";
import { getNodeDimensionsAndCenter } from "@/utils/experiment/multiplayer/nodeUtils";
import { useGraphActions } from "./GraphContext";
import { useAtomValue } from "jotai";
import { marketOverlayStateAtom, marketOverlayZoomThresholdAtom, computeSide } from "@/atoms/marketOverlayAtom";

type Props = {
  nodes: Array<{ id: string; position?: { x: number; y: number }; width?: number; height?: number; data?: any }>;
  prices: Record<string, number> | null;
  zoomThreshold?: number;
};

export function NodePriceOverlay({ nodes, prices, zoomThreshold = 0.6 }: Props) {
  const { zoom, x: vx, y: vy } = useViewport();
  const graph = useGraphActions() as any;
  const hoveredNodeId: string | null = graph?.hoveredNodeId ?? null;
  const state = useAtomValue(marketOverlayStateAtom);
  const threshold = useAtomValue(marketOverlayZoomThresholdAtom);
  let side = computeSide(state);
  if (state === 'AUTO_TEXT' || state === 'AUTO_PRICE') {
    side = zoom <= (threshold ?? 0.6) ? 'PRICE' : 'TEXT';
  }
  const hasRF = typeof document !== 'undefined' && !!document.querySelector('.react-flow__viewport');
  const show = hasRF ? (side === 'PRICE') : true;
  if (!prices || !show) return null;
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
      {nodes.map((n) => {
          // Exclude statement nodes entirely from price overlays
          if ((n as any)?.type === 'statement') return null;
          const p = prices[n.id];
          if (typeof p !== "number") return null;
          const { width: w, height: h, centerX, centerY } = getNodeDimensionsAndCenter(n);
          // Hide overlay when node is selected
          if ((n as any)?.selected) return null;
          // Hide overlay when node is hovered (so underlying content/affordances are visible)
          if (hoveredNodeId && String(hoveredNodeId) === String(n.id)) return null;
          const sx = Math.round(centerX * zoom + vx);
          const sy = Math.round(centerY * zoom + vy);
          const sw = Math.max(1, Math.round(w * zoom));
          const sh = Math.max(1, Math.round(h * zoom));
          // Scale text size with zoom level - smaller as we zoom out more
          const fontSizePx = Math.max(8, Math.min(13, 12 + (zoom - 1) * 2));
          const fillHeight = Math.round(sh * p);
          const fillY = sh - fillHeight;
          const isObjection = (n as any)?.type === 'objection';
          const color = isObjection ? '#f59e0b' : '#d1d5db'; // orange for objection, light grey otherwise
          return (
            <div
              key={`price-${n.id}`}
              className="absolute subpixel-antialiased rounded-md overflow-hidden font-sans"
              style={{ left: sx, top: sy, transform: "translate(-50%, -50%)", width: sw, height: sh }}
            >
              <svg width={sw} height={sh} className="absolute inset-0 drop-shadow-sm">
                <defs>
                  <clipPath id={`node-clip-${n.id}`}>
                    <rect x={0} y={0} width={sw} height={sh} rx={6} />
                  </clipPath>
                </defs>
                <rect x={0} y={0} width={sw} height={sh} fill="#ffffff" stroke="#e5e7eb" strokeWidth={1} rx={6} />
                <g clipPath={`url(#node-clip-${n.id})`}>
                  <rect x={0} y={fillY} width={sw} height={fillHeight} fill={color} />
                </g>
                <rect x={0} y={0} width={sw} height={sh} fill="none" stroke="#334155" strokeOpacity={0.15} strokeWidth={1} rx={6} />
              </svg>
              <div className="relative w-full h-full flex items-center justify-center px-1.5 py-1 font-semibold text-stone-800" style={{ fontSize: fontSizePx }}>
                {/* Condense label when very narrow to avoid truncation */}
                {sw < 72 ? `${(p * 100).toFixed(0)}%` : `${(p * 100).toFixed(1)}% chance`}
              </div>
            </div>
          );
        })}
    </div>
  );
}
