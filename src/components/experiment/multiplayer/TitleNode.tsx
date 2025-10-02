import React from 'react';
import { Position } from '@xyflow/react';
import { useGraphActions } from './GraphContext';
import { NodeActionPill } from './common/NodeActionPill';
import { toast } from 'sonner';
import { useNodeChrome } from './common/useNodeChrome';
import { NodeShell } from './common/NodeShell';
import { useForceHidePills } from './common/useForceHidePills';

interface TitleNodeProps {
    data: {
        content: string;
        editedBy?: string;
    };
    id: string;
    selected?: boolean;
}

export const TitleNode: React.FC<TitleNodeProps> = ({ data, id, selected }) => {
    const {
        updateNodeContent,
        updateNodeHidden,
        addPointBelow,
        isConnectingFromNodeId,
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
        hidePillWhileEditing: false,
        autoFocus: {
            createdAt: data.editedBy ? Date.now() : undefined,
            isQuestionNode: true,
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

    const { hovered, onMouseEnter, onMouseLeave } = hover;
    const { handleMouseEnter, handleMouseLeave, hideNow, shouldShowPill } = pill;

    const forceHidePills = useForceHidePills({
        id,
        hidePill: hideNow,
        onPillMouseLeave: handleMouseLeave,
        onHoverLeave: onMouseLeave,
    });

    return (
        <NodeShell
            handles={[
                {
                    id: `${id}-source-handle`,
                    type: 'source',
                    position: Position.Top,
                    style: { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' },
                },
                {
                    id: `${id}-incoming-handle`,
                    type: 'target',
                    position: Position.Bottom,
                    style: { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' },
                },
            ]}
            wrapperRef={wrapperRef}
            wrapperClassName={`px-4 py-3 rounded-lg ${hidden ? 'bg-blue-100 text-blue-700' : 'bg-blue-50 text-blue-900'} ${isActive ? 'border-0' : 'border-2'} min-w-[220px] max-w-[360px] relative z-10 ${cursorClass} transition-transform duration-300 ease-out ${isActive ? '-translate-y-[1px] scale-[1.02]' : ''}
            ${isActive ? '' : (hidden ? 'border-blue-300' : 'border-blue-200')}
            ${isConnectingFromNodeId === id ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white shadow-md' : ''}
            data-[selected=true]:ring-2 data-[selected=true]:ring-black data-[selected=true]:ring-offset-2 data-[selected=true]:ring-offset-white`}
            wrapperStyle={innerScaleStyle as any}
            wrapperProps={{
                onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => {
                    e.stopPropagation();
                    onMouseEnter();
                    handleMouseEnter();
                },
                onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => {
                    e.stopPropagation();
                    onMouseLeave();
                    handleMouseLeave();
                },
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
                onDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => {
                    // Prevent double-click from bubbling up to canvas (which would spawn new nodes)
                    e.stopPropagation();
                    e.preventDefault();
                },
                'data-selected': selected,
            } as any}
            highlightClassName={`pointer-events-none absolute -inset-1 rounded-lg border-4 ${isActive ? 'border-blue-600 opacity-100 scale-100' : 'border-transparent opacity-0 scale-95'} transition-[opacity,transform] duration-300 ease-out z-0`}
        >
            {isConnectingFromNodeId === id && (
                <div className="absolute -top-3 right-0 text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded-full shadow">From</div>
            )}
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
                className={`text-sm leading-relaxed whitespace-pre-wrap break-words outline-none transition-opacity duration-200 ${isEditing ? 'nodrag' : ''} ${hidden ? 'opacity-0 pointer-events-none select-none' : 'opacity-100 text-blue-900'}`}
                style={{ userSelect: hidden ? 'none' : 'text' }}
            >
                {value}
            </div>
            {hidden && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                    <div className="text-sm text-stone-500 italic animate-fade-in">Hidden</div>
                </div>
            )}
            {!hidden && (
                <NodeActionPill
                    label="Add Option"
                    visible={shouldShowPill}
                    onClick={() => { addPointBelow?.(id); forceHidePills(); }}
                    colorClass="bg-blue-600"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onForceHide={forceHidePills}
                />
            )}
        </NodeShell>
    );
};

export default TitleNode;
