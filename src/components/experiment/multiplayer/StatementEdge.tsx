import React, { useEffect } from 'react';
import { StraightEdge, EdgeProps } from '@xyflow/react';
import { useGraphActions } from './GraphContext';

export const StatementEdge: React.FC<EdgeProps> = (props) => {
    const { hoveredEdgeId, addObjectionForEdge, setHoveredEdge, updateEdgeAnchorPosition } = useGraphActions();
    const isHovered = hoveredEdgeId === props.id;
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

    return (
        <>
            <StraightEdge
                {...props}
                style={{
                    strokeWidth: 2,
                    stroke: '#6b7280',
                }}
                interactionWidth={8}
            />
            <foreignObject x={cx - 45} y={cy + 14} width={150} height={40} style={{ pointerEvents: 'all' }} onMouseEnter={() => setHoveredEdge(props.id as string)} onMouseLeave={() => setHoveredEdge(null)}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div className={`transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                        <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                                e.stopPropagation();
                                addObjectionForEdge(props.id as string, cx, cy);
                            }}
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
    );
};