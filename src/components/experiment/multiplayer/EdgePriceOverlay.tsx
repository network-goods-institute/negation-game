"use client";
import React from 'react';
import { createPortal } from 'react-dom';
import { useReactFlow, useViewport, getBezierPath, getStraightPath, Position } from '@xyflow/react';
import { useGraphActions } from './GraphContext';
import { getTrimmedLineCoords } from '@/utils/experiment/multiplayer/edgePathUtils';
import { EDGE_CONFIGURATIONS, EdgeType } from './common/EdgeConfiguration';
import { useAtomValue } from 'jotai';
import { marketOverlayStateAtom, marketOverlayZoomThresholdAtom, computeSide } from '@/atoms/marketOverlayAtom';
import { logger } from '@/lib/logger';

type EdgeMarket = { price?: number | string; mine?: number | string; total?: number | string } | undefined;
type EdgeWithMarket = {
  id: string;
  source: string;
  target: string;
  type?: string;
  selected?: boolean;
  data?: { market?: EdgeMarket; parentEdgeId?: string } | undefined;
};

interface Props {
  edges: EdgeWithMarket[];
  zoomThreshold?: number; // show when zoom <= threshold
  sizePx?: number; // nominal circle diameter in px at threshold zoom
}

const SUPPORT_COLOR = '#10b981';
const NEGATION_COLOR = '#ef4444';
const OBJECTION_COLOR = '#f59e0b';
const BASE_SIZE_PX = 60; // nominal at zoom=1
const MAX_SIZE_PX = 160; // nominal at zoom=1

