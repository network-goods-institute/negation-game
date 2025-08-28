import React, { useEffect, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useGraphActions } from '../GraphContext';
import { EditorsBadgeRow } from '../EditorsBadgeRow';
import { useEditableNode } from '../common/useEditableNode';
import { useConnectableNode } from '../common/useConnectableNode';
import { ContextMenu } from '../common/ContextMenu';
import { toast } from 'sonner';
import { NodeActionPill } from '../common/NodeActionPill';
import { Eye, EyeOff } from 'lucide-react';

interface ObjectionNodeProps {
    data: {
        content: string;
        parentEdgeId: string;
    };
    id: string;
    selected?: boolean;
}

const ObjectionNode: React.FC<ObjectionNodeProps> = ({ data, id, selected }) => {
    const { updateNodeContent, updateNodeHidden, updateNodeFavor, addNegationBelow, isConnectingFromNodeId, deleteNode, startEditingNode, stopEditingNode, getEditorsForNode, isLockedForMe, getLockOwner, proxyMode, beginConnectFromNode, completeConnectToNode, connectMode, importanceSim, selectedEdgeId } = useGraphActions() as any;
    const { isEditing, value, contentRef, wrapperRef, onClick, onInput, onKeyDown, onBlur, onFocus } = useEditableNode({
        id,
        content: data.content,
        updateNodeContent,
        startEditingNode,
        stopEditingNode,
        isSelected: selected,
    });
    const [hovered, setHovered] = useState(false);
    const [pillVisible, setPillVisible] = useState(false);
    const hideTimerRef = useRef<number | null>(null);

    useEffect(() => {
        if (wrapperRef.current && contentRef.current) {
            wrapperRef.current.style.minHeight = `${contentRef.current.scrollHeight}px`;
        }
    }, [value, contentRef, wrapperRef]);

    useEffect(() => {
        return () => {
            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
                hideTimerRef.current = null;
            }
        };
    }, []);

    const scheduleHide = () => {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = window.setTimeout(() => {
            setPillVisible(false);
        }, 400);
    };

    const cancelHide = () => {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }
    };

    const locked = isLockedForMe?.(id) || false;
    const lockOwner = getLockOwner?.(id) || null;
    const shouldShowPill = pillVisible && !isEditing && !locked;

    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const connect = useConnectableNode({ id, locked });
    const hidden = (data as any)?.hidden === true;

    return (
        <>
            <Handle id={`${id}-source-handle`} type="source" position={Position.Top} className="opacity-0 pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
            <Handle id={`${id}-incoming-handle`} type="target" position={Position.Bottom} className="opacity-0 pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
            <div className="relative inline-block">
                <div
                    ref={wrapperRef}
                    onMouseEnter={() => { setHovered(true); cancelHide(); setPillVisible(true); }}
                    onMouseLeave={() => { setHovered(false); scheduleHide(); }}
                    onMouseDown={connect.onMouseDown}
                    onMouseUp={connect.onMouseUp}
                    onClick={(e) => {
                        connect.onClick(e as any);
                        if (!locked) { onClick(e); } else { e.stopPropagation(); toast.warning(`Locked by ${lockOwner?.name || 'another user'}`); }
                    }}
                    onContextMenu={(e) => { e.preventDefault(); setMenuPos({ x: e.clientX, y: e.clientY }); setMenuOpen(true); }}
                    className={`px-3 py-2 rounded-lg bg-amber-100 border-2 min-w-[180px] max-w-[300px] relative z-10 ${locked ? 'cursor-not-allowed' : (isEditing ? 'cursor-text' : 'cursor-pointer')} node-drag-handle ${isConnectingFromNodeId === id ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white shadow-md' : ''}
                        ${selected ? 'border-black' : 'border-amber-500'}
                        }`}
                >
                    <div className="relative z-10">
                        {isConnectingFromNodeId === id && (
                            <div className="absolute -top-3 right-0 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full shadow">From</div>
                        )}
                        <EditorsBadgeRow editors={getEditorsForNode?.(id) || []} />
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
                        {!proxyMode && lockOwner && (
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs px-2 py-1 rounded text-white shadow" style={{ backgroundColor: lockOwner.color }}>
                                {lockOwner.name}
                            </div>
                        )}
                        <div
                            ref={contentRef}
                            contentEditable={isEditing && !locked && !hidden}
                            suppressContentEditableWarning
                            onInput={onInput}
                            onFocus={onFocus}
                            onBlur={onBlur}
                            onKeyDown={onKeyDown}
                            className="text-xs text-amber-900 leading-relaxed whitespace-pre-wrap break-words outline-none"
                        >
                            {value}
                        </div>
                        {hidden && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                                <div className="text-xs text-amber-700 italic animate-fade-in">Hidden</div>
                            </div>
                        )}
                        {importanceSim && selected && !selectedEdgeId && (
                            <div className="mt-1 mb-1 flex items-center gap-1 select-none" title="Set favor (speed). 1 = low, 5 = high.">
                                {[1,2,3,4,5].map((i) => (
                                    <button key={i} title={`Set favor to ${i}`} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); updateNodeFavor?.(id, i as any); }} className="text-[12px] leading-none">
                                        <span className={i <= ((data as any)?.favor ?? 3) ? 'text-amber-500' : 'text-stone-300'}>★</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {!hidden && (
                        <NodeActionPill
                            label="Negate"
                            visible={shouldShowPill}
                            onClick={() => addNegationBelow(id)}
                            colorClass="bg-stone-800"
                            onMouseEnter={() => { cancelHide(); setPillVisible(true); }}
                            onMouseLeave={() => { scheduleHide(); }}
                        />
                        )}
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
