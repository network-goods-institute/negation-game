import React, { useEffect, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useGraphActions } from '../GraphContext';
import { EditorsBadgeRow } from '../EditorsBadgeRow';
import { useEditableNode } from '../common/useEditableNode';
import { useConnectableNode } from '../common/useConnectableNode';
import { ContextMenu } from '../common/ContextMenu';
import { toast } from 'sonner';

interface ObjectionNodeProps {
    data: {
        content: string;
        parentEdgeId: string;
    };
    id: string;
    selected?: boolean;
}

const ObjectionNode: React.FC<ObjectionNodeProps> = ({ data, id, selected }) => {
    const { updateNodeContent, addNegationBelow, isConnectingFromNodeId, deleteNode, startEditingNode, stopEditingNode, getEditorsForNode, isLockedForMe, getLockOwner, proxyMode, beginConnectFromNode, completeConnectToNode, connectMode } = useGraphActions();
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
        }, 180);
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

    return (
        <>
            <Handle id={`${id}-source-handle`} type="source" position={Position.Top} className="opacity-0 pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
            <Handle id={`${id}-incoming-handle`} type="target" position={Position.Bottom} className="opacity-0 pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
            <div className="relative inline-block">
                {selected && (
                    <div
                        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 blur-xl"
                        style={{
                            width: '185%',
                            height: '135%',
                            background: 'radial-gradient(60% 80% at 50% 52%, rgba(251,191,36,0.44), rgba(251,191,36,0) 72%)',
                            zIndex: 0,
                        }}
                    />
                )}
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
                    className={`px-3 py-2 rounded-lg bg-amber-100 border-2 border-amber-500 min-w-[180px] max-w-[300px] relative z-10 ${locked ? 'cursor-not-allowed' : 'cursor-text'} node-drag-handle ${isConnectingFromNodeId === id ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white shadow-md' : ''
                        }`}
                >
                    <div className="relative z-10">
                        {isConnectingFromNodeId === id && (
                            <div className="absolute -top-3 right-0 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full shadow">From</div>
                        )}
                        <EditorsBadgeRow editors={getEditorsForNode?.(id) || []} />
                        {!proxyMode && lockOwner && (
                            <div className="absolute -top-6 left-0 text-xs px-2 py-1 rounded text-white" style={{ backgroundColor: lockOwner.color }}>
                                {lockOwner.name}
                            </div>
                        )}
                        <div
                            ref={contentRef}
                            contentEditable={isEditing && !locked}
                            suppressContentEditableWarning
                            onInput={onInput}
                            onFocus={onFocus}
                            onBlur={onBlur}
                            onKeyDown={onKeyDown}
                            className="text-xs text-amber-900 leading-relaxed whitespace-pre-wrap break-words outline-none"
                        >
                            {value}
                        </div>

                        <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => { e.stopPropagation(); addNegationBelow(id); }}
                            onMouseEnter={() => { cancelHide(); setPillVisible(true); }}
                            onMouseLeave={() => { scheduleHide(); }}
                            className={`absolute left-1/2 -translate-x-1/2 translate-y-2 bottom-[-22px] rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-stone-800 text-white transition-opacity duration-200 ${shouldShowPill ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                        >
                            Negate
                        </button>
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