export const EdgePriceOverlay: React.FC<Props> = ({ edges, zoomThreshold = 0.6, sizePx = 24 }) => {
  const rf = useReactFlow();
  const { zoom, x: vx, y: vy } = useViewport();
  const graph = useGraphActions() as any;
  const overlayActiveId = (graph as any)?.overlayActiveEdgeId as (string | null);
  const hoveredEdgeId = (graph as any)?.hoveredEdgeId as (string | null);
  const state = useAtomValue(marketOverlayStateAtom);
  const threshold = useAtomValue(marketOverlayZoomThresholdAtom);
  let side = computeSide(state);
  if (state === 'AUTO_TEXT' || state === 'AUTO_PRICE') {
    side = zoom <= (threshold ?? 0.6) ? 'PRICE' : 'TEXT';
  }
  const show = side === 'PRICE';

  const [isZooming, setIsZooming] = React.useState(false);
  const prevZoomRef = React.useRef(zoom);
  const zoomTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const [shouldAnimateEdges, setShouldAnimateEdges] = React.useState(false);
  const rafRef = React.useRef<number | null>(null);
  const animateTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (typeof jest !== 'undefined') {
      return;
    }
    if (Math.abs(zoom - prevZoomRef.current) > 0.001) {
      setIsZooming(true);
      prevZoomRef.current = zoom;

      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
      zoomTimeoutRef.current = setTimeout(() => setIsZooming(false), 150);
    }

    return () => {
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
    };
  }, [zoom]);

  React.useEffect(() => {
    if (!show) {
      setShouldAnimateEdges(false);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (animateTimeoutRef.current) {
        clearTimeout(animateTimeoutRef.current);
        animateTimeoutRef.current = null;
      }
      return;
    }
    // Disable animations in test environments to avoid act/timer noise
    if (typeof jest !== 'undefined') {
      setShouldAnimateEdges(false);
      return;
    }
    // Trigger animation when overlay first shows
    setShouldAnimateEdges(true);
    animateTimeoutRef.current = setTimeout(() => setShouldAnimateEdges(false), 650);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (animateTimeoutRef.current) {
        clearTimeout(animateTimeoutRef.current);
        animateTimeoutRef.current = null;
      }
    };
  }, [show]);

  if (!show || isZooming || !Array.isArray(edges) || edges.length === 0) return null;

  const viewportEl = typeof document !== 'undefined' ? (document.querySelector('.react-flow__viewport') as HTMLElement | null) : null;
  const viewportRect = viewportEl ? viewportEl.getBoundingClientRect() : null;
  if (!viewportEl) return null;


  // Mount inside viewport so nodes layer above naturally
  const allNodes = rf.getNodes();
  const selectedNode = allNodes.find((n) => (n as any)?.selected);

  return createPortal(
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }} aria-hidden="true">
      {edges.map((e) => {
        try {
          const marketData: EdgeMarket | undefined = (e?.data as any)?.market;
          let price = Number(marketData?.price);
          const t = (e.type || '').toLowerCase() as EdgeType | string;
          const isSupport = t === 'support';
          const isNegation = t === 'negation';
          const isObjection = t === 'objection';
          if (!isSupport && !isNegation && !isObjection) return null;
          if (!Number.isFinite(price) && isObjection) {
            try {
              const obj = rf.getEdge(String(e.id)) as EdgeWithMarket | null;
              const anchorId = String(obj?.target || '');
              if (anchorId.startsWith('anchor:')) {
                const anchor = rf.getNode(anchorId) as any;
                const baseId = String(anchor?.data?.parentEdgeId || '');
                if (baseId) {
                  const base = rf.getEdge(baseId) as EdgeWithMarket | null;
                  const baseMarket = (base?.data as { market?: EdgeMarket } | undefined)?.market;
                  const parentPrice = Number(baseMarket?.price);
                  if (Number.isFinite(parentPrice)) price = parentPrice;
                }
              }
            } catch { }
          }
          if (!Number.isFinite(price)) return null;
          const priceValue = price;
          if (e.selected || overlayActiveId === e.id || hoveredEdgeId === e.id) return null;

          // Try to use actual edge label position from DOM
          let labelX: number | null = null;
          let labelY: number | null = null;

          if (viewportRect) {
            try {
              const anchor = document.querySelector(`[data-anchor-edge-id="${CSS.escape(String(e.id))}"]`) as HTMLElement | null;
              if (anchor) {
                const rect = anchor.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                labelX = (centerX - viewportRect.left) / zoom;
                labelY = (centerY - viewportRect.top) / zoom;
              }
            } catch { }
          }

          // Fallback to geometric calculation if anchor not found
          if (!Number.isFinite(labelX) || !Number.isFinite(labelY)) {
            const sn = rf.getNode(e.source) as any;
            const tn = rf.getNode(e.target) as any;
            if (!sn || !tn) return null;
            const sx = Number(sn?.position?.x ?? 0) + Number(sn?.width ?? sn?.measured?.width ?? 0) / 2;
            const sy = Number(sn?.position?.y ?? 0) + Number(sn?.height ?? sn?.measured?.height ?? 0) / 2;
            const tx = Number(tn?.position?.x ?? 0) + Number(tn?.width ?? tn?.measured?.width ?? 0) / 2;
            const ty = Number(tn?.position?.y ?? 0) + Number(tn?.height ?? tn?.measured?.height ?? 0) / 2;
            const trimmed = getTrimmedLineCoords(sx, sy, tx, ty, 0, 0, sn, tn);
            let lx = (trimmed.fromX + trimmed.toX) / 2;
            let ly = (trimmed.fromY + trimmed.toY) / 2;
            try {
              const cfg = (EDGE_CONFIGURATIONS as any)[t] || undefined;
              if (cfg?.visual?.useBezier) {
                const sourcePosition = Position.Right;
                const targetPosition = Position.Left;
                const curvature = cfg?.visual?.curvature ?? 0.35;
                const [, bx, by] = getBezierPath({
                  sourceX: trimmed.fromX,
                  sourceY: trimmed.fromY,
                  sourcePosition,
                  targetX: trimmed.toX,
                  targetY: trimmed.toY,
                  targetPosition,
                  curvature,
                });
                lx = bx;
                ly = by;
              } else {
                const [, sx2, sy2] = getStraightPath({
                  sourceX: trimmed.fromX,
                  sourceY: trimmed.fromY,
                  targetX: trimmed.toX,
                  targetY: trimmed.toY,
                });
                lx = sx2;
                ly = sy2;
              }
            } catch { }
            labelX = lx;
            labelY = ly;
          }

          const p = Math.max(0, Math.min(1, priceValue));

          if (labelX == null || labelY == null || !Number.isFinite(labelX) || !Number.isFinite(labelY)) {
            return null;
          }

          const percentage = p * 100;
          const clampedZoom = Math.max(zoom, 0.6);
          const sizeFactor = 1.0 / clampedZoom; // moderate enlargement at low zoom
          const size = (BASE_SIZE_PX + (p * (MAX_SIZE_PX - BASE_SIZE_PX))) * sizeFactor;

          // Determine color based on edge type and selection
          // Default colors by type
          let color = isSupport ? SUPPORT_COLOR : (isNegation ? NEGATION_COLOR : OBJECTION_COLOR);

          // If a node is selected and this edge connects to it, use friend/enemy colors
          if (selectedNode) {
            const edgeConnectsToSelected = e.source === selectedNode.id || e.target === selectedNode.id;
            if (edgeConnectsToSelected) {
              // Override with friend/enemy colors
              if (isSupport) {
                color = SUPPORT_COLOR;
              } else if (isNegation) {
                color = NEGATION_COLOR;
              } else if (isObjection) {
                color = OBJECTION_COLOR;
              }
            }
          }

          // Edges are triangles with direction based on type
          const triangleSize = size;
          const height = triangleSize * Math.sqrt(3) / 2;
          const fontSize = Math.max(10, triangleSize / 5);

          // Triangle rotation based on edge type
          // Support: 0deg (pointing up)
          // Negation: 180deg (pointing down)
          // Objection: diamond/hourglass ?
          const rotation = isSupport ? 0 : (isNegation ? 180 : 0);

          return (
            <div
              key={`e-zoom-${e.id}`}
              className="absolute"
              style={{
                left: labelX as number,
                top: labelY as number,
                transform: 'translate(-50%, -50%)',
                transition: 'transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                animation: shouldAnimateEdges ? 'favorGrow 600ms cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
                zIndex: 0
              }}
            >
              <svg
                width={triangleSize}
                height={isObjection ? triangleSize : height}
                className="overflow-visible"
                style={{
                  filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))',
                  transform: isObjection ? undefined : `rotate(${rotation}deg)`,
                  transformOrigin: 'center center'
                }}
              >
                {isObjection ? (
                  // Diamond shape (rotated square)
                  <polygon
                    points={`${triangleSize / 2},0 ${triangleSize},${triangleSize / 2} ${triangleSize / 2},${triangleSize} 0,${triangleSize / 2}`}
                    fill={color}
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth={3}
                  />
                ) : (
                  <polygon
                    points={`${triangleSize / 2},0 ${triangleSize},${height} 0,${height}`}
                    fill={color}
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth={3}
                  />
                )}
              </svg>
              <div
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white font-bold pointer-events-none select-none"
                style={{
                  fontSize: `${fontSize}px`,
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                }}
              >
                {Math.round(percentage)}%
              </div>
            </div>
          );
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            logger.error('[market/ui] edge overlay render failed', { error });
          }
          return null;
        }
      })}
      <style jsx>{`
        @keyframes favorGrow {
          from {
            transform: translate(-50%, -50%) scale(0);
          }
          to {
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </div>,
    viewportEl
  );
};
