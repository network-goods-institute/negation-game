"use client";
import React from "react";
import { useViewport, useReactFlow } from "@xyflow/react";
import { getNodeDimensionsAndCenter } from "@/utils/experiment/multiplayer/nodeUtils";
import { useGraphActions } from "./GraphContext";
import { logger } from "@/lib/logger";
import { useAtomValue } from "jotai";
import { marketOverlayStateAtom, marketOverlayZoomThresholdAtom, computeSide } from "@/atoms/marketOverlayAtom";

type Props = {
  nodes: Array<{ id: string; position?: { x: number; y: number }; width?: number; height?: number; data?: any }>;
  prices: Record<string, number> | null;
  zoomThreshold?: number;
};

export function NodePriceOverlay({ nodes, prices, zoomThreshold = 0.6 }: Props) {
  const { zoom, x: vx, y: vy } = useViewport();
  const rf = useReactFlow();
  const graph = useGraphActions() as any;
  const hoveredNodeId: string | null = graph?.hoveredNodeId ?? null;
  const state = useAtomValue(marketOverlayStateAtom);
  const threshold = useAtomValue(marketOverlayZoomThresholdAtom);
  let side = computeSide(state);
  if (state === 'AUTO_TEXT' || state === 'AUTO_PRICE') {
    side = zoom <= (threshold ?? 0.6) ? 'PRICE' : 'TEXT';
  }
  const selectedNode = nodes.find(n => (n as any)?.selected);

  // Helper to determine relationship color via graph traversal
  const getRelationshipColor = React.useMemo(() => {
    if (!selectedNode) return () => null;
    const edges = rf.getEdges();
    const selectedId = selectedNode.id;
    const selectedNodeType = ((selectedNode as any)?.type || '').toLowerCase();

    // Precompute objection mappings
    const objectionBySource = new Map<string, any>();
    for (const e of edges) {
      if ((e.type || '').toLowerCase() === 'objection') {
        objectionBySource.set(e.source, e);
      }
    }

    const computeColor = (nodeId: string): string | null => {
      if (selectedId === nodeId) return null;
      try {
        // Selected node is objection
        if (selectedNodeType === 'objection') {
          const objectionEdge = objectionBySource.get(selectedId);
          if (objectionEdge) {
            const anchorNode = rf.getNode(objectionEdge.target) as any;
            const parentEdgeId = anchorNode?.data?.parentEdgeId;
            if (parentEdgeId) {
              const parentEdge = edges.find(e => e.id === parentEdgeId) as any;
              const parentEdgeType = (parentEdge?.type || '').toLowerCase();
              if (parentEdgeType === 'support') {
                if (nodeId === parentEdge.source || nodeId === parentEdge.target) return '#ef4444';
              } else if (parentEdgeType === 'negation') {
                if (nodeId === parentEdge.source || nodeId === parentEdge.target) return '#10b981';
              }
            }
          }
        }

        // Target node is objection
        const targetNode = rf.getNode(nodeId) as any;
        const targetNodeType = (targetNode?.type || '').toLowerCase();
        if (targetNodeType === 'objection') {
          const objectionEdge = objectionBySource.get(nodeId);
          if (objectionEdge) {
            const anchorNode = rf.getNode(objectionEdge.target) as any;
            const parentEdgeId = anchorNode?.data?.parentEdgeId;
            if (parentEdgeId) {
              const parentEdge = edges.find(e => e.id === parentEdgeId) as any;
              const parentEdgeType = (parentEdge?.type || '').toLowerCase();
              if (parentEdgeType === 'support') {
                if (parentEdge.source === selectedId || parentEdge.target === selectedId) return '#ef4444';
              } else if (parentEdgeType === 'negation') {
                if (parentEdge.source === selectedId || parentEdge.target === selectedId) return '#10b981';
              }
            }
          }
        }

        // BFS traversal
        const polarities = new Map<string, number>();
        const queue: Array<{ nodeId: string, negationCount: number }> = [{ nodeId: selectedId, negationCount: 0 }];
        polarities.set(selectedId, 0);
        while (queue.length > 0) {
          const { nodeId: currentId, negationCount } = queue.shift()!;
          const connectedEdges = edges.filter(e => e.source === currentId || e.target === currentId);
          for (const edge of connectedEdges) {
            const edgeType = (edge.type || '').toLowerCase();
            if (edgeType !== 'support' && edgeType !== 'negation') continue;
            const otherId = edge.source === currentId ? edge.target : edge.source;
            const newNegationCount = edgeType === 'negation' ? negationCount + 1 : negationCount;
            if (!polarities.has(otherId)) {
              polarities.set(otherId, newNegationCount);
              queue.push({ nodeId: otherId, negationCount: newNegationCount });
            }
          }
        }
        if (polarities.has(nodeId)) {
          const negCount = polarities.get(nodeId)!;
          return negCount % 2 === 0 ? '#10b981' : '#ef4444';
        }
        return null;
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          logger.error('[market/ui] relationship color failed', { error });
        }
        return null;
      }
    };

    return computeColor;
  }, [rf, selectedNode]);

  const hasRF = typeof document !== 'undefined' && !!document.querySelector('.react-flow__viewport');
  const show = hasRF ? (side === 'PRICE') : true;
  if (!show) return null;
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
      {nodes.map((n) => {
        // Exclude statement, comment, and edge_anchor nodes entirely from price overlays
        if ((n as any)?.type === 'statement' || (n as any)?.type === 'comment' || (n as any)?.type === 'edge_anchor') return null;

        // Check market status
        const marketStatus = (n as any)?.data?.market?.status as 'not-tradeable' | 'pending' | 'active' | undefined;

        // Don't show overlay for non-tradeable nodes
        if (marketStatus === 'not-tradeable') return null;

        const p = prices?.[n.id];
        const hasPrice = typeof p === 'number' && !Number.isNaN(p);

        // Show pending indicator if status is pending
        const isPending = marketStatus === 'pending' && !hasPrice;

        // Skip if no price and not pending
        if (!hasPrice && !isPending) return null;

        const priceValue = hasPrice ? p : 0.5; // Default size for pending nodes
        const { width: w, height: h, centerX, centerY } = getNodeDimensionsAndCenter(n);
        // Hide overlay when node is selected (so we can see the actual node)
        if ((n as any)?.selected) return null;
        // Hide overlay when node is hovered (so underlying content/affordances are visible)
        const isHovered = hoveredNodeId && String(hoveredNodeId) === String(n.id);
        if (isHovered) return null;

        const sx = Math.round(centerX * zoom + vx);
        const sy = Math.round(centerY * zoom + vy);
        const isObjection = (n as any)?.type === 'objection';
        const percentage = priceValue * 100;
        const nominalBase = 40;
        const nominalMax = 120;
        const sizeFactor = 0.7 + 0.6 * zoom; // keep overlays readable when zoomed out
        const baseSize = nominalBase * sizeFactor;
        const maxSize = nominalMax * sizeFactor;
        const size = baseSize + (priceValue * (maxSize - baseSize));
        const relationshipColor = getRelationshipColor(n.id);
        const color = relationshipColor || (isObjection ? '#f59e0b' : '#3b82f6');

        // All nodes are circles
        const fontSize = Math.max(10, size / 4);

        // Render pending state differently
        if (isPending) {
          return (
            <div
              key={`price-pending-${n.id}`}
              className="absolute"
              style={{
                left: sx,
                top: sy,
                transform: "translate(-50%, -50%)",
                transition: 'transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                animation: 'favorGrow 600ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <svg width={size} height={size} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.15))' }}>
                {/* Pulsing outer ring */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={(size / 2) - 2}
                  fill="none"
                  stroke={color}
                  strokeWidth={3}
                  strokeDasharray="4 4"
                  opacity={0.4}
                  style={{ animation: 'pulse 2s ease-in-out infinite' }}
                />
                {/* Inner circle */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={(size / 2) - 8}
                  fill={color}
                  opacity={0.2}
                />
              </svg>
              {/* Loading spinner */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <svg
                  className="animate-spin"
                  width={size / 2.5}
                  height={size / 2.5}
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke={color}
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill={color}
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            </div>
          );
        }

        // Render active price state
    return (
      <div
        key={`price-${n.id}`}
        className="absolute"
        style={{
              left: sx,
              top: sy,
              transform: "translate(-50%, -50%)",
              transition: 'transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              animation: 'favorGrow 600ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <svg width={size} height={size} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))' }}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={(size / 2) - 2}
                fill={color}
                stroke="rgba(255,255,255,0.4)"
                strokeWidth={3}
              />
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
        @keyframes pulse {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}
