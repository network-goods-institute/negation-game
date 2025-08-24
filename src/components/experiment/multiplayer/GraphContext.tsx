import React, { createContext, useContext } from 'react';

type GraphActions = {
    updateNodeContent: (nodeId: string, content: string) => void;
    addNegationBelow: (parentNodeId: string) => void;
    beginConnectFromNode: (nodeId: string) => void;
    cancelConnect: () => void;
    isConnectingFromNodeId: string | null;
    addObjectionForEdge: (edgeId: string, midX?: number, midY?: number) => void;
    hoveredEdgeId: string | null;
    setHoveredEdge: (edgeId: string | null) => void;
    updateEdgeAnchorPosition: (edgeId: string, x: number, y: number) => void;
};

const GraphContext = createContext<GraphActions | null>(null);

export const GraphProvider = GraphContext.Provider;

export const useGraphActions = () => {
    const ctx = useContext(GraphContext);
    if (!ctx) {
        return {
            updateNodeContent: () => { },
            addNegationBelow: () => { },
            beginConnectFromNode: () => { },
            cancelConnect: () => { },
            isConnectingFromNodeId: null,
            addObjectionForEdge: () => { },
            hoveredEdgeId: null,
            setHoveredEdge: () => { },
            updateEdgeAnchorPosition: () => { },
        } as GraphActions;
    }
    return ctx;
};


