import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface NodeHandlesProps {
    id: string;
    collapsedCount: number;
    onExpand: (e: React.MouseEvent) => void;
    onCollapse: (e: React.MouseEvent) => void;
    parentId?: string;
}

export function NodeHandles({ id, collapsedCount, onExpand, onCollapse, parentId }: NodeHandlesProps) {
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
            {parentId && (
                <button
                    onClick={onCollapse}
                    className={cn(
                        'absolute top-0 right-0 transform translate-x-[10px] -translate-y-1/2',
                        'w-8 h-8 bg-background border-2 border-muted-foreground rounded-full',
                        'flex items-center justify-center',
                        'pointer-events-auto z-20 cursor-pointer',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                    )}
                    title="Collapse node"
                >
                    <XIcon className="size-4" />
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