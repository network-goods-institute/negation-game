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
import { useLeaderPromotionSync } from '@/hooks/experiment/multiplayer/useLeaderPromotionSync';
import { createGraphChangeHandlers } from '@/utils/experiment/multiplayer/graphSync';
import { GraphProvider } from '@/components/experiment/multiplayer/GraphContext';
import { GraphUpdater } from '@/components/experiment/multiplayer/GraphUpdater';
import { toast } from 'sonner';
import { buildConnectionEdge } from '@/utils/experiment/multiplayer/connectUtils';
import {
    createUpdateNodeContent,
    createUpdateNodeHidden,
    createDeleteNode,
    createAddNegationBelow,
    createAddObjectionForEdge,
    createUpdateEdgeAnchorPosition,
    createAddNodeAtPosition
} from '@/utils/experiment/multiplayer/graphOperations';
import { Roboto_Slab } from 'next/font/google';

const robotoSlab = Roboto_Slab({ subsets: ['latin'] });

export default function MultiplayerRationaleDetailPage() {
    const routeParams = useParams<{ id: string }>();
    const { authenticated, ready, login } = usePrivy();
    const { data: user, isLoading: isUserLoading, isFetching: isUserFetching } = useUser();

    const [connectMode, setConnectMode] = useState<boolean>(false);
    const [grabMode, setGrabMode] = useState<boolean>(false);
    const [connectAnchorId, setConnectAnchorId] = useState<string | null>(null);
    const [connectCursor, setConnectCursor] = useState<{ x: number; y: number } | null>(null);
    const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
    const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
    const [importanceSim, setImportanceSim] = useState<boolean>(false);
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
        yMetaMap,
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
        registerTextInUndoScope,
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
        yTextMap,
        ydoc,
        isLeader,
        localOriginRef.current,
        lastAddRef,
        setNodes,
        setEdges,
        registerTextInUndoScope,
        isLockedForMe,
        getLockOwner
    );

    const addObjectionForEdge = createAddObjectionForEdge(
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
        registerTextInUndoScope,
        isLockedForMe,
        getLockOwner
    );

    const updateEdgeAnchorPosition = createUpdateEdgeAnchorPosition(setNodes);
    const updateNodeFavor = (nodeId: string, favor: 1|2|3|4|5) => {
        setNodes((nds: any[]) => nds.map(n => n.id === nodeId ? { ...n, data: { ...(n.data||{}), favor } } : n));
        if (yNodesMap && ydoc && isLeader) {
            ydoc.transact(() => {
                const base = (yNodesMap as any).get(nodeId);
                if (base) (yNodesMap as any).set(nodeId, { ...base, data: { ...(base.data||{}), favor } });
            }, localOriginRef.current);
        }
    };
    const updateEdgeRelevance = (edgeId: string, relevance: 1|2|3|4|5) => {
        setEdges((eds: any[]) => eds.map(e => e.id === edgeId ? { ...e, data: { ...(e.data||{}), relevance } } : e));
        if (yEdgesMap && ydoc && isLeader) {
            ydoc.transact(() => {
                const base = (yEdgesMap as any).get(edgeId);
                if (base) (yEdgesMap as any).set(edgeId, { ...base, data: { ...(base.data||{}), relevance } });
            }, localOriginRef.current);
        }
    };

    // Sync importanceSim across clients using yMetaMap
    React.useEffect(() => {
        const m = yMetaMap as any;
        if (!m) return;
        const apply = () => {
            try {
                const val = m.get('importanceSim');
                if (typeof val === 'boolean') setImportanceSim(val);
            } catch {}
        };
        apply();
        const obs = () => apply();
        m.observe(obs);
        return () => { try { m.unobserve(obs); } catch {} };
    }, [yMetaMap]);

    const clearConnect = React.useCallback(() => {
        setConnectMode(false);
        setConnectAnchorId(null);
        setConnectCursor(null);
    }, []);

    const leaderSynced = useLeaderPromotionSync({
        isLeader,
        yNodesMap: yNodesMap as any,
        yEdgesMap: yEdgesMap as any,
        yTextMap: yTextMap as any,
        setNodes: setNodes as any,
        setEdges: setEdges as any,
        clearConnect,
    });

    const { onNodesChange, onEdgesChange, onConnect, commitNodePositions } = createGraphChangeHandlers(
        setNodes,
        setEdges,
        isLeader && leaderSynced ? yNodesMap : null,
        isLeader && leaderSynced ? yEdgesMap : null,
        isLeader && leaderSynced ? ydoc : null,
        syncYMapFromArray,
        localOriginRef.current
    );

    const updateNodeContent = createUpdateNodeContent(
        yTextMap,
        ydoc,
        isLeader,
        localOriginRef.current,
        setNodes,
        registerTextInUndoScope
    );


    useKeyboardShortcuts(undo, redo, {
        onToggleConnect: () => {
            if (!isLeader) return;
            setConnectMode((v) => !v);
            setConnectAnchorId(null);
        },
        onExitConnect: () => {
            setConnectMode(false);
            setConnectAnchorId(null);
        },
        onPointerMode: () => {
            setConnectMode(false);
            setGrabMode(false);
            setConnectAnchorId(null);
        },
        onToggleGrab: () => {
            setConnectMode(false);
            setGrabMode((g) => !g);
            setConnectAnchorId(null);
        }
    });



    if (!ready || (authenticated && (isUserLoading || isUserFetching))) {
        return <LoadingState />;
    }

    if (!authenticated) {
        return <AuthGate onLogin={login} />;
    }




    return (
        <div className={`fixed inset-0 top-16 bg-gray-50 ${robotoSlab.className}`}>
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
                    updateNodeHidden: createUpdateNodeHidden(
                        yNodesMap as any,
                        ydoc as any,
                        isLeader,
                        localOriginRef.current,
                        setNodes as any,
                    ),
                    updateNodeFavor,
                    addNegationBelow,
                    deleteNode,
                    beginConnectFromNode: (id: string) => setConnectAnchorId(id),
                    completeConnectToNode: (nodeId: string) => {
                        if (!connectMode) return;
                        if (!isLeader) {
                            toast.warning('Read-only mode: Changes won\'t be saved');
                            return;
                        }
                        if (!connectAnchorId) return;
                        if (nodeId === connectAnchorId) {
                            setConnectAnchorId(null);
                            setConnectCursor(null);
                            return;
                        }
                        const parentId = connectAnchorId;
                        const childId = nodeId;
                        if (isLockedForMe?.(parentId) || isLockedForMe?.(childId)) {
                            const lockedNodeId = isLockedForMe?.(parentId) ? parentId : childId;
                            const owner = getLockOwner?.(lockedNodeId);
                            toast.warning(`Locked by ${owner?.name || 'another user'}`);
                            setConnectAnchorId(null);
                            setConnectCursor(null);
                            return;
                        }
                        const { id, edge } = buildConnectionEdge(nodes as any, parentId, childId) as any;
                        const exists = edges.some((edge: any) => edge.id === id);
                        if (!exists) {
                            if (yEdgesMap && ydoc && isLeader) {
                                ydoc.transact(() => { if (!yEdgesMap.has(id)) yEdgesMap.set(id, edge as any); }, localOriginRef.current);
                            } else {
                                setEdges((eds) => (eds.some(e => e.id === id) ? eds : [...eds, edge as any]));
                            }
                        }
                        setConnectAnchorId(null);
                        setConnectCursor(null);
                    },
                    cancelConnect: () => setConnectAnchorId(null),
                    isConnectingFromNodeId: connectAnchorId,
                    connectMode,
                    addObjectionForEdge,
                    hoveredEdgeId,
                    setHoveredEdge: setHoveredEdgeId,
                    updateEdgeRelevance,
                    selectedEdgeId,
                    setSelectedEdge: setSelectedEdgeId,
                updateEdgeAnchorPosition,
                startEditingNode: startEditing,
                stopEditingNode: stopEditing,
                getEditorsForNode,
                lockNode,
                unlockNode,
                isLockedForMe,
                getLockOwner,
                proxyMode: !isLeader,
                importanceSim,
                undo,
                redo,
                addNodeAtPosition: createAddNodeAtPosition(
                    yNodesMap as any,
                    yTextMap as any,
                    ydoc as any,
                    isLeader,
                    localOriginRef.current,
                    setNodes as any,
                ),
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
                            onNodeClick={() => { /* selection/editing handled inside nodes; do not link on click */ }}
                            onNodeDragStart={handleNodeDragStart}
                            onNodeDragStop={handleNodeDragStop}
                            onEdgeMouseEnter={(_: any, edge: any) => setHoveredEdgeId(edge.id)}
                            onEdgeMouseLeave={() => setHoveredEdgeId(null)}
                            provider={provider}
                            cursors={cursors as any}
                            username={username}
                            userColor={userColor}
                            panOnDrag={grabMode ? [0,1,2] : [1,2]}
                            panOnScroll={true}
                            zoomOnScroll={false}
                            connectMode={connectMode}
                            connectAnchorId={connectAnchorId}
                            onFlowMouseMove={(x,y) => setConnectCursor({ x, y })}
                            connectCursor={connectCursor}
                            onBackgroundMouseUp={() => {
                                // No-op: edge connections by drag are disabled
                            }}
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
                            readOnly={!isLeader}
                            grabMode={grabMode}
                            setGrabMode={setGrabMode}
                            importanceSim={importanceSim}
                            setImportanceSim={(v: any) => {
                                const next = typeof v === 'function' ? (v as any)(importanceSim) : v;
                                setImportanceSim(next);
                                try {
                                    if (ydoc && (yMetaMap as any)) {
                                        (ydoc as any).transact(() => {
                                            (yMetaMap as any).set('importanceSim', Boolean(next));
                                        }, localOriginRef.current);
                                    }
                                } catch {}
                            }}
                        />
                    </div>
                    <GraphUpdater nodes={nodes} edges={edges} setNodes={setNodes} />
                </GraphProvider>
            </ReactFlowProvider>
        </div>
    );
}
