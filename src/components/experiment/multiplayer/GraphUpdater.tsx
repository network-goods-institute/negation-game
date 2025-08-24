import { useEffect } from 'react';
import { useReactFlow, useViewport, Node, Edge } from '@xyflow/react';

interface GraphUpdaterProps {
    nodes: Node[];
    edges: Edge[];
    setNodes: (updater: (nodes: Node[]) => Node[]) => void;
}

export const GraphUpdater: React.FC<GraphUpdaterProps> = ({ nodes, edges, setNodes }) => {
    const rf = useReactFlow();
    const { x: vpX, y: vpY, zoom } = useViewport();

    useEffect(() => {
        // Edges now drive anchor positions directly. Avoid any node repositioning here.
        return;
    }, [nodes, edges, rf, setNodes, vpX, vpY, zoom]);

    return null;
};
