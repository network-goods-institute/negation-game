import { createContext, useContext } from 'react';

type GraphActions = {
    updateNodeContent: (nodeId: string, content: string) => void;
    autoFocusNodeId?: string | null;
    setAutoFocusNodeId?: (nodeId: string | null) => void;
    updateNodeHidden?: (nodeId: string, hidden: boolean) => void;
    updateNodeFavor?: (nodeId: string, favor: 1 | 2 | 3 | 4 | 5) => void;
    addPointBelow?: (parentNodeId: string) => void;
    preferredEdgeType?: 'support' | 'negation';
    createInversePair: (pointNodeId: string) => void;
    deleteNode: (nodeId: string) => void;
    beginConnectFromNode: (nodeId: string, cursor?: { x: number; y: number }) => void;
    beginConnectFromEdge?: (edgeId: string, cursor?: { x: number; y: number }) => void;
    completeConnectToNode?: (nodeId: string) => void;
    completeConnectToEdge?: (edgeId: string, midX?: number, midY?: number) => void;
    cancelConnect: () => void;
    isConnectingFromNodeId: string | null;
    connectMode?: boolean;
    addObjectionForEdge: (edgeId: string, midX?: number, midY?: number) => void;
    hoveredEdgeId: string | null;
    setHoveredEdge: (edgeId: string | null) => void;
    updateEdgeRelevance?: (edgeId: string, relevance: 1 | 2 | 3 | 4 | 5) => void;
    updateEdgeType?: (edgeId: string, newType: "negation" | "support") => void;
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
    deleteInversePair?: (inverseNodeId: string) => void;
    setPairNodeHeight?: (groupId: string, nodeId: string, height: number) => void;
    pairHeights?: Record<string, number>;
    isAnyNodeEditing?: boolean;
    hoveredNodeId?: string | null;
    setHoveredNodeId?: (nodeId: string | null) => void;
    commitGroupLayout?: (
        groupId: string,
        positions: Record<string, { x: number; y: number }>,
        width: number,
        height: number
    ) => void;
    grabMode?: boolean;
    clearNodeSelection?: () => void;
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

            addPointBelow: () => { },
            preferredEdgeType: 'support',
            createInversePair: () => { },
            deleteNode: () => { },
            beginConnectFromNode: () => { },
            beginConnectFromEdge: () => { },
            completeConnectToNode: () => { },
            cancelConnect: () => { },
            isConnectingFromNodeId: null,
            connectMode: false,
            addObjectionForEdge: () => { },
            hoveredEdgeId: null,
            setHoveredEdge: () => { },
            updateEdgeRelevance: () => { },
            updateEdgeType: () => { },
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
            hoveredNodeId: null,
            setHoveredNodeId: () => { },
            grabMode: false,
            clearNodeSelection: () => { },
        } as GraphActions;
    }
    return ctx;
};

