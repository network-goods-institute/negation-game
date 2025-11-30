import React from 'react';
import { createPortal } from 'react-dom';
import { useGraphActions } from './GraphContext';
import { useReactFlow } from '@xyflow/react';
import { getOffscreenSide, OffscreenSide } from '@/utils/experiment/multiplayer/viewport';
import { usePerformanceMode } from './PerformanceContext';

interface OffscreenNeighborPreviewsProps {
  blurAllNodes: number;
  isMarketPanelVisible?: boolean;
}

type Preview = {
  id: string;
  text: string;
  side: OffscreenSide;
  x: number;
  y: number;
  type?: string;
  width?: number;
  height?: number;
  maxHeight?: number;
};

type DirectionZone = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const getNodeText = (n: any): string => {
  const t = n?.type;
  const d = n?.data || {};
  if (t === 'point' || t === 'objection') return String(d?.content || '');
  if (t === 'statement') return String(d?.statement || '');
  return '';
};

const previewStyleByType = (t?: string) => {
  if (t === 'statement') return 'bg-blue-100/90 border-blue-300/60 text-blue-800';
  if (t === 'objection') return 'bg-amber-100/90 border-amber-300/60 text-amber-800';
  return 'bg-gray-100/90 border-gray-300/60 text-gray-800';
};

// Determine which direction zone a preview belongs to based on its intersection point
const getDirectionZone = (rect: DOMRect, vw: number, vh: number): DirectionZone => {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const isLeft = centerX < vw / 2;
  const isTop = centerY < vh / 2;

  if (isTop && isLeft) return 'top-left';
  if (isTop && !isLeft) return 'top-right';
  if (!isTop && isLeft) return 'bottom-left';
  return 'bottom-right';
};

