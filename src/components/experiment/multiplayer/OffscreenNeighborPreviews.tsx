import React from 'react';
import { createPortal } from 'react-dom';
import { useGraphActions } from './GraphContext';
import { useReactFlow } from '@xyflow/react';
import { clamp, getOffscreenSide, OffscreenSide } from '@/utils/experiment/multiplayer/viewport';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';

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

const getNodeText = (n: any): string => {
  const t = n?.type;
  const d = n?.data || {};
  if (t === 'point' || t === 'objection' || t === 'title') return String(d?.content || '');
  if (t === 'statement') return String(d?.statement || '');
  return '';
};

const previewStyleByType = (t?: string) => {
  if (t === 'statement' || t === 'title') return 'bg-blue-100/90 border-blue-300/60 text-blue-800';
  if (t === 'objection') return 'bg-amber-100/90 border-amber-300/60 text-amber-800';
  return 'bg-gray-100/90 border-gray-300/60 text-gray-800';
};

const DirectionIcon = ({ side }: { side: OffscreenSide }) => {
  const cls = 'text-gray-500';
  if (side === 'left') return <ChevronRight size={10} className={cls} />;
  if (side === 'right') return <ChevronLeft size={10} className={cls} />;
  if (side === 'top') return <ChevronDown size={10} className={cls} />;
  if (side === 'bottom') return <ChevronUp size={10} className={cls} />;
  return null;
};

