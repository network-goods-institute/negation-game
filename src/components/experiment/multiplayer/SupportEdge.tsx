import React, { useEffect, useMemo } from "react";
import { StraightEdge, EdgeProps, getStraightPath } from "@xyflow/react";
import { EdgeLabelRenderer } from "@xyflow/react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useGraphActions } from "./GraphContext";
import { ContextMenu } from "./common/ContextMenu";
import { useEdgePerformanceOptimization } from "./common/useEdgePerformanceOptimization";
import { useAbsoluteNodePosition } from './common/useAbsoluteNodePosition';

export const SupportEdge: React.FC<EdgeProps> = (props) => {
    const { hoveredEdgeId, selectedEdgeId, setSelectedEdge, addObjectionForEdge, setHoveredEdge, updateEdgeAnchorPosition, deleteNode, updateEdgeRelevance, connectMode, beginConnectFromEdge, isConnectingFromNodeId, cancelConnect, completeConnectToEdge } = useGraphActions() as any;
    const isHovered = hoveredEdgeId === props.id;
    const [menuOpen, setMenuOpen] = React.useState(false);
    const [menuPos, setMenuPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const { getRectPosition } = useAbsoluteNodePosition();

    const sourceX = (props as any).sourceX;
    const sourceY = (props as any).sourceY;
    const targetX = (props as any).targetX;
    const targetY = (props as any).targetY;

    const { isHighFrequencyUpdates, sourceNode, targetNode, shouldRenderEllipses } = useEdgePerformanceOptimization({
        sourceId: (props as any).source as string,
        targetId: (props as any).target as string,
        sourceX,
        sourceY,
        targetX,
        targetY
    });

    // Compute straight path
    const [pathD, labelX, labelY] = useMemo(() => {
        return getStraightPath({
            sourceX: sourceX ?? 0,
            sourceY: sourceY ?? 0,
            targetX: targetX ?? 0,
            targetY: targetY ?? 0,
        });
    }, [sourceX, sourceY, targetX, targetY]);

    const lastPosRef = React.useRef<{ x: number; y: number } | null>(null);
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

    const edgeDataRelevance = (props as any).data?.relevance;

    const selected = useMemo(() => (selectedEdgeId || null) === (props.id as any), [selectedEdgeId, props.id]);
    const relevance = useMemo(() => Math.max(1, Math.min(5, (edgeDataRelevance ?? 3))), [edgeDataRelevance]);
    const edgeOpacity = useMemo(() => selected || isHovered ? 1 : Math.max(0.3, Math.min(1, relevance / 5)), [selected, isHovered, relevance]);

    const shouldRenderOverlay = useMemo(
        () =>
            Number.isFinite(sourceX) &&
            Number.isFinite(sourceY) &&
            Number.isFinite(targetX) &&
            Number.isFinite(targetY),
        [sourceX, sourceY, targetX, targetY]
    );
    const overlayStyle = useMemo(() => ({ pointerEvents: 'stroke' as const }), []);

    // Check connected nodes for masking
    const srcHasFavor = (sourceNode as any)?.type === 'point' || (sourceNode as any)?.type === 'objection';
    const tgtHasFavor = (targetNode as any)?.type === 'point' || (targetNode as any)?.type === 'objection';
    const srcFavor = Math.max(1, Math.min(5, (sourceNode as any)?.data?.favor ?? 5));
    const tgtFavor = Math.max(1, Math.min(5, (targetNode as any)?.data?.favor ?? 5));
    const srcIsTitle = (sourceNode as any)?.type === 'title';
    const tgtIsTitle = (targetNode as any)?.type === 'title';
    const srcLowOpacity = (srcHasFavor && srcFavor <= 3) || srcIsTitle;
    const tgtLowOpacity = (tgtHasFavor && tgtFavor <= 3) || tgtIsTitle;

    return (
        <>
            {/* Edge elements with opacity and node masking */}
            <g style={{ opacity: edgeOpacity }}>
                <defs>
                    <mask id={`support-mask-${props.id}`}>
                        <rect x="-10000" y="-10000" width="20000" height="20000" fill="white" />
                        {shouldRenderEllipses && srcLowOpacity && (() => {
                            const rectPos = getRectPosition(sourceNode, true);
                            return rectPos ? (
                                <rect x={rectPos.x} y={rectPos.y} width={rectPos.width} height={rectPos.height} fill="black" />
                            ) : null;
                        })()}
                        {shouldRenderEllipses && tgtLowOpacity && (() => {
                            const rectPos = getRectPosition(targetNode, true);
                            return rectPos ? (
                                <rect x={rectPos.x} y={rectPos.y} width={rectPos.width} height={rectPos.height} fill="black" />
                            ) : null;
                        })()}
                    </mask>
                </defs>
                <g mask={`url(#support-mask-${props.id})`}>
                    {/* Selection highlight following straight line */}
                    {useMemo(() => Number.isFinite(sourceX) && Number.isFinite(sourceY) && Number.isFinite(targetX) && Number.isFinite(targetY) && selected, [sourceX, sourceY, targetX, targetY, selected]) && (
                        <path d={pathD} stroke="#000" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.85} />
                    )}
                    <StraightEdge
                        {...props}
                        style={useMemo(() => ({
                            stroke: '#9CA3AF',
                            strokeWidth: Math.max(1, Math.min(8, relevance * 1.4)),
                            strokeDasharray: '6,6',
                        }), [relevance])}
                        interactionWidth={24}
                        label="+"
                        labelShowBg={false}
                        labelStyle={{
                            padding: 0,
                            width: 20,
                            height: 20,
                            stroke: 'white',
                            strokeWidth: 2,
                            fontSize: 28,
                            fontWeight: 700,
                            fill: '#4B5563',
                            userSelect: 'none',
                        }}
                    />
                </g>
            </g>
            {/* Invisible interaction overlay along the whole line (on top) */}
            {shouldRenderOverlay && (
                <path
                    d={pathD}
                    stroke="rgba(0,0,0,0)"
                    strokeWidth={36}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    style={overlayStyle}
                    onClick={(e) => { e.stopPropagation(); setSelectedEdge?.(props.id as string); }}
                    onMouseDown={(e) => { if (connectMode) { e.preventDefault(); e.stopPropagation(); beginConnectFromEdge?.(props.id as string); } }}
                    onMouseUp={(e) => { if (connectMode) { e.preventDefault(); e.stopPropagation(); completeConnectToEdge?.(props.id as string, labelX, labelY); } }}
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedEdge?.(props.id as string); setMenuPos({ x: e.clientX, y: e.clientY }); setMenuOpen(true); }}
                />
            )}
            {/* Midpoint control (match negation style, but gray for support) */}
            <foreignObject
                x={useMemo(() => (labelX || 0) - 8, [labelX])}
                y={useMemo(() => (labelY || 0) - 8, [labelY])}
                width={16}
                height={16}
                style={useMemo(() => ({ pointerEvents: 'all' }), [])}
            >
                <div
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedEdge?.(props.id as string); setMenuPos({ x: e.clientX, y: e.clientY }); setMenuOpen(true); }}
                    title="Edge controls"
                    className="w-4 h-4 rounded-full bg-white border flex items-center justify-center select-none"
                    style={{ borderColor: '#9CA3AF', cursor: 'pointer', userSelect: 'none' as any }}
                    draggable={false}
                >
                    <div className="w-1 h-1 rounded-full" style={{ backgroundColor: '#9CA3AF' }} />
                </div>
            </foreignObject>
            {
                /* Always render overlay; show stars only when simulation is on */
                (
                    <EdgeLabelRenderer>
                        <div
                            style={useMemo(() => ({
                                position: 'absolute',
                                transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY + 18}px)`,
                                zIndex: 1000,
                                pointerEvents: 'all'
                            }), [labelX, labelY])}
                            onMouseEnter={() => setHoveredEdge(props.id as string)}
                            onMouseLeave={() => setHoveredEdge(null)}
                            className={`transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                        >
                            <div className="flex items-center justify-center gap-2 bg-white/95 backdrop-blur-sm border rounded-md shadow px-2 py-1">
                                <div className="flex items-center gap-2 text-[11px] select-none">
                                    <span className="uppercase tracking-wide text-stone-500">Relevance</span>
                                    <TooltipProvider>
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <Tooltip key={`rel-${i}`}>
                                                    <TooltipTrigger asChild>
                                                        <button title={`Set relevance to ${i}`} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); updateEdgeRelevance?.(props.id as string, i as any); }}>
                                                            <span className={i <= ((props as any).data?.relevance ?? 3) ? 'text-gray-600' : 'text-stone-300'}>★</span>
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
                                    onClick={(e) => { e.stopPropagation(); addObjectionForEdge(props.id as string, labelX, labelY); setHoveredEdge(null); setSelectedEdge?.(null); }}
                                    className="rounded-full min-h-8 min-w-8 px-3 py-1 text-[11px] font-medium bg-stone-800 text-white"
                                    title="Add mitigation to this relation"
                                >
                                    Mitigate
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

export default SupportEdge;


