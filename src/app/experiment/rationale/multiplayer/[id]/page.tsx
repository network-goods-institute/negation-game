'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { ReactFlowProvider, } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '@/queries/users/useUser';
import { LoadingState } from '@/components/ui/LoadingState';
import { AuthGate } from '@/components/auth/AuthGate';
import { useUserColor } from '@/hooks/experiment/multiplayer/useUserColor';
import { useKeyboardShortcuts } from '@/hooks/experiment/multiplayer/useKeyboardShortcuts';
import { useInitialGraph } from '@/hooks/experiment/multiplayer/useInitialGraph';
import { useNodeDragHandlers } from '@/hooks/experiment/multiplayer/useNodeDragHandlers';
import { MultiplayerHeader } from '@/components/experiment/multiplayer/MultiplayerHeader';
import { ToolsBar } from '@/components/experiment/multiplayer/ToolsBar';
import { GraphCanvas } from '@/components/experiment/multiplayer/GraphCanvas';
import { useYjsMultiplayer } from '@/hooks/experiment/multiplayer/useYjsMultiplayer';
import { useMultiplayerCursors } from '@/hooks/experiment/multiplayer/useMultiplayerCursors';
import { useMultiplayerEditing } from '@/hooks/experiment/multiplayer/useMultiplayerEditing';
import { useLeaderElection } from '@/hooks/experiment/multiplayer/useLeaderElection';
import { createGraphChangeHandlers } from '@/utils/experiment/multiplayer/graphSync';
import { GraphProvider } from '@/components/experiment/multiplayer/GraphContext';
import { deterministicEdgeId } from '@/utils/experiment/multiplayer/graphSync';
import { GraphUpdater } from '@/components/experiment/multiplayer/GraphUpdater';
import { toast } from 'sonner';
import {
    createUpdateNodeContent,
    createDeleteNode,
    createAddNegationBelow,
    createAddObjectionForEdge,
    createUpdateEdgeAnchorPosition
} from '@/utils/experiment/multiplayer/graphOperations';

