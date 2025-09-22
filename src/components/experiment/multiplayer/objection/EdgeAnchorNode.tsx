import React from 'react';
import { Handle, Position, useStore } from '@xyflow/react';

interface EdgeAnchorNodeProps {
    id: string;
    data: { parentEdgeId: string };
}

const EdgeAnchorNode: React.FC<EdgeAnchorNodeProps> = ({ id }) => {
    const handlePositions = useStore((s: any) => {
        const edges: any[] = s.edges || [];
        const incoming = edges.find((e: any) => e.type === 'objection' && e.target === id);
        if (!incoming) return { target: Position.Bottom, source: Position.Top };
        const objection: any = s.nodeInternals?.get?.(incoming.source);
        const self: any = s.nodeInternals?.get?.(id);
        if (!objection || !self) return { target: Position.Bottom, source: Position.Top };
        const objectionY = objection.position?.y ?? 0;
        const selfY = self.position?.y ?? 0;

        // When objection is below anchor: target receives from bottom, source connects to bottom
        // When objection is above anchor: target receives from top, source connects to top
        return objectionY > selfY
            ? { target: Position.Bottom, source: Position.Bottom }
            : { target: Position.Top, source: Position.Top };
    }, (prev: any, next: any) => {
        // Re-run when edges or node positions change
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

    return (
        <div className="w-1 h-1 opacity-0 pointer-events-none">
            <Handle
                id="source"
                type="source"
                position={handlePositions.source}
                className="opacity-0 pointer-events-none"
            />
            <Handle
                id="target"
                type="target"
                position={handlePositions.target}
                className="opacity-0 pointer-events-none"
            />
        </div>
    );
};

export default EdgeAnchorNode;


