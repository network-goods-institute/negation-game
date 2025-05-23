import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { CircleIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

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
            >
                {collapsedCount > 0 && (
                    <span className="text-center w-full text-sm">
                        {collapsedCount}
                    </span>
                )}
            </Handle>
            {parentId && (
                <Handle
                    id={`${id}-outgoing-handle`}
                    type="source"
                    position={Position.Top}
                    className={cn(
                        'pt-1 pb-0.5 px-2 translate-y-[-100%] -translate-x-1/2 size-fit bg-muted text-center border-2 border-b-0 rounded-t-full pointer-events-auto !cursor-pointer'
                    )}
                    onClick={onCollapse}
                >
                    {parentId === 'statement' ? (
                        <CircleIcon className="size-4" />
                    ) : (
                        <XIcon className="size-4" />
                    )}
                </Handle>
            )}
        </>
    );
} 