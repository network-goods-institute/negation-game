import React, { useEffect, useRef, useState } from 'react';
import { Position, useStore } from '@xyflow/react';
import { useGraphActions } from '../GraphContext';

import { ContextMenu } from '../common/ContextMenu';
import { toast } from 'sonner';
import { NodeActionPill } from '../common/NodeActionPill';
import { SideActionPill } from '../common/SideActionPill';
import { Eye, EyeOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNodeChrome } from '../common/useNodeChrome';
import { useFavorOpacity } from '../common/useFavorOpacity';
import { NodeShell } from '../common/NodeShell';

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

    const { editable, hover, pill, connect, innerScaleStyle, isActive } = useNodeChrome({
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
        onKeyDown,
        onBlur,
        onFocus,
        onContentMouseDown,
        onContentMouseMove,
        isConnectMode,
    } = editable;

    const pointLike = useStore((s: any) => (s.edges || []).some((edge: any) => (edge.type || '') === 'negation' && (edge.source === id || edge.target === id)));
    const { hovered, setHovered, onEnter, onLeave } = hover;
    const { handleMouseEnter, handleMouseLeave, hideNow, shouldShowPill } = pill;

    const containerRef = useRef<HTMLDivElement | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (wrapperRef.current && contentRef.current) {
            wrapperRef.current.style.minHeight = `${contentRef.current.scrollHeight}px`;
        }
    }, [value, contentRef, wrapperRef]);

    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
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
        return anchorY > selfY ? Position.Bottom : Position.Top;
    });

    const wrapperProps = {
        onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
            if (isConnectMode) {
                e.stopPropagation();
                return;
            }
            if (isEditing) return;
        },
        onClick: (e: React.MouseEvent<HTMLDivElement>) => {
            if (isConnectMode) {
                const handled = connect.onClick(e);
                if (handled) {
                    return;
                }
            }
            if (locked) {
                e.stopPropagation();
                toast.warning(`Locked by ${lockOwner?.name || 'another user'}`);
                return;
            }
            onClick(e);
        },
        onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => { e.preventDefault(); setMenuPos({ x: e.clientX, y: e.clientY }); setMenuOpen(true); },
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
                    onMouseEnter: () => { setHovered(true); onEnter(); handleMouseEnter(); },
                    onMouseLeave: (e) => {
                        const next = e.relatedTarget as EventTarget | null;
                        const root = (containerRef.current || rootRef.current) as any;
                        if (root && next && next instanceof Node && root.contains(next)) return;
                        setHovered(false);
                        handleMouseLeave();
                        onLeave();
                    },
                }}
                containerRef={containerRef}
                wrapperRef={wrapperRef}
                wrapperClassName={`px-4 py-3 rounded-xl ${hidden ? 'bg-amber-50 text-amber-900' : 'bg-amber-100 text-amber-900'} border-2 ${locked ? 'cursor-not-allowed' : (isEditing ? 'cursor-text' : 'cursor-pointer')} min-w-[220px] max-w-[340px] relative z-10 transition-transform duration-300 ease-out ${isActive ? '-translate-y-[1px] scale-[1.02]' : ''}
            ${hidden ? 'border-amber-200' : 'border-amber-300'}
            data-[selected=true]:ring-2 data-[selected=true]:ring-black data-[selected=true]:ring-offset-2 data-[selected=true]:ring-offset-white`}
                wrapperStyle={{ ...innerScaleStyle, opacity: hidden ? undefined : favorOpacity } as any}
                wrapperProps={wrapperProps as any}
                highlightClassName={`pointer-events-none absolute -inset-1 rounded-xl border-4 ${isActive ? 'border-black opacity-100 scale-100' : 'border-transparent opacity-0 scale-95'} transition-[opacity,transform] duration-300 ease-out z-0`}
            >
                {selected && (
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => { e.stopPropagation(); updateNodeHidden?.(id, !hidden); }}
                        className="group absolute -top-2 -right-2 bg-white border rounded-full shadow hover:bg-stone-50 transition h-5 w-5 flex items-center justify-center"
                        title={hidden ? 'Show' : 'Hide'}
                        style={{ zIndex: 20 }}
                    >
                        <Eye className={`transition-opacity duration-150 ${hidden ? 'opacity-0' : 'opacity-100 group-hover:opacity-0'}`} size={14} />
                        <EyeOff className={`absolute transition-opacity duration-150 ${hidden ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} size={14} />
                    </button>
                )}
                <div
                    ref={contentRef}
                    contentEditable={isEditing && !locked && !hidden}
                    suppressContentEditableWarning
                    onInput={onInput}
                    onMouseDown={onContentMouseDown}
                    onMouseMove={onContentMouseMove}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    onKeyDown={onKeyDown}
                    className={`${pointLike ? 'text-sm text-gray-900' : 'text-xs text-amber-900'} leading-relaxed whitespace-pre-wrap break-words outline-none transition-opacity duration-200 ${isEditing ? 'nodrag' : ''} ${hidden ? 'opacity-0 pointer-events-none select-none' : 'opacity-100'}`}
                    style={{ userSelect: hidden ? 'none' : 'text' }}
                >
                    {value || (pointLike ? 'New point' : 'New mitigation')}
                </div>
                {hidden && (
                    <div className="absolute inset-0 flex 
items-center justify-center pointer-events-none select-none">
                        <div className="text-xs text-amber-600 italic animate-fade-in">Hidden</div>
                    </div>
                )}
                {selected && !hidden && (
                    <div className="mt-1 mb-1 flex items-center gap-2 select-none" style={{ position: 'relative', zIndex: 20 }}>
                        <span className="text-[10px] uppercase tracking-wide text-stone-500">Favor</span>
                        <TooltipProvider>
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Tooltip key={`fv-${i}`}>
                                        <TooltipTrigger asChild>
                                            <button
                                                title={`Set favor to ${i}`}
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={(e) => { e.stopPropagation(); updateNodeFavor?.(id, i as any); }}
                                                className="text-[12px] leading-none"
                                            >
                                                <span className={i <= favor ? 'text-amber-600' : 'text-stone-300'}>★</span>
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-xs">Favor: {i}/5</TooltipContent>
                                    </Tooltip>
                                ))}
                            </div>
                        </TooltipProvider>
                    </div>
                )}
                {!hidden && (
                    <NodeActionPill
                        label="Negate"
                        visible={shouldShowPill}
                        onClick={() => { addNegationBelow(id); hideNow(); setHovered(false); }}
                        colorClass="bg-stone-800"
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                    />
                )}
                {!hidden && (
                    <SideActionPill
                        label="Support"
                        visible={shouldShowPill}
                        onClick={() => { createSupportBelow?.(id); hideNow(); setHovered(false); }}
                        colorClass="bg-stone-700"
                        side="left"
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
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
