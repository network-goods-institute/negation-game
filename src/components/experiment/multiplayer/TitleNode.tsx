import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useGraphActions } from './GraphContext';
import { usePillVisibility } from './common/usePillVisibility';
import { EditorsBadgeRow } from './EditorsBadgeRow';
import { NodeActionPill } from './common/NodeActionPill';
import { Eye, EyeOff, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

interface TitleNodeProps {
    data: {
        content: string;
        editedBy?: string;
    };
    id: string;
    selected?: boolean;
}

export const TitleNode: React.FC<TitleNodeProps> = ({ data, id, selected }) => {
    const { updateNodeHidden, updateNodeFavor, addPointBelow, isConnectingFromNodeId, deleteNode, getEditorsForNode, isLockedForMe, getLockOwner, proxyMode, beginConnectFromNode, completeConnectToNode, connectMode } = useGraphActions() as any;

    const [hovered, setHovered] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    const { pillVisible, handleMouseEnter, handleMouseLeave } = usePillVisibility();

    const locked = isLockedForMe?.(id) || false;
    const lockOwner = getLockOwner?.(id) || null;
    const shouldShowPill = pillVisible && !locked;
    const hidden = (data as any)?.hidden === true;


    return (
        <>
            <Handle id={`${id}-source-handle`} type="source" position={Position.Top} className="opacity-0 pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
            <Handle id={`${id}-incoming-handle`} type="target" position={Position.Bottom} className="opacity-0 pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
            <div className="relative inline-block">
                <div
                    onMouseEnter={() => { setHovered(true); handleMouseEnter(); }}
                    onMouseLeave={() => { setHovered(false); handleMouseLeave(); }}
                    onMouseDown={(e) => { if (!locked) beginConnectFromNode?.(id); }}
                    onMouseUp={(e) => { if (!locked) completeConnectToNode?.(id); }}
                    onClick={(e) => { if (locked) { e.stopPropagation(); toast.warning(`Locked by ${lockOwner?.name || 'another user'}`); } }}
                    onContextMenu={(e) => { e.preventDefault(); setMenuPos({ x: e.clientX, y: e.clientY }); setMenuOpen(true); }}
                    data-selected={selected}
                    className={`px-4 py-3 rounded-lg ${hidden ? 'bg-blue-100 text-blue-700' : 'bg-blue-50 text-blue-900'} border-2 min-w-[220px] max-w-[360px] relative z-10 ${locked ? 'cursor-not-allowed' : 'cursor-pointer'} ring-0
            ${hidden ? 'border-blue-300' : 'border-blue-200'}
            ${isConnectingFromNodeId === id ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white shadow-md' : ''}
            data-[selected=true]:ring-2 data-[selected=true]:ring-black data-[selected=true]:ring-offset-2 data-[selected=true]:ring-offset-white
            `}
                    style={{ opacity: hidden ? undefined : 1 }}
                >
                    <div className="relative z-10">
                        {!hidden && <HelpCircle className="absolute -top-1 -left-1 text-blue-600" size={16} />}
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
                        {isConnectingFromNodeId === id && (
                            <div className="absolute -top-3 right-0 text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded-full shadow">From</div>
                        )}
                        {/* Immutable title content */}
                        <div className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${hidden ? 'opacity-0 pointer-events-none select-none' : 'opacity-100 text-green-900'} ml-5`}>
                            {data.content}
                        </div>
                        {hidden && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                                <div className="text-sm text-stone-500 italic animate-fade-in">Hidden</div>
                            </div>
                        )}
                        <EditorsBadgeRow editors={getEditorsForNode?.(id) || []} />
                        {!hidden && (
                            <NodeActionPill
                                label="Make option"
                                visible={shouldShowPill}
                                onClick={() => addPointBelow?.(id)}
                                colorClass="bg-blue-700"
                                onMouseEnter={handleMouseEnter}
                                onMouseLeave={handleMouseLeave}
                            />
                        )}
                    </div>
                </div>
            </div>
            {/* Title node is immutable; no delete option */}
        </>
    );
};

export default TitleNode;


