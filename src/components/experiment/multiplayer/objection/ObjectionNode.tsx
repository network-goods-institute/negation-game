import React, { useEffect, useRef } from 'react';
import { Position, useStore, useReactFlow } from '@xyflow/react';
import { useGraphActions } from '../GraphContext';

import { toast } from 'sonner';
import { NodeActionPill } from '../common/NodeActionPill';
import { usePerformanceMode } from '../PerformanceContext';
import { useNodeChrome } from '../common/useNodeChrome';
import { useFavorOpacity } from '../common/useFavorOpacity';
import { NodeShell } from '../common/NodeShell';
import { useForceHidePills } from '../common/useForceHidePills';
import { FavorSelector } from '../common/FavorSelector';
import { LockIndicator } from '../common/LockIndicator';
import { useNodeExtrasVisibility } from '../common/useNodeExtrasVisibility';
import { useMarketData } from '@/hooks/market/useMarketData';
import { InlineMarketDisplay, useInlineMarketDisplay } from '../common/NodeWithMarket';
import { isMarketEnabled } from '@/utils/market/marketUtils';
import { InlineBuyControls } from '../market/InlineBuyControls';
import { MarketContextMenu } from '../common/MarketContextMenu';

const INTERACTIVE_TARGET_SELECTOR = 'button, [role="button"], a, input, textarea, select, [data-interactive="true"]';

interface ObjectionNodeProps {
    data: {
        content: string;
        parentEdgeId: string;
        favor?: number;
        hidden?: boolean;
    };
    id: string;
    selected?: boolean;
}

