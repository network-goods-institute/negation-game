import { createContext, useContext } from 'react';

type GraphActions = {
    updateNodeContent: (nodeId: string, content: string) => void;
    addNegationBelow: (parentNodeId: string) => void;
    deleteNode: (nodeId: string) => void;
    beginConnectFromNode: (nodeId: string) => void;
    cancelConnect: () => void;
    isConnectingFromNodeId: string | null;
    addObjectionForEdge: (edgeId: string, midX?: number, midY?: number) => void;
    hoveredEdgeId: string | null;
    setHoveredEdge: (edgeId: string | null) => void;
    updateEdgeAnchorPosition: (edgeId: string, x: number, y: number) => void;
    startEditingNode?: (nodeId: string) => void;
    stopEditingNode?: (nodeId: string) => void;
    getEditorsForNode?: (nodeId: string) => { name: string; color: string }[];
    lockNode?: (nodeId: string, kind: 'edit' | 'drag') => void;
    unlockNode?: (nodeId: string) => void;
    isLockedForMe?: (nodeId: string) => boolean;
    getLockOwner?: (nodeId: string) => { name: string; color: string; kind: 'edit' | 'drag' } | null;
    proxyMode?: boolean;
};

const GraphContext = createContext<GraphActions | null>(null);

export const GraphProvider = GraphContext.Provider;

export const useGraphActions = () => {
    const ctx = useContext(GraphContext);
    if (!ctx) {
        return {
            updateNodeContent: () => { },
            addNegationBelow: () => { },
            deleteNode: () => { },
            beginConnectFromNode: () => { },
            cancelConnect: () => { },
            isConnectingFromNodeId: null,
            addObjectionForEdge: () => { },
            hoveredEdgeId: null,
            setHoveredEdge: () => { },
            updateEdgeAnchorPosition: () => { },
            startEditingNode: () => { },
            stopEditingNode: () => { },
            getEditorsForNode: () => [],
            lockNode: () => { },
            unlockNode: () => { },
            isLockedForMe: () => false,
            getLockOwner: () => null,
            proxyMode: false,
        } as GraphActions;
    }
    return ctx;
};