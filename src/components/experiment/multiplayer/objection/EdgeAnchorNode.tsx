import React from 'react';
import { Handle, Position } from '@xyflow/react';

interface EdgeAnchorNodeProps {
    id: string;
    data: { parentEdgeId: string };
}

const EdgeAnchorNode: React.FC<EdgeAnchorNodeProps> = () => {
    return (
        <div className="w-2 h-2 opacity-0 pointer-events-none">
            <Handle id="source" type="source" position={Position.Top} className="opacity-0 pointer-events-none" />
            <Handle id="target" type="target" position={Position.Bottom} className="opacity-0 pointer-events-none" />
        </div>
    );
};

export default EdgeAnchorNode;


