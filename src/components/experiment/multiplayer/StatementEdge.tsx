import React, { useEffect } from 'react';
import { StraightEdge, EdgeProps, useReactFlow, EdgeLabelRenderer } from '@xyflow/react';
import { useGraphActions } from './GraphContext';
import { ContextMenu } from './common/ContextMenu';

export const StatementEdge: React.FC<EdgeProps> = (props) => {
    const { hoveredEdgeId, selectedEdgeId, setSelectedEdge, addObjectionForEdge, setHoveredEdge, updateEdgeAnchorPosition, deleteNode, updateEdgeRelevance, importanceSim } = useGraphActions() as any;
    const isHovered = hoveredEdgeId === props.id;
    const rf = useReactFlow();
    const [menuOpen, setMenuOpen] = React.useState(false);
    const [menuPos, setMenuPos] = React.useState<{x:number;y:number}>({x:0,y:0});
    const cx = (props as any).sourceX != null && (props as any).targetX != null
        ? ((props as any).sourceX + (props as any).targetX) / 2
        : 0;
    const cy = (props as any).sourceY != null && (props as any).targetY != null
        ? ((props as any).sourceY + (props as any).targetY) / 2
        : 0;
    // push live center into anchor so it tracks exactly, but only when values change
    const lastPosRef = React.useRef<{x:number;y:number}|null>(null);
    const rafRef = React.useRef<number>(0);
    useEffect(() => {
        if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
        const last = lastPosRef.current;
        if (last && Math.abs(last.x - cx) < 0.5 && Math.abs(last.y - cy) < 0.5) return;
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
            lastPosRef.current = { x: cx, y: cy };
            updateEdgeAnchorPosition(props.id as string, cx, cy);
        });
        return () => cancelAnimationFrame(rafRef.current);
    }, [cx, cy, props.id, updateEdgeAnchorPosition]);

    // Hide objection affordances if either endpoint is hidden
    const sNode = rf.getNode((props as any).source as string);
    const tNode = rf.getNode((props as any).target as string);
    const sHidden = !!(sNode as any)?.data?.hidden;
    const tHidden = !!(tNode as any)?.data?.hidden;
    const showAffordance = !(sHidden || tHidden);

    const selected = (selectedEdgeId || null) === (props.id as any);
    const relevance = Math.max(1, Math.min(5, ((props as any).data?.relevance ?? 3)));
    const speedFactor = (relevance / 3) * (isHovered ? 1.5 : 1);
    const dashDuration = Math.max(1.5, 6 / Math.max(0.5, speedFactor));

    return (
        <>
            {/* Invisible interaction overlay along the whole edge for selection/context menu */}
            {Number.isFinite((props as any).sourceX) && Number.isFinite((props as any).sourceY) && Number.isFinite((props as any).targetX) && Number.isFinite((props as any).targetY) && (
                <line
                    x1={(props as any).sourceX}
                    y1={(props as any).sourceY}
                    x2={(props as any).targetX}
                    y2={(props as any).targetY}
                    stroke="rgba(0,0,0,0)"
                    strokeWidth={16}
                    style={{ pointerEvents: 'stroke' }}
                    onClick={(e) => { e.stopPropagation(); setSelectedEdge?.(props.id as string); }}
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedEdge?.(props.id as string); setMenuPos({ x: e.clientX, y: e.clientY }); setMenuOpen(true); }}
                />
            )}
            {Number.isFinite((props as any).sourceX) && Number.isFinite((props as any).sourceY) && Number.isFinite((props as any).targetX) && Number.isFinite((props as any).targetY) && selected && (
                <line x1={(props as any).sourceX} y1={(props as any).sourceY} x2={(props as any).targetX} y2={(props as any).targetY} stroke="#000" strokeWidth={8} strokeLinecap="round" opacity={0.85} />
            )}
            <StraightEdge
                {...props}
                style={{
                    strokeWidth: importanceSim ? (1 + relevance) : 2,
                    stroke: '#6b7280',
                }}
                interactionWidth={8}
            />
            {showAffordance && (
                <>
                    {/* Midpoint dot to hint objection affordance */}
                    <foreignObject x={cx - 8} y={cy - 8} width={16} height={16} style={{ pointerEvents: 'all' }}>
                        <div onClick={(e) => { e.stopPropagation(); addObjectionForEdge(props.id as string, cx, cy); }} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedEdge?.(props.id as string); setMenuPos({ x: e.clientX, y: e.clientY }); setMenuOpen(true); }} title="Edge controls" className="w-4 h-4 rounded-full bg-white border flex items-center justify-center" style={{ borderColor: '#6b7280', cursor: 'pointer' }}>
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#6b7280' }} />
                        </div>
                    </foreignObject>
                    {null}
                </>
            )}
            {/* Overlay controls rendered above nodes */}
            {(
            <EdgeLabelRenderer>
              <div
                style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${cx}px, ${cy + 18}px)`, zIndex: 1000, pointerEvents: 'all' }}
                onMouseEnter={() => setHoveredEdge(props.id as string)}
                onMouseLeave={() => setHoveredEdge(null)}
                className={`transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
              >
                <div className="flex items-center justify-center gap-2 bg-white/95 backdrop-blur-sm border rounded-md shadow px-2 py-1">
                  {importanceSim && (
                    <div className="flex items-center gap-1 text-[11px] select-none" title="Set edge relevance (simulation). 1 = low, 5 = high.">
                      {[1,2,3,4,5].map((i) => (
                        <button key={`rel-${i}`} title={`Set relevance to ${i}`} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); updateEdgeRelevance?.(props.id as string, i as any); }}>
                          <span className={i <= (props as any).data?.relevance ? 'text-blue-600' : 'text-stone-300'}>★</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => { e.stopPropagation(); addObjectionForEdge(props.id as string, cx, cy); }}
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-stone-800 text-white"
                    title="Add objection to this relation"
                  >
                    Object
                  </button>
                </div>
              </div>
            </EdgeLabelRenderer>
            )}
            {/* marching dots inward from both ends (top overlay) */}
            {importanceSim && Number.isFinite((props as any).sourceX) && Number.isFinite((props as any).sourceY) && Number.isFinite((props as any).targetX) && Number.isFinite((props as any).targetY) && (
                <>
                    <defs>
                        <style>{`@keyframes edge-dots-${props.id} { from { stroke-dashoffset: 0; } to { stroke-dashoffset: 100; } }`}</style>
                    </defs>
                    <line x1={(props as any).sourceX} y1={(props as any).sourceY} x2={cx} y2={cy}
                        stroke="#000" strokeWidth={2} strokeLinecap="round" strokeDasharray="2 10"
                        style={{
                          animationName: `edge-dots-${props.id}`,
                          animationDuration: `${dashDuration}s`,
                          animationTimingFunction: 'linear',
                          animationIterationCount: 'infinite',
                          opacity: 0.8,
                          pointerEvents: 'none',
                        }} />
                    <line x1={cx} y1={cy} x2={(props as any).targetX} y2={(props as any).targetY}
                        stroke="#000" strokeWidth={2} strokeLinecap="round" strokeDasharray="2 10"
                        style={{
                          animationName: `edge-dots-${props.id}`,
                          animationDuration: `${dashDuration}s`,
                          animationTimingFunction: 'linear',
                          animationIterationCount: 'infinite',
                          animationDirection: 'reverse',
                          opacity: 0.8,
                          pointerEvents: 'none',
                        }} />
                </>
            )}
            <ContextMenu
                open={menuOpen}
                x={menuPos.x}
                y={menuPos.y}
                onClose={() => setMenuOpen(false)}
                items={[
                    { label: 'Relevance: ★☆☆☆☆', onClick: () => updateEdgeRelevance?.(props.id as string, 1) },
                    { label: 'Relevance: ★★☆☆☆', onClick: () => updateEdgeRelevance?.(props.id as string, 2) },
                    { label: 'Relevance: ★★★☆☆', onClick: () => updateEdgeRelevance?.(props.id as string, 3) },
                    { label: 'Relevance: ★★★★☆', onClick: () => updateEdgeRelevance?.(props.id as string, 4) },
                    { label: 'Relevance: ★★★★★', onClick: () => updateEdgeRelevance?.(props.id as string, 5) },
                    { label: 'Delete edge', danger: true, onClick: () => deleteNode?.(props.id as string) },
                ]}
            />
        </>
    );
};
