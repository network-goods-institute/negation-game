import React, { useEffect, useRef, useState } from 'react';
import { Position, useStore } from '@xyflow/react';
import { useGraphActions } from '../GraphContext';

import { ContextMenu } from '../common/ContextMenu';
import { toast } from 'sonner';
import { NodeActionPill } from '../common/NodeActionPill';
import { SideActionPill } from '../common/SideActionPill';
import { useNodeChrome } from '../common/useNodeChrome';
import { useContextMenuHandler } from '../common/useContextMenuHandler';
import { useFavorOpacity } from '../common/useFavorOpacity';
import { NodeShell } from '../common/NodeShell';
import { useForceHidePills } from '../common/useForceHidePills';
import { FavorSelector } from '../common/FavorSelector';

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
    const {
        updateNodeContent,
        updateNodeHidden,
        updateNodeFavor,
        addNegationBelow,
        createSupportBelow,
        deleteNode,
        startEditingNode,
        stopEditingNode,
        isLockedForMe,
        getLockOwner,
    } = useGraphActions() as any;

    const locked = isLockedForMe?.(id) || false;
    const lockOwner = getLockOwner?.(id) || null;
    const hidden = (data as any)?.hidden === true;

    const { editable, hover, pill, connect, innerScaleStyle, isActive, cursorClass } = useNodeChrome({
        id,
        selected,
        content: data.content,
        updateNodeContent,
        startEditingNode,
        stopEditingNode,
        locked,
        hidden,
        pillDelay: 200,
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

    const pointLike = useStore((s: any) => (s.edges || []).some((edge: any) => (edge.type || '') === 'negation' && (edge.source === id || edge.target === id)));
    const { hovered, onMouseEnter, onMouseLeave } = hover;
    const { handleMouseEnter, handleMouseLeave, hideNow, shouldShowPill } = pill;

    const forceHidePills = useForceHidePills({
        id,
        hidePill: hideNow,
        onPillMouseLeave: handleMouseLeave,
        onHoverLeave: onMouseLeave,
    });

    const containerRef = useRef<HTMLDivElement | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (wrapperRef.current && contentRef.current) {
            wrapperRef.current.style.minHeight = `${contentRef.current.scrollHeight}px`;
        }
    }, [value, contentRef, wrapperRef]);

    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    const handleContextMenu = useContextMenuHandler({
        isEditing,
        onOpenMenu: (pos) => {
            setMenuPos(pos);
            setMenuOpen(true);
        },
    });
    const favor = Math.max(1, Math.min(5, (data as any)?.favor ?? 5));

    const favorOpacity = useFavorOpacity({
        favor,
        selected: !!selected,
        hovered,
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
        onContextMenu: handleContextMenu,
        onDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => {
            // Prevent double-click from bubbling up to canvas (which would spawn new nodes)
            e.stopPropagation();
            e.preventDefault();
        },
        'data-selected': selected,
    } as React.HTMLAttributes<HTMLDivElement>;

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
                wrapperRef={wrapperRef}
                wrapperClassName={`px-4 py-3 ${pointLike ? 'rounded-lg' : 'rounded-xl'} ${hidden ? (pointLike ? 'bg-gray-200 text-gray-600 border-gray-300' : 'bg-amber-50 text-amber-900 border-amber-200') : (pointLike ? 'bg-white text-gray-900 border-stone-200' : 'bg-amber-100 text-amber-900 border-amber-300')} border-2 ${cursorClass} min-w-[220px] max-w-[340px] relative z-10 transition-transform duration-300 ease-out ${isActive ? '-translate-y-[1px] scale-[1.02]' : ''}
            data-[selected=true]:ring-2 data-[selected=true]:ring-black data-[selected=true]:ring-offset-2 data-[selected=true]:ring-offset-white`}
                wrapperStyle={{ ...innerScaleStyle, opacity: hidden ? undefined : favorOpacity } as any}
                wrapperProps={wrapperProps as any}
                highlightClassName={`pointer-events-none absolute -inset-1 rounded-xl border-4 ${isActive ? 'border-black opacity-100 scale-100' : 'border-transparent opacity-0 scale-95'} transition-[opacity,transform] duration-300 ease-out z-0`}
            >
                <div
                    ref={contentRef}
                    contentEditable={isEditing && !locked && !hidden}
                    spellCheck={true}
                    suppressContentEditableWarning
                    onInput={onInput}
                    onPaste={onPaste}
                    onMouseDown={onContentMouseDown}
                    onMouseMove={onContentMouseMove}
                    onMouseLeave={onContentMouseLeave}
                    onMouseUp={onContentMouseUp}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    onKeyDown={onKeyDown}
                    className={`text-sm ${pointLike ? 'text-gray-900' : 'text-amber-900'} leading-relaxed whitespace-pre-wrap break-words outline-none transition-opacity duration-200 ${isEditing ? 'nodrag' : ''} ${hidden ? 'opacity-0 pointer-events-none select-none' : 'opacity-100'}`}
                    style={{ userSelect: hidden ? 'none' : 'text' }}
                >
                    {value || (pointLike ? 'New point' : 'New mitigation')}
                </div>
                {hidden && (
                    <div className="absolute inset-0 flex
items-center justify-center pointer-events-none select-none">
                        <div className={`text-xs ${pointLike ? 'text-gray-600' : 'text-amber-600'} italic animate-fade-in`}>Hidden</div>
                    </div>
                )}
                {selected && !hidden && (
                    <div className="mt-1 mb-1 flex items-center gap-2 select-none" style={{ position: 'relative', zIndex: 20 }}>
                        <span className="text-[10px] uppercase tracking-wide text-stone-500 -translate-y-0.5">Favor</span>
                        <FavorSelector
                            value={favor}
                            onSelect={(level) => updateNodeFavor?.(id, level)}
                            activeClassName={pointLike ? "text-gray-600" : "text-amber-600"}
                            inactiveClassName={pointLike ? "text-gray-300" : "text-stone-300"}
                        />
                    </div>
                )}
                {!hidden && (
                    <NodeActionPill
                        label="Support"
                        visible={shouldShowPill}
                        onClick={() => { createSupportBelow?.(id); forceHidePills(); }}
                        colorClass="bg-stone-900"
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        onForceHide={forceHidePills}
                    />
                )}
                {!hidden && (
                    <SideActionPill
                        label="Negate"
                        visible={shouldShowPill}
                        onClick={() => { addNegationBelow(id); forceHidePills(); }}
                        colorClass="bg-stone-900"
                        side="right"
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        onForceHide={forceHidePills}
                    />
                )}
            </NodeShell>
            <ContextMenu
                open={menuOpen}
                x={menuPos.x}
                y={menuPos.y}
                onClose={() => setMenuOpen(false)}
                items={[
                    { label: 'Delete node', danger: true, onClick: () => { if (locked) { toast.warning(`Locked by ${lockOwner?.name || 'another user'}`); } else { deleteNode(id); } } },
                ]}
            />
        </>
    );
};

export default ObjectionNode;
