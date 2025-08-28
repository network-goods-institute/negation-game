import React, { useEffect, useMemo } from 'react';
import { StraightEdge, EdgeProps, useReactFlow } from '@xyflow/react';
import { useGraphActions } from './GraphContext';

export const NegationEdge: React.FC<EdgeProps> = (props) => {
  const { hoveredEdgeId, addObjectionForEdge, setHoveredEdge, updateEdgeAnchorPosition } = useGraphActions();
  const isHovered = hoveredEdgeId === props.id;
  const rf = useReactFlow();

  const sourceX = (props as any).sourceX;
  const sourceY = (props as any).sourceY;
  const targetX = (props as any).targetX;
  const targetY = (props as any).targetY;

  const { cx, cy } = useMemo(() => {
    return {
      cx: sourceX != null && targetX != null ? (sourceX + targetX) / 2 : 0,
      cy: sourceY != null && targetY != null ? (sourceY + targetY) / 2 : 0,
    };
  }, [sourceX, sourceY, targetX, targetY]);

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

  return (
    <>
      <StraightEdge
        {...props}
        style={{
          strokeWidth: 2,
          stroke: '#ef4444',
        }}
        label="-"
        labelShowBg={false}
        labelStyle={{
          padding: 0,
          width: 20,
          height: 20,
          stroke: 'white',
          strokeWidth: 2,
          fontSize: 36,
          fontWeight: 600,
          fill: '#ef4444',
        }}
      />
      {showAffordance && (
        <>
          {/* Always-visible small midpoint dot to hint objection affordance */}
          <foreignObject
            x={cx - 4}
            y={cy - 4}
            width={8}
            height={8}
            style={{ pointerEvents: 'all' }}
          >
            <div
              onClick={(e) => { e.stopPropagation(); addObjectionForEdge(props.id as string, cx, cy); }}
              title="Add objection"
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: '#ef4444',
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
    </>
  );
};
