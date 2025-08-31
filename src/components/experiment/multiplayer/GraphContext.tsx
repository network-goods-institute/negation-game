import { createContext, useContext } from 'react';

type GraphActions = {
    updateNodeContent: (nodeId: string, content: string) => void;
    autoFocusNodeId?: string | null;
    setAutoFocusNodeId?: (nodeId: string | null) => void;
    updateNodeHidden?: (nodeId: string, hidden: boolean) => void;
    updateNodeFavor?: (nodeId: string, favor: 1 | 2 | 3 | 4 | 5) => void;
    addNegationBelow: (parentNodeId: string) => void;
    addPointBelow?: (parentNodeId: string) => void;
    deleteNode: (nodeId: string) => void;
    beginConnectFromNode: (nodeId: string) => void;
    completeConnectToNode?: (nodeId: string) => void;
    cancelConnect: () => void;
    isConnectingFromNodeId: string | null;
    connectMode?: boolean;
    addObjectionForEdge: (edgeId: string, midX?: number, midY?: number) => void;
    hoveredEdgeId: string | null;
    setHoveredEdge: (edgeId: string | null) => void;
    updateEdgeRelevance?: (edgeId: string, relevance: 1 | 2 | 3 | 4 | 5) => void;
    selectedEdgeId?: string | null;
    setSelectedEdge?: (edgeId: string | null) => void;
    updateEdgeAnchorPosition: (edgeId: string, x: number, y: number) => void;
    startEditingNode?: (nodeId: string) => void;
    stopEditingNode?: (nodeId: string) => void;
    startEditingNodeProgrammatically?: (nodeId: string) => void;
    getEditorsForNode?: (nodeId: string) => { name: string; color: string }[];
    lockNode?: (nodeId: string, kind: 'edit' | 'drag') => void;
    unlockNode?: (nodeId: string) => void;
    isLockedForMe?: (nodeId: string) => boolean;
    getLockOwner?: (nodeId: string) => { name: string; color: string; kind: 'edit' | 'drag' } | null;
    proxyMode?: boolean;
    undo?: () => void;
    redo?: () => void;
    addNodeAtPosition?: (type: 'point' | 'statement' | 'title' | 'objection', x: number, y: number) => string;
    updateNodeType?: (nodeId: string, newType: 'point' | 'statement' | 'title' | 'objection') => void;
};

const GraphContext = createContext<GraphActions | null>(null);

export const GraphProvider = GraphContext.Provider;

export const useGraphActions = () => {
    const ctx = useContext(GraphContext);
    if (!ctx) {
        return {
            updateNodeContent: () => { },
            updateNodeHidden: () => { },
            updateNodeFavor: () => { },
            addNegationBelow: () => { },
            addPointBelow: () => { },
            addQuestionBelow: () => { },
            deleteNode: () => { },
            beginConnectFromNode: () => { },
            completeConnectToNode: () => { },
            cancelConnect: () => { },
            isConnectingFromNodeId: null,
            connectMode: false,
            addObjectionForEdge: () => { },
            hoveredEdgeId: null,
            setHoveredEdge: () => { },
            updateEdgeRelevance: () => { },
            selectedEdgeId: null,
            setSelectedEdge: () => { },
            updateEdgeAnchorPosition: () => { },
            startEditingNode: () => { },
            stopEditingNode: () => { },
            startEditingNodeProgrammatically: () => { },
            getEditorsForNode: () => [],
            lockNode: () => { },
            unlockNode: () => { },
            isLockedForMe: () => false,
            getLockOwner: () => null,
            proxyMode: false,
            undo: () => { },
            redo: () => { },
        } as GraphActions;
    }
    return ctx;
};
