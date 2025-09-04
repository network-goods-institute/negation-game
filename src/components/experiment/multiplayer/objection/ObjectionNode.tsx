import React, { useEffect, useState } from 'react';
import { Handle, Position, useStore } from '@xyflow/react';
import { useGraphActions } from '../GraphContext';

import { useEditableNode } from '../common/useEditableNode';
import { usePillVisibility } from '../common/usePillVisibility';
import { useConnectableNode } from '../common/useConnectableNode';
import { ContextMenu } from '../common/ContextMenu';
import { toast } from 'sonner';
import { NodeActionPill } from '../common/NodeActionPill';
import { Eye, EyeOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ObjectionNodeProps {
    data: {
        content: string;
        parentEdgeId: string;
    };
    id: string;
    selected?: boolean;
}

const ObjectionNode: React.FC<ObjectionNodeProps> = ({ data, id, selected }) => {
    const { updateNodeContent, updateNodeHidden, updateNodeFavor, addNegationBelow, isConnectingFromNodeId, deleteNode, startEditingNode, stopEditingNode, getEditorsForNode, isLockedForMe, getLockOwner, proxyMode } = useGraphActions() as any;
    const { isEditing, value, contentRef, wrapperRef, onClick, onInput, onKeyDown, onBlur, onFocus } = useEditableNode({
        id,
        content: data.content,
        updateNodeContent,
        startEditingNode,
        stopEditingNode,
        isSelected: selected,
    });
    // Subscribe to global edge changes so this node re-renders when connections change
    const pointLike = useStore((s: any) => (s.edges || []).some((e: any) => (e.type || '') === 'negation' && (e.source === id || e.target === id)));
    const [hovered, setHovered] = useState(false);
    const { pillVisible, handleMouseEnter, handleMouseLeave } = usePillVisibility();
    const rootRef = React.useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (wrapperRef.current && contentRef.current) {
            wrapperRef.current.style.minHeight = `${contentRef.current.scrollHeight}px`;
        }
    }, [value, contentRef, wrapperRef]);

    const locked = isLockedForMe?.(id) || false;
    const lockOwner = getLockOwner?.(id) || null;
    const shouldShowPill = pillVisible && !isEditing && !locked;

    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const connect = useConnectableNode({ id, locked });
    const hidden = (data as any)?.hidden === true;
    const favor = Math.max(1, Math.min(5, (data as any)?.favor ?? 3));
    const favorOpacity = selected || hovered ? 1 : Math.max(0.3, Math.min(1, favor / 5));


    const sourceHandlePosition = useStore((s: any) => {
        const edges: any[] = s.edges || [];
        const obj = edges.find((e: any) => e.type === 'objection' && e.source === id);
        if (!obj) return Position.Top;
        const anchor: any = s.nodeInternals?.get?.(obj.target);
        const self: any = s.nodeInternals?.get?.(id);
        if (!anchor || !self) return Position.Top;
        const anchorY = anchor.position?.y ?? 0;
        const selfY = self.position?.y ?? 0;
        return anchorY > selfY ? Position.Bottom : Position.Top;
    });

    return (
        <>
            <Handle id={`${id}-source-handle`} type="source" position={sourceHandlePosition} className="opacity-0 pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
            <Handle id={`${id}-incoming-handle`} type="target" position={Position.Bottom} className="opacity-0 pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
            <div
                ref={rootRef}
                className="relative inline-block"
                onMouseEnter={() => { setHovered(true); handleMouseEnter(); }}
                onMouseLeave={(e) => {
                    const next = e.relatedTarget as EventTarget | null;
                    const root = rootRef.current;
                    if (root && next && next instanceof Node && root.contains(next)) return;
                    setHovered(false);
                    handleMouseLeave();
                }}
            >
                <div className="relative inline-block">
                    <div
                        ref={wrapperRef}
                        // hover handled on root container to avoid flicker when approaching from bottom
                        onMouseDown={connect.onMouseDown}
                        onMouseUp={connect.onMouseUp}
                        onClick={(e) => {
                            connect.onClick(e as any);
                            if (!locked) { onClick(e); } else { e.stopPropagation(); toast.warning(`Locked by ${lockOwner?.name || 'another user'}`); }
                        }}
                        onContextMenu={(e) => { e.preventDefault(); setMenuPos({ x: e.clientX, y: e.clientY }); setMenuOpen(true); }}
                        data-selected={selected}

                        className={`px-3 py-2 rounded-lg ${pointLike
                            ? (hidden ? 'bg-gray-200 text-gray-600' : 'bg-white text-gray-900')
                            : (hidden ? 'bg-amber-200 text-amber-700' : 'bg-amber-100 text-amber-900')
                            } border-2 ${pointLike ? 'min-w-[200px] max-w-[320px]' : 'min-w-[180px] max-w-[300px]'} relative z-10 ${locked ? 'cursor-not-allowed' : (isEditing ? 'cursor-text' : 'cursor-pointer')} node-drag-handle ring-0
                        ${hidden ? (pointLike ? 'border-gray-300' : 'border-amber-400') : (pointLike ? 'border-stone-200' : 'border-amber-500')}
                        ${isConnectingFromNodeId === id ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white shadow-md' : ''}
                        data-[selected=true]:ring-2 data-[selected=true]:ring-black data-[selected=true]:ring-offset-2 data-[selected=true]:ring-offset-white
                        }`}
                        style={{ opacity: hidden ? undefined : favorOpacity }}
                    >
                        <div className="relative z-10">
                            {isConnectingFromNodeId === id && (
                                <div className="absolute -top-3 right-0 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full shadow">From</div>
                            )}
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
                                onFocus={onFocus}
                                onBlur={onBlur}
                                onKeyDown={onKeyDown}
                                className={`${pointLike ? 'text-sm text-gray-900' : 'text-xs text-amber-900'} leading-relaxed whitespace-pre-wrap break-words outline-none transition-opacity duration-200 ${hidden ? 'opacity-0 pointer-events-none select-none' : 'opacity-100'}`}
                            >
                                {value || (pointLike ? 'New point' : 'New objection')}
                            </div>
                            {hidden && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                                    <div className="text-xs text-amber-600 italic animate-fade-in">Hidden</div>
                                </div>
                            )}
                            {selected && !hidden && (
                                <div className="mt-1 mb-1 flex items-center gap-2 select-none">
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
                                    onClick={() => addNegationBelow(id)}
                                    colorClass="bg-stone-800"
                                    onMouseEnter={handleMouseEnter}
                                    onMouseLeave={handleMouseLeave}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <ContextMenu
                open={menuOpen}
                x={menuPos.x}
                y={menuPos.y}
                onClose={() => setMenuOpen(false)}
                items={[{ label: 'Delete node', danger: true, onClick: () => { if (locked) { toast.warning(`Locked by ${lockOwner?.name || 'another user'}`); } else { deleteNode(id); } } }]}
            />
        </>
    );
};

export default ObjectionNode;
