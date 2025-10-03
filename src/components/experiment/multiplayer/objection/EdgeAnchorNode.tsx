import React from 'react';
import { Handle, Position, useStore } from '@xyflow/react';
import { useGraphActions } from '../GraphContext';

interface EdgeAnchorNodeProps {
    id: string;
    data: { parentEdgeId: string };
}

const EdgeAnchorNode: React.FC<EdgeAnchorNodeProps> = ({ id, data }) => {
    const graphActions = useGraphActions() as any;
    const { connectMode, grabMode } = graphActions;

    const handlePositions = useStore((s: any) => {
        const edges: any[] = s.edges || [];
        const incoming = edges.find((e: any) => e.type === 'objection' && e.target === id);
        if (!incoming) return { target: Position.Bottom, source: Position.Top };
        const objection: any = s.nodeInternals?.get?.(incoming.source);
        const self: any = s.nodeInternals?.get?.(id);
        if (!objection || !self) return { target: Position.Bottom, source: Position.Top };
        const objectionY = objection.position?.y ?? 0;
        const selfY = self.position?.y ?? 0;

        return objectionY > selfY
            ? { target: Position.Bottom, source: Position.Bottom }
            : { target: Position.Top, source: Position.Top };
    }, (prev: any, next: any) => {
        const prevIncoming = prev.edges?.find((e: any) => e.type === 'objection' && e.target === id);
        const nextIncoming = next.edges?.find((e: any) => e.type === 'objection' && e.target === id);

        if (!prevIncoming && !nextIncoming) return true;
        if (!prevIncoming || !nextIncoming) return false;

        const prevObjection = prev.nodeInternals?.get?.(prevIncoming.source);
        const nextObjection = next.nodeInternals?.get?.(nextIncoming.source);
        const prevSelf = prev.nodeInternals?.get?.(id);
        const nextSelf = next.nodeInternals?.get?.(id);

        return (
            prevObjection?.position?.y === nextObjection?.position?.y &&
            prevSelf?.position?.y === nextSelf?.position?.y
        );
    });

    const handleClick = (e: React.MouseEvent) => {
        if (!connectMode || grabMode) return;
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

    const isInteractable = connectMode && !grabMode;

    return (
        <div
            className={isInteractable ? "w-4 h-4 opacity-0 pointer-events-auto" : "w-1 h-1 opacity-0 pointer-events-none"}
            onClick={handleClick}
            style={isInteractable ? { pointerEvents: 'all' } : undefined}
        >
            <Handle
                id={`${id}-source-handle`}
                type="source"
                position={handlePositions.source}
                className="opacity-0 pointer-events-none"
                isConnectable={false}
            />
            <Handle
                id={`${id}-incoming-handle`}
                type="target"
                position={handlePositions.target}
                className="opacity-0 pointer-events-none"
                isConnectable={false}
            />
        </div>
    );
};

export default EdgeAnchorNode;


