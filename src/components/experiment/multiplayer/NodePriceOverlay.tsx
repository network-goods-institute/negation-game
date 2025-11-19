"use client";
import React from "react";
import { useViewport, useReactFlow } from "@xyflow/react";
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
  const rf = useReactFlow();
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

  const selectedNode = nodes.find(n => (n as any)?.selected);

  // Helper to determine relationship color via graph traversal
  const getRelationshipColor = (nodeId: string): string | null => {
    if (!selectedNode || selectedNode.id === nodeId) return null;
    try {
      const edges = rf.getEdges();
      const selectedId = selectedNode.id;
      const selectedNodeType = ((selectedNode as any)?.type || '').toLowerCase();

      // Special handling: if SELECTED node is an objection
      if (selectedNodeType === 'objection') {
        const objectionEdge = edges.find(e => e.source === selectedId && (e.type || '').toLowerCase() === 'objection');
        if (objectionEdge) {
          const anchorNode = rf.getNode(objectionEdge.target) as any;
          const parentEdgeId = anchorNode?.data?.parentEdgeId;

          if (parentEdgeId) {
            const parentEdge = edges.find(e => e.id === parentEdgeId) as any;
            const parentEdgeType = (parentEdge?.type || '').toLowerCase();

            if (parentEdgeType === 'support') {
              // Objecting to support = opposing those nodes
              const supportSource = parentEdge.source;
              const supportTarget = parentEdge.target;
              if (nodeId === supportSource || nodeId === supportTarget) {
                return '#ef4444'; // red - this objection opposes these nodes
              }
            } else if (parentEdgeType === 'negation') {
              // Objecting to negation = supporting those nodes
              const negSource = parentEdge.source;
              const negTarget = parentEdge.target;
              if (nodeId === negSource || nodeId === negTarget) {
                return '#10b981'; // green - this objection supports these nodes
              }
            }
          }
        }
      }

      // Special handling: if TARGET node is an objection
      const targetNode = rf.getNode(nodeId) as any;
      const targetNodeType = (targetNode?.type || '').toLowerCase();

      if (targetNodeType === 'objection') {
        // Find what this objection is objecting to
        const objectionEdge = edges.find(e => e.source === nodeId && (e.type || '').toLowerCase() === 'objection');
        if (objectionEdge) {
          // Get the edge_anchor node
          const anchorNode = rf.getNode(objectionEdge.target) as any;
          const parentEdgeId = anchorNode?.data?.parentEdgeId;

          if (parentEdgeId) {
            const parentEdge = edges.find(e => e.id === parentEdgeId) as any;
            const parentEdgeType = (parentEdge?.type || '').toLowerCase();

            if (parentEdgeType === 'support') {
              // Objection opposes support, so it's like a negation
              // Check if either endpoint of the support connects to selected node
              const supportSource = parentEdge.source;
              const supportTarget = parentEdge.target;

              if (supportSource === selectedId || supportTarget === selectedId) {
                return '#ef4444'; // red - opposing the selected node's support
              }
            } else if (parentEdgeType === 'negation') {
              // Objection opposes negation, so it cancels it
              const negSource = parentEdge.source;
              const negTarget = parentEdge.target;

              if (negSource === selectedId || negTarget === selectedId) {
                return '#10b981'; // green - supporting by opposing the negation
              }
            }
          }
        }
      }

      // BFS to find shortest path and calculate polarity
      const polarities = new Map<string, number>(); // node ID -> negation count
      const queue: Array<{ nodeId: string, negationCount: number }> = [{ nodeId: selectedId, negationCount: 0 }];
      polarities.set(selectedId, 0);

      while (queue.length > 0) {
        const { nodeId: currentId, negationCount } = queue.shift()!;

        // Find all edges connected to current node
        const connectedEdges = edges.filter(e =>
          e.source === currentId || e.target === currentId
        );

        for (const edge of connectedEdges) {
          const edgeType = (edge.type || '').toLowerCase();

          // Only traverse support and negation edges
          if (edgeType !== 'support' && edgeType !== 'negation') continue;

          // Find the other node
          const otherId = edge.source === currentId ? edge.target : edge.source;

          // Calculate new negation count
          const newNegationCount = edgeType === 'negation' ? negationCount + 1 : negationCount;

          // If we haven't visited this node yet, mark it and add to queue
          if (!polarities.has(otherId)) {
            polarities.set(otherId, newNegationCount);
            queue.push({
              nodeId: otherId,
              negationCount: newNegationCount
            });
          }
        }
      }

      // Check polarity of target node
      if (polarities.has(nodeId)) {
        const negCount = polarities.get(nodeId)!;
        // Even negations (0, 2, 4...) = friend = green
        // Odd negations (1, 3, 5...) = enemy = red
        return negCount % 2 === 0 ? '#10b981' : '#ef4444';
      }

      return null; // No path found through support/negation edges
    } catch {
      return null;
    }
  };
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
      {nodes.map((n) => {
        // Exclude statement, comment, and edge_anchor nodes entirely from price overlays
        if ((n as any)?.type === 'statement' || (n as any)?.type === 'comment' || (n as any)?.type === 'edge_anchor') return null;
        const p = prices[n.id];
        // Default to 0.5 (50%) if no price available yet
        const priceValue = typeof p === "number" ? p : 0.5;
        const { width: w, height: h, centerX, centerY } = getNodeDimensionsAndCenter(n);
        // Hide overlay when node is selected (so we can see the actual node)
        if ((n as any)?.selected) return null;
        // Hide overlay when node is hovered (so underlying content/affordances are visible)
        const isHovered = hoveredNodeId && String(hoveredNodeId) === String(n.id);
        if (isHovered) return null;

        const sx = Math.round(centerX * zoom + vx);
        const sy = Math.round(centerY * zoom + vy);
        const sw = Math.max(1, Math.round(w * zoom));
        const sh = Math.max(1, Math.round(h * zoom));

        const isObjection = (n as any)?.type === 'objection';
        const percentage = priceValue * 100;
        const baseSize = 40;
        const maxSize = 120;
        const size = baseSize + ((priceValue) * (maxSize - baseSize));
        const relationshipColor = getRelationshipColor(n.id);
        const color = relationshipColor || (isObjection ? '#f59e0b' : '#3b82f6');

        // All nodes are circles
        const fontSize = Math.max(10, size / 4);
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
      `}</style>
    </div>
  );
}
