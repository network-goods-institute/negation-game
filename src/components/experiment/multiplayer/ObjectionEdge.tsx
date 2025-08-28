import React, { useEffect } from "react";
import { BezierEdge, Edge, EdgeProps, useReactFlow, getBezierPath } from "@xyflow/react";
import { useGraphActions } from "./GraphContext";
import { ContextMenu } from "./common/ContextMenu";

export type ObjectionEdgeType = Edge<any, "objection">;
export interface ObjectionEdgeProps extends EdgeProps<ObjectionEdgeType> { }

export const ObjectionEdge = (props: ObjectionEdgeProps) => {
  const { hoveredEdgeId, selectedEdgeId, setSelectedEdge, addObjectionForEdge, setHoveredEdge, updateEdgeAnchorPosition, deleteNode } = useGraphActions() as any;
  const isHovered = hoveredEdgeId === props.id;
  const rf = useReactFlow();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [menuPos, setMenuPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const sourceX = (props as any).sourceX;
  const sourceY = (props as any).sourceY;
  const targetX = (props as any).targetX;
  const targetY = (props as any).targetY;

  // Compute Bezier path and label position consistent with BezierEdge
  const [pathD, labelX, labelY] = getBezierPath({
    sourceX: sourceX ?? 0,
    sourceY: sourceY ?? 0,
    sourcePosition: (props as any).sourcePosition,
    targetX: targetX ?? 0,
    targetY: targetY ?? 0,
    targetPosition: (props as any).targetPosition,
    curvature: 0.35,
  });

  useEffect(() => {
    if (Number.isFinite(labelX) && Number.isFinite(labelY)) {
      updateEdgeAnchorPosition(props.id as string, labelX, labelY);
    }
  }, [labelX, labelY, props.id, updateEdgeAnchorPosition]);

  const selected = (selectedEdgeId || null) === (props.id as any);

  return (
    <>
      {/* Selection highlight following curve */}
      {Number.isFinite(sourceX) && Number.isFinite(sourceY) && Number.isFinite(targetX) && Number.isFinite(targetY) && selected && (
        <path d={pathD} stroke="rgba(251,191,36,0.85)" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.6} />
      )}
      <BezierEdge
        {...props}
        style={{
          strokeWidth: 3,
          strokeDasharray: "8,4",
          stroke: "#f97316",
        }}
        pathOptions={{ curvature: 0.35 }}
      />
      {/* Invisible interaction overlay along the whole curve (on top) */}
      {Number.isFinite(sourceX) && Number.isFinite(sourceY) && Number.isFinite(targetX) && Number.isFinite(targetY) && (
        <path
          d={pathD}
          stroke="rgba(0,0,0,0)"
          strokeWidth={16}
          fill="none"
          style={{ pointerEvents: 'stroke' }}
          onClick={(e) => { e.stopPropagation(); setSelectedEdge?.(props.id as string); }}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedEdge?.(props.id as string); setMenuPos({ x: e.clientX, y: e.clientY }); setMenuOpen(true); }}
        />
      )}
      {/* Always-visible small midpoint dot to hint objection affordance */}
      <foreignObject x={(labelX || 0) - 4} y={(labelY || 0) - 4} width={8} height={8} style={{ pointerEvents: 'all' }}>
        <div
          onClick={(e) => { e.stopPropagation(); addObjectionForEdge(props.id as string, labelX, labelY); }}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedEdge?.(props.id as string); setMenuPos({ x: e.clientX, y: e.clientY }); setMenuOpen(true); }}
          title="Add objection"
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: '#f97316', boxShadow: '0 0 0 1px #fff', cursor: 'pointer' }}
        />
      </foreignObject>
      <foreignObject
        x={(labelX || 0) - 45}
        y={(labelY || 0) + 14}
        width={150}
        height={40}
        style={{ pointerEvents: "all" }}
        onMouseEnter={() => setHoveredEdge(props.id as string)}
        onMouseLeave={() => setHoveredEdge(null)}
      >
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div className={`transition-opacity duration-500 ${isHovered ? "opacity-100" : "opacity-0"}`}>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                addObjectionForEdge(props.id as string, labelX, labelY);
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