export const OffscreenNeighborPreviews: React.FC<OffscreenNeighborPreviewsProps> = ({ blurAllNodes, isMarketPanelVisible = false }) => {
  const { perfMode } = usePerformanceMode();
  const rf = useReactFlow();
  const { hoveredNodeId } = useGraphActions() as any;
  const [previewsByZone, setPreviewsByZone] = React.useState<Record<DirectionZone, Preview[]>>({
    'top-left': [],
    'top-right': [],
    'bottom-left': [],
    'bottom-right': []
  });
  // Removed expandedZone state - no longer needed

  const compute = React.useCallback(() => {
    if (perfMode) return;
    try {
      const nodes = rf.getNodes();
      const edges = rf.getEdges();
      const hovered = hoveredNodeId ? nodes.find((n) => n.id === hoveredNodeId) : null;
      const selectedPoint = nodes.find((n) => (n as any).type === 'point' && (n as any).selected);
      const center = hovered || selectedPoint || null;

      // If we have no center node, clear previews immediately
      if (!center) {
        const empty = {
          'top-left': [],
          'top-right': [],
          'bottom-left': [],
          'bottom-right': []
        } as Record<DirectionZone, Preview[]>;
        setPreviewsByZone((prev) => {
          const anyItems = Object.values(prev).some((arr) => (arr?.length || 0) > 0);
          return anyItems ? empty : prev;
        });
        return;
      }

      // Build fast lookup maps
      const nodeById: Record<string, any> = Object.create(null);
      for (const n of nodes) nodeById[n.id] = n;
      const edgeById: Record<string, any> = Object.create(null);
      for (const e of edges) edgeById[(e as any).id] = e;

      // Gather all relevant ids: endpoints and objections on adjacent edges
      const relevantIds = new Set<string>();
      const adjacent = edges.filter(e => e.source === center.id || e.target === center.id);
      for (const e of adjacent) {
        const otherId = e.source === center.id ? (e.target as string) : (e.source as string);
        const other = nodeById[otherId];
        if (!other) continue;
        if ((other as any).type === 'edge_anchor') {
          const parentEdgeId = (other as any).data?.parentEdgeId as string | undefined;
          if (parentEdgeId && edgeById[parentEdgeId]) {
            const orig = edgeById[parentEdgeId];
            relevantIds.add(orig.source as string);
            relevantIds.add(orig.target as string);
          }
          for (const oe of edges) {
            if ((oe as any).type !== 'objection') continue;
            const s = oe.source as string; const t = oe.target as string;
            if (t === otherId && nodeById[s] && (nodeById[s] as any).type === 'objection') relevantIds.add(s);
            if (s === otherId && nodeById[t] && (nodeById[t] as any).type === 'objection') relevantIds.add(t);
          }
        } else {
          relevantIds.add(otherId);
          // Also include objections anchored on the edge between center and this neighbor
          const parentEdge = e; // this is the edge directly between center and neighbor
          const anchors = nodes.filter(n => (n as any).type === 'edge_anchor' && ((n as any).data?.parentEdgeId) === (parentEdge as any).id);
          for (const a of anchors) {
            for (const oe of edges) {
              if ((oe as any).type !== 'objection') continue;
              const s = oe.source as string; const t = oe.target as string;
              if (t === a.id && nodeById[s] && (nodeById[s] as any).type === 'objection') relevantIds.add(s);
              if (s === a.id && nodeById[t] && (nodeById[t] as any).type === 'objection') relevantIds.add(t);
            }
          }
        }
      }

      const allRelevantIds = relevantIds;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const headerHeight = 64;

      // Group previews by direction zone
      const zoneGroups: Record<DirectionZone, Preview[]> = {
        'top-left': [],
        'top-right': [],
        'bottom-left': [],
        'bottom-right': []
      };

      for (const id of allRelevantIds) {
        const n = nodes.find((x) => x.id === id);
        if (!n) continue;
        const el = document.querySelector(`.react-flow__node[data-id="${id}"]`) as HTMLElement | null;
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const side = getOffscreenSide(rect, vw, vh);
        const text = getNodeText(n);

        if (!side || !text) continue;

        // Determine direction zone
        const zone = getDirectionZone(rect, vw, vh);

        // Calculate preview properties
        const baseWidth = 200;
        const minHeight = 60;
        const width = Math.max(baseWidth, Math.min(300, baseWidth + Math.floor(text.length / 10)));
        const charsPerLine = Math.max(20, Math.floor((width - 24) / 7));
        const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
        const estimatedHeight = 20 + lines * 16 + 12;
        const height = Math.max(minHeight, estimatedHeight);
        const maxHeight = Math.max(minHeight, vh - headerHeight - 8);

        // Calculate exact intersection coordinates based on zone, accounting for UI elements
        let x = 0, y = 0;
        const margin = 12;
        const savingIndicatorHeight = 48; // Height of saving indicator in top-right
        const minimapHeight = 220; // Approximate height of minimap in bottom-right with extra margin
        const controlsHeight = 120; // Approximate height of controls in bottom-left
        const multiplayerHeaderHeight = 180; // Actual height of multiplayer header component (title input + user info + connected users)

        if (zone === 'top-left') {
          x = margin;
          y = headerHeight + multiplayerHeaderHeight + margin; // Below multiplayer header component
        } else if (zone === 'top-right') {
          x = vw - width - margin;
          y = headerHeight + savingIndicatorHeight + margin; // Below saving indicator
        } else if (zone === 'bottom-left') {
          x = margin;
          y = vh - height - controlsHeight - margin; // Above controls
        } else { // bottom-right
          x = vw - width - margin;
          y = vh - height - minimapHeight - margin; // Above minimap
        }

        zoneGroups[zone].push({
          id,
          text,
          side,
          x,
          y,
          type: (n as any).type,
          width,
          height,
          maxHeight
        });
      }

      const zones: DirectionZone[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
      setPreviewsByZone((prev) => {
        const isSame = zones.every((z) => {
          const a = prev[z] || [];
          const b = zoneGroups[z] || [];
          if (a.length !== b.length) return false;
          for (let i = 0; i < a.length; i++) {
            const pa = a[i];
            const pb = b[i];
            if (
              pa.id !== pb.id ||
              pa.text !== pb.text ||
              pa.type !== pb.type ||
              pa.x !== pb.x ||
              pa.y !== pb.y ||
              pa.width !== pb.width ||
              pa.height !== pb.height ||
              pa.maxHeight !== pb.maxHeight
            ) {
              return false;
            }
          }
          return true;
        });
        return isSame ? prev : zoneGroups;
      });
    } catch (err) {
      // No logs
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoveredNodeId, perfMode, rf]);

  React.useEffect(() => {
    if (perfMode) {
      setPreviewsByZone({ 'top-left': [], 'top-right': [], 'bottom-left': [], 'bottom-right': [] });
      return;
    }
    compute();
  }, [compute, perfMode]);

  React.useEffect(() => {
    if (perfMode) return;
    const handler = () => { compute(); };
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [compute, perfMode]);

  const totalPreviews = Object.values(previewsByZone).reduce((sum, previews) => sum + previews.length, 0);
  if (perfMode || isMarketPanelVisible || totalPreviews === 0) return null;

  const renderZoneStack = (zone: DirectionZone, previews: Preview[]) => {
    if (previews.length === 0) return null;

    // Calculate base position for the zone
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const headerHeight = 64;
    const margin = 12;
    const baseWidth = 200;
    const stackSpacing = 8;
    const itemHeight = 80; // Approximate height per preview item

    const savingIndicatorHeight = 48;
    const minimapHeight = 220;
    const controlsHeight = 120;
    const multiplayerHeaderHeight = 180;

    let availableHeight: number;
    let maxItems: number;

    if (zone === 'top-left') {
      availableHeight = vh - (headerHeight + multiplayerHeaderHeight + margin * 2);
    } else if (zone === 'top-right') {
      availableHeight = vh - (headerHeight + savingIndicatorHeight + margin * 2);
    } else if (zone === 'bottom-left') {
      availableHeight = vh - controlsHeight - margin * 2 - headerHeight;
    } else { // bottom-right
      availableHeight = vh - minimapHeight - margin * 2 - headerHeight;
    }

    availableHeight = Math.max(0, availableHeight);
    maxItems = Math.max(0, Math.floor(availableHeight / (itemHeight + stackSpacing)));
    const showTruncation = previews.length > maxItems;
    const visibleCount = Math.max(0, showTruncation ? maxItems - 1 : maxItems);
    const visiblePreviews = previews.slice(0, visibleCount);

    let baseX = 0, baseY = 0;
    if (zone === 'top-left') {
      baseX = margin;
      baseY = headerHeight + multiplayerHeaderHeight + margin;
    } else if (zone === 'top-right') {
      baseX = vw - baseWidth - margin;
      baseY = headerHeight + savingIndicatorHeight + margin;
    } else if (zone === 'bottom-left') {
      baseX = margin;
      const totalStackHeight = (visiblePreviews.length * (itemHeight + stackSpacing)) + (showTruncation ? (itemHeight + stackSpacing) : 0);
      baseY = vh - controlsHeight - margin - totalStackHeight;
    } else { // bottom-right
      baseX = vw - baseWidth - margin;
      const totalStackHeight = (visiblePreviews.length * (itemHeight + stackSpacing)) + (showTruncation ? (itemHeight + stackSpacing) : 0);
      baseY = vh - minimapHeight - margin - totalStackHeight;
    }
    const truncateText = (text: string, maxLength: number = 120): { text: string; isTruncated: boolean } => {
      if (text.length <= maxLength) return { text, isTruncated: false };
      const truncated = text.substring(0, maxLength).trim();
      const lastSpace = truncated.lastIndexOf(' ');
      const smartTruncate = lastSpace > maxLength * 0.8 ? truncated.substring(0, lastSpace) : truncated;
      return { text: smartTruncate + '...', isTruncated: true };
    };

    return (
      <div key={zone} style={{ position: 'fixed', left: baseX, top: baseY, pointerEvents: 'auto' }}>
        {visiblePreviews.map((preview, index) => {
          const { text: displayText, isTruncated } = truncateText(preview.text);

          return (
            <div
              key={preview.id}
              className={`bg-white/95 backdrop-blur-sm border rounded-md shadow-md px-3 py-2 text-[13px] text-stone-800 ${previewStyleByType(preview.type)}`}
              style={{
                width: preview.width || baseWidth,
                minHeight: itemHeight,
                marginBottom: stackSpacing
              }}
              onMouseDown={(e) => { e.stopPropagation(); }}
              onDoubleClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
              title={isTruncated ? preview.text : undefined}
            >
              <div className="text-[10px] font-semibold mb-1 uppercase opacity-75">
                {preview.type === 'objection' ? 'mitigation' : preview.type}
              </div>
              <div className="whitespace-pre-wrap break-words leading-tight">
                {displayText}
              </div>
            </div>
          );
        })}

        {/* Truncation indicator */}
        {showTruncation && (
          <div
            className="bg-gray-100/95 backdrop-blur-sm border rounded-md shadow-md px-3 py-2 text-[13px] text-gray-600 italic"
            style={{ width: baseWidth, minHeight: 40 }}
          >
            +{previews.length - visiblePreviews.length} more
          </div>
        )}
      </div>
    );
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
      {(Object.keys(previewsByZone) as DirectionZone[]).map(zone =>
        renderZoneStack(zone, previewsByZone[zone])
      )}
    </div>,
    document.body
  );
};

export default OffscreenNeighborPreviews;
