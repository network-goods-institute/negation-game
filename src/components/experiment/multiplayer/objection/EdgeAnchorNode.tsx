import React from 'react';
import { Handle, Position, useStore } from '@xyflow/react';

interface EdgeAnchorNodeProps {
    id: string;
    data: { parentEdgeId: string };
}

const EdgeAnchorNode: React.FC<EdgeAnchorNodeProps> = ({ id }) => {
    const targetHandlePosition = useStore((s: any) => {
        const edges: any[] = s.edges || [];
        const incoming = edges.find((e: any) => e.type === 'objection' && e.target === id);
        if (!incoming) return Position.Bottom;
        const objection: any = s.nodeInternals?.get?.(incoming.source);
        const self: any = s.nodeInternals?.get?.(id);
        if (!objection || !self) return Position.Bottom;
        const objectionY = objection.position?.y ?? 0;
        const selfY = self.position?.y ?? 0;
        return objectionY > selfY ? Position.Top : Position.Bottom;
    });
    return (
        <div className="w-2 h-2 opacity-0 pointer-events-none">
            <Handle id="source" type="source" position={Position.Top} className="opacity-0 pointer-events-none" />
            <Handle id="target" type="target" position={targetHandlePosition} className="opacity-0 pointer-events-none" />
        </div>
    );
};

export default EdgeAnchorNode;


