import { createContext, useContext } from 'react';

type GraphActions = {
    globalMarketOverlays?: boolean;
    currentUserId?: string;
    updateNodeContent: (nodeId: string, content: string) => void;
    updateNodePosition?: (nodeId: string, x: number, y: number) => void;
    ensureEdgeAnchor?: (anchorId: string, parentEdgeId: string, x: number, y: number) => void;
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
    mindchangeMode?: boolean;
    mindchangeEdgeId?: string | null;
    mindchangeNextDir?: 'forward' | 'backward' | null;
    addObjectionForEdge: (edgeId: string, midX?: number, midY?: number) => void;
    hoveredEdgeId: string | null;
    setHoveredEdge: (edgeId: string | null) => void;
    updateEdgeRelevance?: (edgeId: string, relevance: 1 | 2 | 3 | 4 | 5) => void;
    updateEdgeType?: (edgeId: string, newType: "negation" | "support") => void;
    selectedEdgeId?: string | null;
    setSelectedEdge?: (edgeId: string | null) => void;
    overlayActiveEdgeId?: string | null;
    setOverlayActiveEdge?: (edgeId: string | null) => void;
    updateEdgeAnchorPosition: (edgeId: string, x: number, y: number, force?: boolean) => void;
    startEditingNode?: (nodeId: string) => void;
    stopEditingNode?: (nodeId: string) => void;
    startEditingNodeProgrammatically?: (nodeId: string) => void;
    getEditorsForNode?: (nodeId: string) => { name: string; color: string }[];
    lockNode?: (nodeId: string, kind: 'edit' | 'drag') => void;
    unlockNode?: (nodeId: string) => void;
    isLockedForMe?: (nodeId: string) => boolean;
    getLockOwner?: (nodeId: string) => { name: string; color: string; kind: 'edit' | 'drag' } | null;
    markNodeActive?: (nodeId: string) => void;
    proxyMode?: boolean;
    undo?: () => void;
    redo?: () => void;
    stopCapturing?: () => void;
    addNodeAtPosition?: (type: 'point' | 'statement' | 'objection' | 'comment', x: number, y: number) => string;
    updateNodeType?: (nodeId: string, newType: 'point' | 'statement' | 'objection' | 'comment') => void;
    openTypeSelector?: (nodeId: string) => void;
    deleteInversePair?: (inverseNodeId: string) => void;
    duplicateNodeWithConnections?: (nodeId: string, offset?: { x?: number; y?: number }) => string | null;
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
    blurNodesImmediately?: () => void;
    beginMindchangeSelection?: () => void; // deprecated
    beginMindchangeOnEdge?: (edgeId: string) => void;
    cancelMindchangeSelection?: () => void;
    setMindchangeNextDir?: (dir: 'forward' | 'backward' | null) => void;
    setMindchange?: (edgeId: string, params: { forward?: number; backward?: number }) => Promise<void>;
    getMindchangeBreakdown?: (edgeId: string) => Promise<{
        forward: Array<{ userId: string; username: string; value: number }>;
        backward: Array<{ userId: string; username: string; value: number }>;
    }>;
};

const GraphContext = createContext<GraphActions | null>(null);

export const GraphProvider = GraphContext.Provider;

export const useGraphActions = () => {
    const ctx = useContext(GraphContext);
    if (!ctx) {
        return {
            globalMarketOverlays: false,
            currentUserId: undefined,
            updateNodeContent: () => { },
            updateNodePosition: () => { },
            ensureEdgeAnchor: () => { },
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
            mindchangeMode: false,
            mindchangeEdgeId: null,
            mindchangeNextDir: null,
            addObjectionForEdge: () => { },
            hoveredEdgeId: null,
            setHoveredEdge: () => { },
            updateEdgeRelevance: () => { },
            updateEdgeType: () => { },
            selectedEdgeId: null,
            setSelectedEdge: () => { },
            overlayActiveEdgeId: null,
            setOverlayActiveEdge: () => { },
            updateEdgeAnchorPosition: () => { },
            startEditingNode: () => { },
            stopEditingNode: () => { },
            startEditingNodeProgrammatically: () => { },
            getEditorsForNode: () => [],
            lockNode: () => { },
            unlockNode: () => { },
            isLockedForMe: () => false,
            getLockOwner: () => null,
            markNodeActive: () => { },
            proxyMode: false,
            undo: () => { },
            redo: () => { },
            stopCapturing: () => { },
            hoveredNodeId: null,
            setHoveredNodeId: () => { },
            grabMode: false,
            clearNodeSelection: () => { },
            blurNodesImmediately: () => { },
            openTypeSelector: () => { },
            beginMindchangeSelection: () => { },
            beginMindchangeOnEdge: () => { },
            cancelMindchangeSelection: () => { },
            setMindchangeNextDir: () => { },
        } as GraphActions;
    }
    return ctx;
};