const ObjectionNode: React.FC<ObjectionNodeProps> = ({ data, id, selected }) => {
    const graph = useGraphActions() as any;
    const {
        updateNodeContent,
        updateNodeFavor,
        addPointBelow,
        deleteNode,
        startEditingNode,
        stopEditingNode,
        isLockedForMe,
        getLockOwner,
        lockNode,
        unlockNode,
    } = graph;

    const locked = isLockedForMe?.(id) || false;
    const lockOwner = getLockOwner?.(id) || null;
    const hidden = (data as any)?.hidden === true;

    const rf = useReactFlow();

    const { editable, hover, pill, connect, innerScaleStyle, isActive, cursorClass } = useNodeChrome({
        id,
        selected,
        content: data.content,
        updateNodeContent,
        startEditingNode: (nodeId: string) => {
            try { startEditingNode?.(nodeId); } catch { }
            try {
                const baseEdgeId: string | undefined = (data as any)?.parentEdgeId;
                if (baseEdgeId) {
                    const edges: any[] = (rf as any)?.getEdges?.() || [];
                    const base = edges.find((e: any) => e.id === baseEdgeId);
                    if (base) {
                        lockNode?.(String(base.source), 'drag');
                        lockNode?.(String(base.target), 'drag');
                    }
                }
            } catch { }
        },
        stopEditingNode: (nodeId: string) => {
            try { stopEditingNode?.(nodeId); } catch { }
            try {
                const baseEdgeId: string | undefined = (data as any)?.parentEdgeId;
                if (baseEdgeId) {
                    const edges: any[] = (rf as any)?.getEdges?.() || [];
                    const base = edges.find((e: any) => e.id === baseEdgeId);
                    if (base) {
                        unlockNode?.(String(base.source));
                        unlockNode?.(String(base.target));
                    }
                }
            } catch { }
        },
        locked,
        hidden,
        pillDelay: 200,
        autoFocus: {
            createdAt: (data as any)?.createdAt,
            isQuestionNode: false,
        },
    });

    const {
        isEditing,
        value,
        contentRef,
        wrapperRef,
        onClick,
        onInput,
        onPaste,
        onKeyDown,
        onBlur,
        onFocus,
        onContentMouseDown,
        onContentMouseMove,
        onContentMouseLeave,
        onContentMouseUp,
        isConnectMode,
    } = editable;

    const pointLike = useStore((s: any) => {
        const edges: any[] = s.edges || [];
        const touching = edges.filter((edge: any) => {
            const touchesNode = edge.source === id || edge.target === id;
            const isCommentEdge = (edge.type || '') === 'comment';
            return touchesNode && !isCommentEdge;
        });
        const isExactlyOneObjection = touching.length === 1 && (touching[0]?.type || '') === 'objection';
        return !isExactlyOneObjection;
    });
    const { hovered, onMouseEnter, onMouseLeave } = hover;
    const isNodeDragging = useStore((s: any) => Boolean(s?.nodeInternals?.get?.(id)?.dragging));
    const { handleMouseEnter, handleMouseLeave, hideNow, shouldShowPill } = pill;

    const forceHidePills = useForceHidePills({
        id,
        hidePill: hideNow,
        onPillMouseLeave: handleMouseLeave,
        onHoverLeave: onMouseLeave,
    });

    const containerRef = useRef<HTMLDivElement | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);

    const marketEnabled = isMarketEnabled();
    const { price: priceValue, hasPrice } = useMarketData(data as any);
    // Resolve the objection edge (security to trade) from the graph
    const rfApi = useReactFlow();
    const rfEdges = rfApi.getEdges() as any[];
    const objectionEdge = React.useMemo(() => {
        try {
            return rfEdges.find((e: any) => String(e.type || '') === 'objection' && String(e.source) === String(id)) || null;
        } catch { return null; }
    }, [rfEdges, id]);
    const objectionEdgeId = String((objectionEdge as any)?.id || '');

    // Use the objection edge's market data for price display
    const objectionEdgeData = (objectionEdge as any)?.data || {};
    const { showInlineMarket } = useInlineMarketDisplay({
        id: objectionEdgeId,
        data: objectionEdgeData,
        selected: !!selected,
        hidden,
        showPrice: false,
    });

    useEffect(() => {
        if (wrapperRef.current && contentRef.current) {
            wrapperRef.current.style.minHeight = `${contentRef.current.scrollHeight}px`;
        }
    }, [value, contentRef, wrapperRef]);

    const favor = Math.max(1, Math.min(5, (data as any)?.favor ?? 5));

    const favorOpacity = useFavorOpacity({
        favor,
        selected: !!selected,
        hovered,
    });

    const extras = useNodeExtrasVisibility({
        id,
        selected: !!selected,
        isEditing,
        isConnectMode,
        contentRef: contentRef as any,
        interactiveSelector: INTERACTIVE_TARGET_SELECTOR,
        wrapperRef: wrapperRef as any,
    });



    const sourceHandlePosition = useStore((s: any) => {
        const edges: any[] = s.edges || [];
        const obj = edges.find((edge: any) => edge.type === 'objection' && edge.source === id);
        if (!obj) return Position.Top;
        const anchor: any = s.nodeInternals?.get?.(obj.target);
        const self: any = s.nodeInternals?.get?.(id);
        if (!anchor || !self) return Position.Top;
        const anchorY = anchor.position?.y ?? 0;
        const selfY = self.position?.y ?? 0;
        return anchorY < selfY ? Position.Bottom : Position.Top;
    }, (prev: any, next: any) => {
        // Re-run when edges or node positions change
        const prevObj = prev.edges?.find((edge: any) => edge.type === 'objection' && edge.source === id);
        const nextObj = next.edges?.find((edge: any) => edge.type === 'objection' && edge.source === id);

        if (!prevObj && !nextObj) return true;
        if (!prevObj || !nextObj) return false;

        const prevAnchor = prev.nodeInternals?.get?.(prevObj.target);
        const nextAnchor = next.nodeInternals?.get?.(nextObj.target);
        const prevSelf = prev.nodeInternals?.get?.(id);
        const nextSelf = next.nodeInternals?.get?.(id);

        return (
            prevAnchor?.position?.y === nextAnchor?.position?.y &&
            prevSelf?.position?.y === nextSelf?.position?.y
        );
    });

    const wrapperProps = {
        onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
            if (isConnectMode) {
                e.stopPropagation();
                return;
            }
            if (isEditing) return;
            const target = e.target as HTMLElement | null;
            if (target?.closest(INTERACTIVE_TARGET_SELECTOR)) {
                e.stopPropagation();
                return;
            }
            extras.onWrapperMouseDown(e);
        },
        onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => {
            if (isConnectMode) return;
            if (isEditing) return;
            const target = e.target as HTMLElement | null;
            if (target?.closest(INTERACTIVE_TARGET_SELECTOR)) return;
            extras.onWrapperTouchStart(e);
        },
        onClick: (e: React.MouseEvent<HTMLDivElement>) => {
            if (isConnectMode) {
                const handled = connect.onClick(e);
                if (handled) {
                    return;
                }
            }
            if (contentRef.current && contentRef.current.contains(e.target as Node)) {
                onClick(e);
                return;
            }
            const target = e.target as HTMLElement | null;
            if (target?.closest(INTERACTIVE_TARGET_SELECTOR)) {
                return;
            }
            if (isEditing) return;
            if (locked) {
                e.stopPropagation();
                toast.warning(`Locked by ${lockOwner?.name || 'another user'}`);
                return;
            }
            onClick(e);
        },
        onDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => {
            // Prevent double-click from bubbling up to canvas (which would spawn new nodes)
            e.stopPropagation();
            e.preventDefault();
        },
        'data-selected': selected,
    } as React.HTMLAttributes<HTMLDivElement>;

    const { perfMode } = usePerformanceMode();
    const mindchangeHighlight = React.useMemo(() => {
        try {
            if (!(graph as any)?.mindchangeMode || !(graph as any)?.mindchangeEdgeId || (graph as any)?.mindchangeNextDir) return false;
            const mcEdge = rfApi.getEdges().find((e: any) => String(e.id) === String((graph as any)?.mindchangeEdgeId));
            if (!mcEdge) return false;
            if ((mcEdge as any).type !== 'objection') return false;
            return String(mcEdge.source) === id;
        } catch { return false; }
    }, [graph, rfApi, id]);
    const isGrabMode = Boolean((graph as any)?.grabMode);
    const [menuOpen, setMenuOpen] = React.useState(false);
    const [menuPos, setMenuPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const onContextMenuNode = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuPos({ x: e.clientX, y: e.clientY });
        setMenuOpen(true);
    };
    return (
        <>
            <NodeShell
                handles={[
                    {
                        id: `${id}-source-handle`,
                        type: 'source',
                        position: sourceHandlePosition,
                        style: { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' },
                    },
                    {
                        id: `${id}-incoming-handle`,
                        type: 'target',
                        position: Position.Bottom,
                        style: { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' },
                    },
                ]}
                rootRef={rootRef}
                rootProps={{
                    onMouseEnter: (e) => {
                        e.stopPropagation();
                        onMouseEnter();
                        handleMouseEnter();
                    },
                    onMouseLeave: (e) => {
                        e.stopPropagation();
                        onMouseLeave();
                        handleMouseLeave();
                    },
                }}
                containerRef={containerRef}
                containerClassName="relative inline-block group"
                wrapperRef={wrapperRef}
                wrapperClassName={`px-4 py-3 ${pointLike ? 'rounded-lg' : 'rounded-xl'} ${hidden ? (pointLike ? 'bg-gray-200 text-gray-600 border-gray-300' : 'bg-amber-50 text-amber-900 border-amber-200') : (pointLike ? 'bg-white text-gray-900 border-stone-200' : 'bg-amber-100 text-amber-900 border-amber-300')} border-2 ${cursorClass} min-w-[220px] max-w-[340px] inline-flex flex-col relative z-10 transition-all duration-300 ease-out origin-center group ${isActive ? '-translate-y-[1px] scale-[1.02]' : ''} ${mindchangeHighlight ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-white' : ''}
            data-[selected=true]:ring-2 data-[selected=true]:ring-black data-[selected=true]:ring-offset-2 data-[selected=true]:ring-offset-white`}
                wrapperStyle={{
                    ...innerScaleStyle,
                    opacity: hidden ? undefined : favorOpacity,
                    marginTop: showInlineMarket ? '-96px' : undefined,
                } as any}
                wrapperProps={{ ...(wrapperProps as any), onContextMenu: onContextMenuNode }}
                highlightClassName={`pointer-events-none absolute -inset-1 rounded-xl border-4 ${isActive ? 'border-black opacity-100 scale-100' : 'border-transparent opacity-0 scale-95'} transition-[opacity,transform] duration-300 ease-out z-0`}
            >
                <LockIndicator locked={locked} lockOwner={lockOwner} className="absolute -top-2 -right-2 z-20" />
                {!isNodeDragging && objectionEdge && objectionEdgeId && (
                    <InlineMarketDisplay
                        id={objectionEdgeId}
                        data={objectionEdgeData as any}
                        selected={!!selected}
                        hidden={hidden}
                        showPrice={false}
                        offsetLeft="-left-4"
                        variant="objection"
                    />
                )}
                <div
                    ref={contentRef}
                    contentEditable={isEditing && !locked && !hidden}
                    spellCheck={true}
                    suppressContentEditableWarning
                    onInput={onInput}
                    onPaste={onPaste}
                    onMouseDown={(e) => { extras.onContentMouseDown(e); onContentMouseDown(e); }}
                    onTouchStart={(e) => { extras.onContentTouchStart(e); }}
                    onMouseMove={onContentMouseMove}
                    onMouseLeave={onContentMouseLeave}
                    onMouseUp={onContentMouseUp}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    onKeyDown={onKeyDown}
                    className={`text-sm ${pointLike ? 'text-gray-900' : 'text-amber-900'} leading-relaxed whitespace-pre-wrap break-words outline-none transition-opacity duration-200 ${isEditing ? 'nodrag' : ''} ${hidden ? 'opacity-0 pointer-events-none select-none' : 'opacity-100'}`}
                    style={{ marginTop: showInlineMarket ? '96px' : undefined }}
                >
                    {value || (pointLike ? 'New point' : 'New mitigation')}
                </div>
                {selected && marketEnabled && !hidden && objectionEdge && objectionEdgeId && (() => {
                    if (isNodeDragging) return null;
                    const mkt = (objectionEdge as any)?.data?.market || {};
                    const edgePrice = Number(mkt.price);
                    const edgeMine = Number.isFinite(Number(mkt.mine)) ? Number(mkt.mine) : undefined;
                    const edgeTotal = Number.isFinite(Number(mkt.total)) ? Number(mkt.total) : undefined;
                    return (
                        <InlineBuyControls
                            entityId={objectionEdgeId}
                            price={Number.isFinite(edgePrice) ? edgePrice : 0}
                            initialMine={edgeMine}
                            initialTotal={edgeTotal}
                            variant="objection"
                            showPriceHistory={false}
                        />
                    );
                })()}
                {hidden && (
                    <div className="absolute inset-0 flex
items-center justify-center pointer-events-none select-none">
                        <div className={`text-xs ${pointLike ? 'text-gray-600' : 'text-amber-600'} italic animate-fade-in`}>Hidden</div>
                    </div>
                )}
                {selected && !hidden && extras.showExtras && !marketEnabled && (
                    <div ref={(el) => extras.registerExtras?.(el)} className="mt-1 mb-1 flex items-center gap-2 select-none" style={{ position: 'relative', zIndex: 20 }}>
                        <span className="text-[10px] uppercase tracking-wide text-stone-500 -translate-y-0.5">Favor</span>
                        <FavorSelector
                            value={favor}
                            onSelect={(level) => updateNodeFavor?.(id, level)}
                            activeClassName="text-yellow-500"
                            inactiveClassName="text-stone-300"
                        />
                    </div>
                )}
                {!hidden && !perfMode && !isGrabMode && extras.showExtras && (
                    <div ref={(el) => extras.registerExtras?.(el)}>
                        <NodeActionPill
                            label="Add Point"
                            visible={isEditing ? true : (shouldShowPill && extras.showExtras)}
                            onClick={() => { if (isConnectMode) return; addPointBelow?.(id); forceHidePills(); }}
                            colorClass="bg-stone-900"
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            onForceHide={forceHidePills}
                        />
                    </div>
                )}
            </NodeShell>
            <MarketContextMenu
                open={menuOpen}
                x={menuPos.x}
                y={menuPos.y}
                onClose={() => setMenuOpen(false)}
                kind="node"
                entityId={objectionEdgeId || id}
                onDelete={() => { if (locked) { toast.warning(`Locked by ${lockOwner?.name || 'another user'}`); } else { deleteNode(id); } }}
                nodeEl={wrapperRef.current as any}
            />
        </>
    );
};

export default ObjectionNode;
