import React, { useEffect } from "react";
import { BezierEdge, Edge, EdgeProps, useReactFlow, getBezierPath } from "@xyflow/react";
import { EdgeLabelRenderer } from "@xyflow/react";
import { useGraphActions } from "./GraphContext";
import { ContextMenu } from "./common/ContextMenu";

export type ObjectionEdgeType = Edge<any, "objection">;
export interface ObjectionEdgeProps extends EdgeProps<ObjectionEdgeType> { }

export const ObjectionEdge = (props: ObjectionEdgeProps) => {
  const { hoveredEdgeId, selectedEdgeId, setSelectedEdge, addObjectionForEdge, setHoveredEdge, updateEdgeAnchorPosition, deleteNode, updateEdgeRelevance, importanceSim } = useGraphActions() as any;
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

  const lastPosRef = React.useRef<{x:number;y:number}|null>(null);
  const rafRef = React.useRef<number>(0);
  useEffect(() => {
    if (!Number.isFinite(labelX) || !Number.isFinite(labelY)) return;
    const last = lastPosRef.current;
    if (last && Math.abs(last.x - labelX) < 0.5 && Math.abs(last.y - labelY) < 0.5) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      lastPosRef.current = { x: labelX, y: labelY };
      updateEdgeAnchorPosition(props.id as string, labelX, labelY);
    });
    return () => cancelAnimationFrame(rafRef.current);
  }, [labelX, labelY, props.id, updateEdgeAnchorPosition]);

  const selected = (selectedEdgeId || null) === (props.id as any);

  return (
    <>
      {/* Selection highlight following curve */}
      {Number.isFinite(sourceX) && Number.isFinite(sourceY) && Number.isFinite(targetX) && Number.isFinite(targetY) && selected && (
        <path d={pathD} stroke="#000" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.85} />
      )}
      <BezierEdge
        {...props}
        style={{
          strokeWidth: 1 + Math.max(1, Math.min(5, ((props as any).data?.relevance ?? 3))),
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
      {/* marching dots overlay on top for visibility (render last for z-order) */}
      {Number.isFinite(sourceX) && Number.isFinite(sourceY) && Number.isFinite(targetX) && Number.isFinite(targetY) && (
        <>
          <defs>
            <style>{`@keyframes edge-dots-${props.id} { from { stroke-dashoffset: 0; } to { stroke-dashoffset: 100; } }`}</style>
            <clipPath id={`edge-left-${props.id}`}>
              <rect x={Math.min(sourceX!, targetX!)} y={Math.min(sourceY!, targetY!)} width={Math.abs((labelX||0) - Math.min(sourceX!, targetX!))} height={Math.abs(targetY! - sourceY!) + 200} />
            </clipPath>
            <clipPath id={`edge-right-${props.id}`}>
              <rect x={(labelX||0)} y={Math.min(sourceY!, targetY!)} width={Math.abs(Math.max(sourceX!, targetX!) - (labelX||0))} height={Math.abs(targetY! - sourceY!) + 200} />
            </clipPath>
          </defs>
          {/* from source side toward center */}
          <path d={pathD} stroke="#000" strokeWidth={2} fill="none" strokeLinecap="round" strokeDasharray="2 10" clipPath={`url(#edge-left-${props.id})`} style={{
            animationName: `edge-dots-${props.id}`,
            animationDuration: `4s`,
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            opacity: 0.8,
            pointerEvents: 'none',
          }} />
          {/* from target side toward center (reverse) */}
          <path d={pathD} stroke="#000" strokeWidth={2} fill="none" strokeLinecap="round" strokeDasharray="2 10" clipPath={`url(#edge-right-${props.id})`} style={{
            animationName: `edge-dots-${props.id}`,
            animationDuration: `4s`,
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            animationDirection: 'reverse',
            opacity: 0.8,
            pointerEvents: 'none',
          }} />
        </>
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
      {
      /* Always render overlay; show stars only when simulation is on */
      (
      <EdgeLabelRenderer>
        <div
          style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY + 18}px)`, zIndex: 1000, pointerEvents: 'all' }}
          onMouseEnter={() => setHoveredEdge(props.id as string)}
          onMouseLeave={() => setHoveredEdge(null)}
          className={`transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className="flex items-center justify-center gap-2">
            {importanceSim && (
              <div className="flex items-center gap-1 text-[11px] select-none" title="Set edge relevance (simulation). 1 = low, 5 = high.">
                {[1,2,3,4,5].map((i) => (
                  <button key={`rel-${i}`} title={`Set relevance to ${i}`} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); updateEdgeRelevance?.(props.id as string, i as any); }}>
                    <span className={i <= ((props as any).data?.relevance ?? 3) ? 'text-orange-600' : 'text-stone-300'}>★</span>
                  </button>
                ))}
              </div>
            )}
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => { e.stopPropagation(); addObjectionForEdge(props.id as string, labelX, labelY); }}
              className="rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-stone-800 text-white"
              title="Add objection to this relation"
            >
              Object
            </button>
          </div>
        </div>
      </EdgeLabelRenderer>
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