export const OffscreenNeighborPreviews: React.FC = () => {
  const rf = useReactFlow();
  const { hoveredNodeId } = useGraphActions() as any;
  const [previews, setPreviews] = React.useState<Preview[]>([]);
  const [indices, setIndices] = React.useState<Record<'left' | 'right' | 'top' | 'bottom', number>>({ left: 0, right: 0, top: 0, bottom: 0 });
  const [hoveredPreview, setHoveredPreview] = React.useState<string | null>(null);
  const clearTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const [allItemsBySide, setAllItemsBySide] = React.useState<Record<string, Preview[]>>({});

  // Remove all console.log and console.error statements for production/clean code
  const compute = React.useCallback(() => {
    try {
      const nodes = rf.getNodes();
      const edges = rf.getEdges();
      const hovered = hoveredNodeId ? nodes.find((n) => n.id === hoveredNodeId) : null;
      const selectedPoint = nodes.find((n) => (n as any).type === 'point' && (n as any).selected);
      const center = hovered || selectedPoint || null;

      // Clear any pending clear timeout
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
        clearTimeoutRef.current = null;
      }

      // If we have no center node but we're hovering a preview, keep the current previews
      if (!center) {
        if (hoveredPreview) {
          return; // Don't clear or recompute
        } else {
          // Add a delay before clearing to allow moving from node to preview
          clearTimeoutRef.current = setTimeout(() => {
            if (!hoveredPreview) {
              setPreviews([]);
            }
          }, 5000); // 5 second delay
          return;
        }
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
      const out: Preview[] = [];
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const centerEl = document.querySelector(`.react-flow__node[data-id="${center.id}"]`) as HTMLElement | null;
      const centerRect = centerEl?.getBoundingClientRect();
      const baseWidth = 240;
      const minHeight = 88;
      for (const id of allRelevantIds) {
        const n = nodes.find((x) => x.id === id);
        if (!n) { continue; }
        const el = document.querySelector(`.react-flow__node[data-id="${id}"]`) as HTMLElement | null;
        if (!el) { continue; }
        const rect = el.getBoundingClientRect();
        const side = getOffscreenSide(rect, vw, vh);
        const text = getNodeText(n);
        const offLeft = rect.right <= 0;
        const offRight = rect.left >= vw;
        const offTop = rect.bottom <= 0;
        const offBottom = rect.top >= vh;

        if (!side) {
          continue;
        }
        if (!text) {
          continue;
        }
        const cx = rect.left + (rect.right - rect.left) / 2;
        const cy = rect.top + (rect.bottom - rect.top) / 2;
        let x = 0, y = 0;
        const margin = 8;
        // Calculate dynamic size based on text length (approximate lines)
        const width = Math.max(baseWidth, Math.min(360, baseWidth + Math.floor(text.length / 6)));
        const charsPerLine = Math.max(24, Math.floor((width - 32) / 7));
        const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
        const estimatedHeight = 20 /* top row */ + lines * 18 + 16 /* content padding */ + 16 /* bottom buffer */;
        const height = Math.max(minHeight, estimatedHeight);
        const maxHeight = Math.max(minHeight, vh - margin * 2);

        if (side === 'left') { x = margin; y = clamp(cy - height / 2, margin, vh - height - margin); }
        if (side === 'right') { x = vw - width - margin; y = clamp(cy - height / 2, margin, vh - height - margin); }
        if (side === 'top') { x = clamp(cx - width / 2, margin, vw - width - margin); y = margin; }
        if (side === 'bottom') { x = clamp(cx - width / 2, margin, vw - width - margin); y = vh - height - margin; }
        out.push({ id, text, side, x, y, type: (n as any).type, width, height, maxHeight });
      }

      // Group by side and use midpoint positioning for multiple items
      const bySide: Record<string, Preview[]> = { left: [], right: [], top: [], bottom: [] };
      for (const p of out) {
        if (p.side) bySide[p.side].push(p);
      }

      const finalPreviews: Preview[] = [];
      for (const [side, items] of Object.entries(bySide)) {
        if (items.length === 0) continue;

        if (items.length === 1) {
          // Single item - use as is
          finalPreviews.push(items[0]);
        } else {
          // Multiple items - find midpoint and use largest dimensions
          let midX = 0, midY = 0;
          let maxWidth = baseWidth, maxHeight = minHeight;

          for (const item of items) {
            midX += item.x;
            midY += item.y;
            maxWidth = Math.max(maxWidth, item.width || baseWidth);
            maxHeight = Math.max(maxHeight, item.height || minHeight);
          }

          midX = Math.floor(midX / items.length);
          midY = Math.floor(midY / items.length);

          // Create a single preview at midpoint with all items available for cycling
          finalPreviews.push({
            id: items[0].id, // Start with first item
            text: items[0].text,
            type: items[0].type,
            side: side as OffscreenSide,
            x: midX,
            y: midY,
            width: maxWidth,
            height: maxHeight
          });
        }
      }

      // Store the original items grouped by side for cycling
      setAllItemsBySide(bySide);

      setPreviews([...finalPreviews]);
    } catch (err) {
      // No logs
    }
  }, [rf, hoveredNodeId, hoveredPreview]);

  React.useEffect(() => {
    compute();
  }, [compute]);

  React.useEffect(() => {
    const handler = () => { compute(); };
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
      }
    };
  }, [compute]);

  React.useEffect(() => {
    const grouped: Record<'left' | 'right' | 'top' | 'bottom', Preview[]> = { left: [], right: [], top: [], bottom: [] };
    for (const p of previews) { if (p.side) (grouped as any)[p.side].push(p); }
    setIndices((prev) => {
      const next = { ...prev };
      (['left', 'right', 'top', 'bottom'] as const).forEach((s) => {
        const len = grouped[s].length;
        if (len === 0) { next[s] = 0; } else { next[s] = ((next[s] % len) + len) % len; }
      });
      return next;
    });
  }, [previews]);

  if (previews.length === 0) return null;

  const grouped: Record<'left' | 'right' | 'top' | 'bottom', Preview[]> = { left: [], right: [], top: [], bottom: [] };
  for (const p of previews) { if (p.side) (grouped as any)[p.side].push(p); }

  const getCurrentPreviewForSide = (side: 'left' | 'right' | 'top' | 'bottom') => {
    // Get the base preview (for position/size)
    const basePreview = previews.find(p => p.side === side);
    if (!basePreview) return null;

    // Get the items to cycle through
    const items = allItemsBySide[side] || [];
    if (items.length === 0) return basePreview;

    // Get the current item based on index
    const currentItem = items[indices[side] % items.length];

    // Return base preview with current item's content
    return {
      ...basePreview,
      id: currentItem.id,
      text: currentItem.text,
      type: currentItem.type
    };
  };

  const cycle = (side: 'left' | 'right' | 'top' | 'bottom', delta: number) => {
    const items = allItemsBySide[side] || [];
    const len = items.length;
    if (len <= 1) return;

    // Just update the index - don't trigger recompute
    setIndices((prev) => ({ ...prev, [side]: (prev[side] + delta + len) % len }));
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
      {(['left', 'right', 'top', 'bottom'] as const).map((side) => {
        const p = getCurrentPreviewForSide(side);
        if (!p) return null;
        const items = allItemsBySide[side] || [];
        const many = items.length > 1;
        return (
          <div
            key={`preview-${side}`}
            style={{
              position: 'fixed',
              left: p.x,
              top: p.y,
              width: p.width || 240,
              maxHeight: p.maxHeight || undefined,
              pointerEvents: 'auto'
            }}
            className={`relative rounded-lg border shadow-lg transition-all duration-200 ${previewStyleByType(p.type)}`}
            onDoubleClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
            onPointerDown={(e) => { e.stopPropagation(); }}
            onMouseDown={(e) => { e.stopPropagation(); }}
            onMouseUp={(e) => { e.stopPropagation(); }}
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
            onMouseEnter={() => setHoveredPreview(p.id)}
            onMouseLeave={() => setHoveredPreview(null)}
          >
            {/* Navigation arrows in top left as requested */}
            {many && (
              <div className="absolute top-2 left-2 flex items-center gap-1 pointer-events-auto">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setHoveredPreview(p.id); // Keep preview visible when clicking navigation
                    cycle(side, -1);
                  }}
                  onMouseEnter={() => setHoveredPreview(p.id)}
                  className="w-7 h-7 rounded bg-white/90 hover:bg-white shadow-md border flex items-center justify-center transition-colors"
                >
                  <ChevronLeft size={16} className="text-gray-700" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setHoveredPreview(p.id); // Keep preview visible when clicking navigation
                    cycle(side, +1);
                  }}
                  onMouseEnter={() => setHoveredPreview(p.id)}
                  className="w-7 h-7 rounded bg-white/90 hover:bg-white shadow-md border flex items-center justify-center transition-colors"
                >
                  <ChevronRight size={16} className="text-gray-700" />
                </button>
                <div className="text-[12px] font-bold text-gray-700 bg-white/90 rounded px-2 py-1 shadow-md border ml-1">
                  {indices[side] + 1}/{items.length}
                </div>
              </div>
            )}

            {/* Type badge in top right */}
            <div className="absolute top-2 right-2 text-[12px] font-semibold opacity-90 uppercase tracking-wide bg-white/90 rounded px-2.5 py-1 shadow-md border pointer-events-none">
              {p.type === 'objection' ? 'mitigation' : p.type === 'statement' ? 'statement' : p.type === 'title' ? 'title' : 'point'}
            </div>

            {/* Mini card content - not clickable */}
            {(() => {
              const topPad = many ? 48 : 36; // px
              const sidePad = 20; // px
              const bottomPad = 16; // px buffer
              const contentMax = (p.maxHeight || 9999) - topPad - bottomPad;
              return (
                <div className="p-3 pointer-events-none" style={{ paddingTop: many ? '3rem' : '2.2rem', paddingRight: '5rem', paddingBottom: '1rem' }}>
                  <div
                    className="text-[13px] leading-relaxed whitespace-pre-wrap break-words"
                    style={{ maxHeight: Math.max(60, contentMax), overflowY: 'auto' }}
                    title={p.text}
                  >
                    {p.text}
                  </div>
                </div>
              );
            })()}
            {/* Direction pointer indicating where the offscreen content is */}
            {side === 'left' && (
              <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rotate-45 bg-inherit border-2 border-gray-400 shadow-sm" />
            )}
            {side === 'right' && (
              <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-4 h-4 rotate-45 bg-inherit border-2 border-gray-400 shadow-sm" />
            )}
            {side === 'top' && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rotate-45 bg-inherit border-2 border-gray-400 shadow-sm" />
            )}
            {side === 'bottom' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 rotate-45 bg-inherit border-2 border-gray-400 shadow-sm" />
            )}
          </div>
        );
      })}
    </div>,
    document.body
  );
};

export default OffscreenNeighborPreviews;
