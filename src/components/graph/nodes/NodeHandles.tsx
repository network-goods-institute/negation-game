import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { XIcon, TrashIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface NodeHandlesProps {
    id: string;
    collapsedCount: number;
    onExpand: (e: React.MouseEvent) => void;
    onCollapse: (e: React.MouseEvent) => void;
    parentId?: string;
}

export function NodeHandles({ id, collapsedCount, onExpand, onCollapse, parentId }: NodeHandlesProps) {
    const reactFlow = useReactFlow();

    const handleDeleteStandaloneNode = (e: React.MouseEvent) => {
        e.stopPropagation();
        reactFlow.deleteElements({ nodes: [{ id }] });
        if (typeof (reactFlow as any).markAsModified === 'function') {
            (reactFlow as any).markAsModified();
        }
    };

    return (
        <>
            <Handle
                id={`${id}-incoming-handle`}
                type="target"
                isConnectableStart={false}
                position={Position.Bottom}
                className={cn(
                    'pb-0.5 px-4 translate-y-[100%] -translate-x-1/2 size-fit bg-muted text-center border-2 border-t-0 rounded-b-full pointer-events-auto cursor-pointer',
                    collapsedCount === 0 && 'invisible'
                )}
                onClick={onExpand}
                title={collapsedCount > 0 ? `Expand ${collapsedCount} hidden negations` : 'Expand negations'}
            >
                {collapsedCount > 0 && (
                    <span className="text-center w-full text-sm">
                        {collapsedCount}
                    </span>
                )}
            </Handle>
            {parentId ? (
                <button
                    onClick={onCollapse}
                    className={cn(
                        'absolute -top-2 -right-2 transform translate-x-[10px] -translate-y-1/2',
                        'w-8 h-8 bg-background border-2 border-muted-foreground rounded-full',
                        'flex items-center justify-center',
                        'pointer-events-auto z-20 cursor-pointer',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                    )}
                    title="Collapse node"
                >
                    <XIcon className="size-4" />
                </button>
            ) : (
                <button
                    onClick={handleDeleteStandaloneNode}
                    className={cn(
                        'absolute -top-2 -right-2 transform translate-x-[10px] -translate-y-1/2',
                        'w-8 h-8 bg-background border-2 border-destructive rounded-full',
                        'flex items-center justify-center',
                        'pointer-events-auto z-20 cursor-pointer',
                        'focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2',
                        'hover:bg-destructive hover:text-destructive-foreground'
                    )}
                    title="Remove point from graph"
                >
                    <TrashIcon className="size-4" />
                </button>
            )}
            <Handle
                id={`${id}-source-handle`}
                type="source"
                position={Position.Top}
                className="opacity-0 pointer-events-none"
                isConnectable={true}
                isConnectableStart={true}
                isConnectableEnd={true}
            />
        </>
    );
} 