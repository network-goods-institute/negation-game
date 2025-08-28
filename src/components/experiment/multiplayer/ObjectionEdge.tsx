import React, { useEffect } from "react";
import { BezierEdge, Edge, EdgeProps, useReactFlow, getBezierPath } from "@xyflow/react";
import { EdgeLabelRenderer } from "@xyflow/react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useGraphActions } from "./GraphContext";
import { ContextMenu } from "./common/ContextMenu";

export type ObjectionEdgeType = Edge<any, "objection">;
export interface ObjectionEdgeProps extends EdgeProps<ObjectionEdgeType> { }

export const ObjectionEdge = (props: ObjectionEdgeProps) => {
  const { hoveredEdgeId, selectedEdgeId, setSelectedEdge, addObjectionForEdge, setHoveredEdge, updateEdgeAnchorPosition, deleteNode, updateEdgeRelevance } = useGraphActions() as any;
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
      {/* Single dashed stroke only (no additional black overlays) */}
      {/* Midpoint control (match negation style, but orange, diagonal stroke) */}
      <foreignObject x={(labelX || 0) - 8} y={(labelY || 0) - 8} width={16} height={16} style={{ pointerEvents: 'all' }}>
        <div
          onClick={(e) => { e.stopPropagation(); addObjectionForEdge(props.id as string, labelX, labelY); }}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedEdge?.(props.id as string); setMenuPos({ x: e.clientX, y: e.clientY }); setMenuOpen(true); }}
          title="Edge controls"
          className="w-4 h-4 rounded-full bg-white border flex items-center justify-center"
          style={{ borderColor: '#f97316', cursor: 'pointer' }}
        >
          <div className="w-2 h-[2px] rounded-sm" style={{ backgroundColor: '#f97316', transform: 'rotate(45deg)' }} />
        </div>
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
          <div className="flex items-center justify-center gap-2 bg-white/95 backdrop-blur-sm border rounded-md shadow px-2 py-1">
            <div className="flex items-center gap-2 text-[11px] select-none">
              <span className="uppercase tracking-wide text-stone-500">Relevance</span>
              <TooltipProvider>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((i) => (
                    <Tooltip key={`rel-${i}`}>
                      <TooltipTrigger asChild>
                        <button title={`Set relevance to ${i}`} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); updateEdgeRelevance?.(props.id as string, i as any); }}>
                          <span className={i <= ((props as any).data?.relevance ?? 3) ? 'text-orange-600' : 'text-stone-300'}>★</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">Relevance: {i}/5</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </TooltipProvider>
            </div>
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
      {/* Circle dots along the Bezier (center → both ends, with lag, smaller) */}
      <BezierDots id={String(props.id)} pathD={pathD} sId={(props as any).source} tId={(props as any).target} />
    </>
  );
};

function BezierDots({ id, pathD, sId, tId }: { id: string; pathD: string; sId: string; tId: string }) {
  const rf = useReactFlow();
  const [reduced, setReduced] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const pathRef = React.useRef<SVGPathElement | null>(null);
  const smoothedRef = React.useRef<Record<string, { x: number; y: number }>>({});
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  React.useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const loop = () => { setTick((v) => (v + 1) % 1_000_000); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);
  const sNode = rf.getNode(sId as any);
  const tNode = rf.getNode(tId as any);
  const srcFavor = (sNode as any)?.data?.favor ?? 3;
  const tgtFavor = (tNode as any)?.data?.favor ?? 3;
  const favorAvg = (srcFavor + tgtFavor) / 2;
  const baseSpeed = 16 + (Math.max(1, Math.min(5, favorAvg)) - 1) * 14;
  const spacingBase = 24;
  const now = reduced ? 0 : (performance.now ? performance.now() : Date.now()) / 1000;
  const L = (() => { try { return pathRef.current?.getTotalLength() || 0; } catch { return 0; } })();
  const nHalf = L > 0 ? Math.max(3, Math.floor((L/2) / spacingBase)) : 0;
  const center = L / 2;
  const build = () => {
    const dots: { key: string; cx: number; cy: number; r: number }[] = [];
    for (let j = 0; j < nHalf; j++) {
      const step = reduced ? (j + 0.5) * ((L/2) / nHalf) : (now * baseSpeed + j * spacingBase) % (L/2);
      const dL = Math.max(0, Math.min(L, center - step));
      const dR = Math.max(0, Math.min(L, center + step));
      try {
        const pL = pathRef.current!.getPointAtLength(dL);
        const pR = pathRef.current!.getPointAtLength(dR);
        const r = Math.max(1.0, Math.min(3.0, 1.3 + 0.3 * favorAvg)); // smaller, tighter
        dots.push({ key: `l${j}`, cx: pL.x, cy: pL.y, r });
        dots.push({ key: `r${j}`, cx: pR.x, cy: pR.y, r });
      } catch {}
    }
    return dots;
  };
  const dots = build();
  if (!pathD) return null as any;
  return (
    <g style={{ pointerEvents: 'none' }}>
      <defs>
        <filter id={`obj-dotShadow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="0.7" floodOpacity="0.2" />
        </filter>
      </defs>
      <path ref={pathRef as any} d={pathD} fill="none" stroke="transparent" strokeWidth={1} />
      <g filter={`url(#obj-dotShadow-${id})`}>
        {dots.map((d) => (
          <circle key={d.key} cx={d.cx} cy={d.cy} r={d.r} fill="#fff" stroke="#0b1220" strokeWidth={1.5} />
        ))}
      </g>
    </g>
  );
}
