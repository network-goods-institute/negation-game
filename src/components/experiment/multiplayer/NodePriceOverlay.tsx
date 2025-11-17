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
          // Exclude statement and comment nodes entirely from price overlays
          if ((n as any)?.type === 'statement' || (n as any)?.type === 'comment') return null;
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
          const fillHeight = Math.round(sh * p);
          const fillY = sh - fillHeight;
          const isObjection = (n as any)?.type === 'objection';
          const color = isObjection ? '#f59e0b' : '#d1d5db';

          // Base font size on node width - roughly 1/8th of width for good fit
          const fontSize = Math.max(6, Math.min(14, sw / 8));
          const text = `${(p * 100).toFixed(1)}% chance`;

          return (
            <div
              key={`price-${n.id}`}
              className="absolute"
              style={{ left: sx, top: sy, transform: "translate(-50%, -50%)", width: sw, height: sh }}
            >
              {/* SVG background with price fill */}
              <svg width={sw} height={sh} className="absolute inset-0 pointer-events-none" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.06)) drop-shadow(0 1px 3px rgba(0,0,0,0.1))' }}>
                <defs>
                  <clipPath id={`node-clip-${n.id}`}>
                    <rect x={0} y={0} width={sw} height={sh} rx={6} />
                  </clipPath>
                </defs>
                <rect x={0} y={0} width={sw} height={sh} fill="rgba(255,255,255,0.95)" stroke="#d1d5db" strokeWidth={0.5} rx={6} />
                <g clipPath={`url(#node-clip-${n.id})`}>
                  <rect x={0} y={fillY} width={sw} height={fillHeight} fill={color} />
                </g>
                <rect x={0} y={0} width={sw} height={sh} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={0.5} rx={6} />
              </svg>
              {/* Text overlay - not constrained by SVG bounds */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none select-none backdrop-blur-[0.5px]"
                style={{
                  fontSize: `${fontSize}px`,
                  padding: '0 4px',
                }}
              >
                <span className="font-medium text-stone-800 whitespace-nowrap" style={{
                  textShadow: '0 1px 2px rgba(255,255,255,0.9), 0 0 8px rgba(255,255,255,0.7)',
                  letterSpacing: '-0.02em'
                }}>
                  {text}
                </span>
              </div>
            </div>
          );
        })}
    </div>
  );
}
