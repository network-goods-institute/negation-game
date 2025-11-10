import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { useGraphActions } from '../GraphContext';

interface EdgeAnchorNodeProps {
    id: string;
    data: { parentEdgeId: string };
}

const EdgeAnchorNode: React.FC<EdgeAnchorNodeProps> = ({ id, data }) => {
    const graphActions = useGraphActions() as any;
    const { connectMode, grabMode, mindchangeMode } = graphActions;

    const handleClick = (e: React.MouseEvent) => {
        if (!connectMode || grabMode || mindchangeMode) return;
        e.stopPropagation();
        const origin = (graphActions.isConnectingFromNodeId as string | null) || null;
        const parentEdgeId = data?.parentEdgeId as string | undefined;
        if (!parentEdgeId) {
            graphActions.completeConnectToNode?.(id);
            return;
        }
        if (!origin) {
            graphActions.beginConnectFromEdge?.(parentEdgeId);
            return;
        }
        graphActions.completeConnectToEdge?.(parentEdgeId);
    };

    const isInteractable = connectMode && !grabMode && !mindchangeMode;

    return (
        <div
            className={isInteractable ? "w-4 h-4 opacity-0 pointer-events-auto" : "w-1 h-1 opacity-0 pointer-events-none"}
            onClick={handleClick}
            style={isInteractable ? { pointerEvents: 'all' } : undefined}
        >
            <Handle
                id={`${id}-source-handle`}
                type="source"
                position={Position.Top}
                className="opacity-0 pointer-events-none"
                isConnectable={false}
                style={{ left: '50%', top: '0px', transform: 'translate(-50%, 0)' }}
            />
            <Handle
                id={`${id}-incoming-handle`}
                type="target"
                position={Position.Top}
                className="opacity-0 pointer-events-none"
                isConnectable={false}
                style={{ left: '50%', top: '0px', transform: 'translate(-50%, 0)' }}
            />
        </div>
    );
};

export default EdgeAnchorNode;


