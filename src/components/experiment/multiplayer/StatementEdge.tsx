import React, { useEffect } from 'react';
import { StraightEdge, EdgeProps, useReactFlow } from '@xyflow/react';
import { useGraphActions } from './GraphContext';
import { ContextMenu } from './common/ContextMenu';

export const StatementEdge: React.FC<EdgeProps> = (props) => {
    const { hoveredEdgeId, selectedEdgeId, setSelectedEdge, addObjectionForEdge, setHoveredEdge, updateEdgeAnchorPosition, deleteNode } = useGraphActions() as any;
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
    useEffect(() => {
        if (Number.isFinite(cx) && Number.isFinite(cy)) {
            updateEdgeAnchorPosition(props.id as string, cx, cy);
        }
    }, [cx, cy, props.id, updateEdgeAnchorPosition]);

    // Hide objection affordances if either endpoint is hidden
    const sNode = rf.getNode((props as any).source as string);
    const tNode = rf.getNode((props as any).target as string);
    const sHidden = !!(sNode as any)?.data?.hidden;
    const tHidden = !!(tNode as any)?.data?.hidden;
    const showAffordance = !(sHidden || tHidden);

    const selected = (selectedEdgeId || null) === (props.id as any);

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
                <line x1={(props as any).sourceX} y1={(props as any).sourceY} x2={(props as any).targetX} y2={(props as any).targetY} stroke="rgba(251,191,36,0.8)" strokeWidth={8} strokeLinecap="round" opacity={0.6} />
            )}
            <StraightEdge
                {...props}
                style={{
                    strokeWidth: 2,
                    stroke: '#6b7280',
                }}
                interactionWidth={8}
            />
            {showAffordance && (
                <>
                    {/* Midpoint dot to hint objection affordance */}
                    <foreignObject x={cx - 4} y={cy - 4} width={8} height={8} style={{ pointerEvents: 'all' }}>
                        <div
                            onClick={(e) => { e.stopPropagation(); addObjectionForEdge(props.id as string, cx, cy); }}
                            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedEdge?.(props.id as string); setMenuPos({ x: e.clientX, y: e.clientY }); setMenuOpen(true); }}
                            title="Add objection"
                            className="w-2 h-2 rounded-full"
                            style={{
                                backgroundColor: '#6b7280',
                                boxShadow: '0 0 0 1px #fff',
                                cursor: 'pointer',
                            }}
                        />
                    </foreignObject>
                    <foreignObject x={cx - 45} y={cy + 14} width={150} height={40} style={{ pointerEvents: 'all' }} onMouseEnter={() => setHoveredEdge(props.id as string)} onMouseLeave={() => setHoveredEdge(null)}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <div className={`transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                                <button
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        addObjectionForEdge(props.id as string, cx, cy);
                                    }}
                                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedEdge?.(props.id as string); setMenuPos({ x: e.clientX, y: e.clientY }); setMenuOpen(true); }}
                                    className="rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-stone-800 text-white"
                                >
                                    Object
                                </button>
                                {((props as any).data?.objectionsCount || 0) > 0 && (
                                    <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-amber-500 text-white text-[10px] px-1">
                                        {(props as any).data.objectionsCount}
                                    </span>
                                )}
                            </div>
                        </div>
                    </foreignObject>
                </>
            )}
            <ContextMenu
                open={menuOpen}
                x={menuPos.x}
                y={menuPos.y}
                onClose={() => setMenuOpen(false)}
                items={[{ label: 'Delete edge', danger: true, onClick: () => deleteNode?.(props.id as string) }]}
            />
        </>
    );
};