export default function MultiplayerRationaleDetailPage() {
    const routeParams = useParams<{ id: string }>();
    const { authenticated, ready, login } = usePrivy();
    const { data: user, isLoading: isUserLoading, isFetching: isUserFetching } = useUser();

    const [connectMode, setConnectMode] = useState<boolean>(false);
    const [connectAnchorId, setConnectAnchorId] = useState<string | null>(null);
    const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
    const localOriginRef = useRef<object>({});
    const lastAddRef = useRef<Record<string, number>>({});

    const userColor = useUserColor(user?.id);
    const initialGraph = useInitialGraph();

    const username = user?.username || 'Anonymous';
    const userId = (user as any)?.id || '';

    const roomName = useMemo(() => {
        const id = typeof routeParams?.id === 'string' ? routeParams.id : String(routeParams?.id || '');
        return `rationale:${id}`;
    }, [routeParams]);

    const {
        nodes,
        edges,
        setNodes,
        setEdges,
        provider,
        ydoc,
        yNodesMap,
        yEdgesMap,
        yTextMap,
        syncYMapFromArray,
        connectionError,
        isConnected,
        isSaving,
        forceSave,
        nextSaveTime,
        undo,
        redo,
        canUndo,
        canRedo,
    } = useYjsMultiplayer({
        roomName,
        initialNodes: initialGraph?.nodes || [],
        initialEdges: initialGraph?.edges || [],
        enabled: ready && !isUserLoading && !isUserFetching && Boolean(initialGraph),
        localOrigin: localOriginRef.current,
    });

    const { isLeader } = useLeaderElection(provider, userId);

    const cursors = useMultiplayerCursors({ provider, userId, username, userColor, isLeader });
    const { startEditing, stopEditing, getEditorsForNode, lockNode, unlockNode, isLockedForMe, getLockOwner } = useMultiplayerEditing({ provider, userId, username, userColor, isLeader });

    const { handleNodeDragStart, handleNodeDragStop } = useNodeDragHandlers({
        lockNode,
        unlockNode,
        isLockedForMe,
        getLockOwner
    });

    const updateNodeContent = createUpdateNodeContent(
        yTextMap,
        ydoc,
        isLeader,
        localOriginRef.current,
        setNodes
    );

    const deleteNode = createDeleteNode(
        nodes,
        edges,
        yNodesMap,
        yEdgesMap,
        yTextMap,
        ydoc,
        isLeader,
        localOriginRef.current,
        setNodes,
        setEdges,
        isLockedForMe,
        getLockOwner
    );

    const addNegationBelow = createAddNegationBelow(
        nodes,
        yNodesMap,
        yEdgesMap,
        ydoc,
        isLeader,
        localOriginRef.current,
        lastAddRef,
        setNodes,
        setEdges,
        isLockedForMe,
        getLockOwner
    );

    const addObjectionForEdge = createAddObjectionForEdge(
        nodes,
        edges,
        yNodesMap,
        yEdgesMap,
        ydoc,
        isLeader,
        localOriginRef.current,
        setNodes,
        setEdges,
        isLockedForMe,
        getLockOwner
    );

    const updateEdgeAnchorPosition = createUpdateEdgeAnchorPosition(setNodes);

    const { onNodesChange, onEdgesChange, onConnect, commitNodePositions } = createGraphChangeHandlers(
        setNodes,
        setEdges,
        isLeader ? yNodesMap : null,
        isLeader ? yEdgesMap : null,
        isLeader ? ydoc : null,
        syncYMapFromArray,
        localOriginRef.current
    );


    useKeyboardShortcuts(undo, redo);



    if (!ready || (authenticated && (isUserLoading || isUserFetching))) {
        return <LoadingState />;
    }

    if (!authenticated) {
        return <AuthGate onLogin={login} />;
    }




    return (
        <div className="fixed inset-0 top-16 bg-gray-50">
            <MultiplayerHeader
                username={username}
                userColor={userColor}
                provider={provider}
                isConnected={isConnected}
                connectionError={connectionError}
                isSaving={isSaving}
                forceSave={forceSave}
                nextSaveTime={nextSaveTime}
                proxyMode={!isLeader}
                userId={userId}
            />

            <ReactFlowProvider>
                <GraphProvider value={{
                    updateNodeContent,
                    addNegationBelow,
                    deleteNode,
                    beginConnectFromNode: (id: string) => setConnectAnchorId(id),
                    cancelConnect: () => setConnectAnchorId(null),
                    isConnectingFromNodeId: connectAnchorId,
                    addObjectionForEdge,
                    hoveredEdgeId,
                    setHoveredEdge: setHoveredEdgeId,
                    updateEdgeAnchorPosition,
                    startEditingNode: startEditing,
                    stopEditingNode: stopEditing,
                    getEditorsForNode,
                    lockNode,
                    unlockNode,
                    isLockedForMe,
                    getLockOwner,
                    proxyMode: !isLeader,
                }}>
                    <div className="w-full h-full relative">
                        {(!nodes || nodes.length === 0) && (
                            <div className="absolute inset-0 bg-gray-50/80 z-10 flex items-center justify-center">
                                <div className="text-center bg-white/80 px-6 py-4 rounded-lg border shadow-sm">
                                    <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                    <div className="text-sm text-gray-600">Loading graph…</div>
                                </div>
                            </div>
                        )}
                        <GraphCanvas
                            nodes={nodes as any}
                            edges={edges as any}
                            authenticated={authenticated}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onNodeClick={(e: any, node: any) => {
                                if (!connectMode) return;
                                if (!isLeader) {
                                    toast.warning('Read-only mode: Changes won\'t be saved');
                                    return;
                                }
                                e.stopPropagation();
                                if (!connectAnchorId) {
                                    setConnectAnchorId(node.id);
                                    return;
                                }
                                if (node.id === connectAnchorId) {
                                    setConnectAnchorId(null);
                                    return;
                                }
                                const parentId = connectAnchorId;
                                const childId = node.id;
                                if (isLockedForMe?.(parentId) || isLockedForMe?.(childId)) {
                                    const lockedNodeId = isLockedForMe?.(parentId) ? parentId : childId;
                                    const owner = getLockOwner?.(lockedNodeId);
                                    toast.warning(`Locked by ${owner?.name || 'another user'}`);
                                    setConnectAnchorId(null);
                                    return;
                                }
                                const parentType = nodes.find((n: any) => n.id === parentId)?.type;
                                const edgeType = parentType === 'statement' ? 'statement' : 'negation';
                                const exists = edges.some((edge: any) => edge.source === childId && edge.target === parentId && edge.type === edgeType);
                                if (!exists) {
                                    const id = deterministicEdgeId(edgeType, childId, parentId, `${childId}-source-handle`, `${parentId}-incoming-handle`);
                                    const newEdge: any = { id, type: edgeType, source: childId, target: parentId, sourceHandle: `${childId}-source-handle`, targetHandle: `${parentId}-incoming-handle` };
                                    if (yEdgesMap && ydoc && isLeader) {
                                        ydoc.transact(() => { if (!yEdgesMap.has(id)) yEdgesMap.set(id, newEdge); }, localOriginRef.current);
                                    } else {
                                        setEdges((eds) => (eds.some(e => e.id === id) ? eds : [...eds, newEdge]));
                                    }
                                }
                                setConnectAnchorId(null);
                            }}
                            onNodeDragStart={handleNodeDragStart}
                            onNodeDragStop={handleNodeDragStop}
                            onEdgeMouseEnter={(_: any, edge: any) => setHoveredEdgeId(edge.id)}
                            onEdgeMouseLeave={() => setHoveredEdgeId(null)}
                            provider={provider}
                            cursors={cursors as any}
                            username={username}
                            userColor={userColor}
                        />
                        <ToolsBar
                            connectMode={connectMode}
                            setConnectMode={setConnectMode as any}
                            setConnectAnchorId={setConnectAnchorId}
                            canUndo={!!canUndo}
                            canRedo={!!canRedo}
                            undo={undo}
                            redo={redo}
                            connectAnchorId={connectAnchorId}
                        />
                    </div>
                    <GraphUpdater nodes={nodes} edges={edges} setNodes={setNodes} />
                </GraphProvider>
            </ReactFlowProvider>
        </div>
    );
}