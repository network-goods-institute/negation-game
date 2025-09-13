'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
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
import { TypeSelectorDropdown } from '@/components/experiment/multiplayer/TypeSelectorDropdown';
import { toast } from 'sonner';
import { buildConnectionEdge } from '@/utils/experiment/multiplayer/connectUtils';
import { generateEdgeId } from '@/utils/experiment/multiplayer/graphSync';
import {
    createUpdateNodeContent,
    createUpdateNodeHidden,
    createDeleteNode,
    createAddNegationBelow,
    createAddSupportBelow,
    createAddPointBelow,
    createAddObjectionForEdge,
    createUpdateEdgeAnchorPosition,
    createAddNodeAtPosition,
    createUpdateNodeType,
    createInversePair,
    createDeleteInversePair
} from '@/utils/experiment/multiplayer/graphOperations';
import { Roboto_Slab } from 'next/font/google';
import { recordOpen } from '@/actions/experimental/rationales';

const robotoSlab = Roboto_Slab({ subsets: ['latin'] });

export default function MultiplayerRationaleDetailPage() {
    const routeParams = useParams<{ id: string }>();
    const { authenticated, ready, login } = usePrivy();
    const { data: user, isLoading: isUserLoading, isFetching: isUserFetching } = useUser();

    const [connectMode, setConnectMode] = useState<boolean>(false);
    const [grabMode, setGrabMode] = useState<boolean>(false);
    const [connectAnchorId, setConnectAnchorId] = useState<string | null>(null);
    const connectAnchorRef = useRef<string | null>(null);
    useEffect(() => { if (!connectAnchorId) connectAnchorRef.current = null; }, [connectAnchorId]);
    const [connectCursor, setConnectCursor] = useState<{ x: number; y: number } | null>(null);
    const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
    const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
    const [newNodeWithDropdown, setNewNodeWithDropdown] = useState<{ id: string, x: number, y: number } | null>(null);
    const localOriginRef = useRef<object>({});
    const lastAddRef = useRef<Record<string, number>>({});
    const [pairNodeHeights, setPairNodeHeights] = useState<Record<string, Record<string, number>>>({});
    const [pairHeights, setPairHeights] = useState<Record<string, number>>({});
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

    const userColor = useUserColor(user?.id);
    const initialGraph = useInitialGraph();
    const [dbTitle, setDbTitle] = useState<string | null>(null);
    const [ownerId, setOwnerId] = useState<string | null>(null);


    useEffect(() => {
        if (!routeParams?.id) return;
        const loadDbTitle = async () => {
            try {
                const rid = typeof routeParams.id === 'string' ? routeParams.id : String(routeParams.id);
                try { await recordOpen(rid); } catch { }
                const res = await fetch(`/api/experimental/rationales/${encodeURIComponent(rid)}`);
                if (res.ok) {
                    const data = await res.json();
                    setDbTitle(data.title || null);
                    setOwnerId(data.ownerId || null);
                }
            } catch (e) {
                console.error('[title] Failed to load DB title:', e);
            }
        };
        loadDbTitle();
    }, [routeParams?.id]);


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
        connectionState,
        isSaving,
        forceSave,
        interruptSave,
        nextSaveTime,
        resyncNow,
        undo,
        redo,
        canUndo,
        canRedo,
        registerTextInUndoScope,
        isUndoRedoRef,
    } = useYjsMultiplayer({
        roomName,
        initialNodes: initialGraph?.nodes || [],
        initialEdges: initialGraph?.edges || [],
        enabled: ready && authenticated && !isUserLoading && !isUserFetching && Boolean(initialGraph),
        localOrigin: localOriginRef.current,
    });

    const { isLeader } = useLeaderElection(provider, userId);

    const cursors = useMultiplayerCursors({ provider, userId, username, userColor, isLeader });
    const { startEditing, stopEditing, getEditorsForNode, lockNode, unlockNode, isLockedForMe, getLockOwner } = useMultiplayerEditing({ provider, userId, username, userColor, isLeader });
    const [editingSet, setEditingSet] = useState<Set<string>>(new Set());
    const startEditingNodeCtx = React.useCallback((nodeId: string) => {
        setEditingSet((prev) => { const ns = new Set(prev); ns.add(nodeId); return ns; });
        try { startEditing(nodeId); } catch { }
    }, [startEditing]);
    const stopEditingNodeCtx = React.useCallback((nodeId: string) => {
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        setEditingSet((prev) => { const ns = new Set(prev); ns.delete(nodeId); return ns; });
        try { stopEditing(nodeId); } catch { }
    }, [stopEditing]);
    const isAnyNodeEditing = editingSet.size > 0;

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

    const getViewportOffset = React.useCallback(() => {
        const nodeSpacing = 16;
        return { x: Math.random() * 40 - 20, y: nodeSpacing };
    }, []);

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
        getLockOwner,
        getViewportOffset
    );
    const createSupportBelow = createAddSupportBelow(
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
        getLockOwner,
        getViewportOffset
    );

    const addPointBelow = createAddPointBelow(
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
        getLockOwner,
        getViewportOffset
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

    const deleteInversePair = React.useMemo(() => (
        createDeleteInversePair(
            nodes as any,
            edges as any,
            yNodesMap as any,
            yEdgesMap as any,
            yTextMap as any,
            ydoc as any,
            isLeader,
            localOriginRef.current,
            setNodes as any,
            setEdges as any,
            isLockedForMe,
            getLockOwner,
        )
    ), [nodes, edges, yNodesMap, yEdgesMap, yTextMap, ydoc, isLeader, setNodes, setEdges, isLockedForMe, getLockOwner]);


    const updateNodeFavor = (nodeId: string, favor: 1 | 2 | 3 | 4 | 5) => {
        setNodes((nds: any[]) => nds.map(n => n.id === nodeId ? { ...n, data: { ...(n.data || {}), favor } } : n));
        if (yNodesMap && ydoc && isLeader) {
            ydoc.transact(() => {
                const base = (yNodesMap as any).get(nodeId);
                if (base) (yNodesMap as any).set(nodeId, { ...base, data: { ...(base.data || {}), favor } });
            }, localOriginRef.current);
        }
    };
    const updateEdgeRelevance = (edgeId: string, relevance: 1 | 2 | 3 | 4 | 5) => {
        setEdges((eds: any[]) => eds.map(e => e.id === edgeId ? { ...e, data: { ...(e.data || {}), relevance } } : e));
        if (yEdgesMap && ydoc && isLeader) {
            ydoc.transact(() => {
                const base = (yEdgesMap as any).get(edgeId);
                if (base) (yEdgesMap as any).set(edgeId, { ...base, data: { ...(base.data || {}), relevance } });
            }, localOriginRef.current);
        }
    };


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

    const updateEdgeAnchorPosition = React.useMemo(
        () => createUpdateEdgeAnchorPosition(
            setNodes as any,
            isLeader && leaderSynced ? (yNodesMap as any) : null,
            isLeader && leaderSynced ? (ydoc as any) : null,
            isLeader && leaderSynced,
            localOriginRef.current,
            undefined,
            undefined
        ),
        [setNodes, yNodesMap, ydoc, isLeader, leaderSynced]
    );

    const { onNodesChange, onEdgesChange, onConnect, commitNodePositions } = createGraphChangeHandlers(
        setNodes,
        setEdges,
        isLeader && leaderSynced ? yNodesMap : null,
        isLeader && leaderSynced ? yEdgesMap : null,
        isLeader && leaderSynced ? ydoc : null,
        syncYMapFromArray,
        localOriginRef.current,
        () => nodes as any[]
    );

    const updateNodeContent = createUpdateNodeContent(
        yTextMap as any,
        ydoc as any,
        isLeader,
        localOriginRef.current,
        setNodes,
        registerTextInUndoScope
    );

    const inversePair = createInversePair(
        nodes,
        yNodesMap,
        yTextMap,
        yEdgesMap,
        ydoc,
        isLeader,
        localOriginRef.current,
        setNodes,
        setEdges,
        registerTextInUndoScope,
        isLockedForMe,
        getLockOwner
    );

    const setPairNodeHeight = React.useCallback((groupId: string, nodeId: string, height: number) => {
        const nextH = Math.max(0, Math.floor(height));
        setPairNodeHeights((prev) => {
            const prevGroup = prev[groupId] || {};
            const prevH = prevGroup[nodeId] ?? 0;
            if (prevH === nextH) return prev;
            const group = { ...prevGroup, [nodeId]: nextH } as Record<string, number>;
            const next = { ...prev, [groupId]: group } as Record<string, Record<string, number>>;
            const maxH = Object.values(group).reduce((m, h) => Math.max(m, h || 0), 0);
            setPairHeights((ph) => (ph[groupId] === maxH ? ph : { ...ph, [groupId]: maxH }));
            return next;
        });
    }, []);


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
                connectionState={connectionState as any}
                isSaving={isSaving}
                forceSave={forceSave}
                interruptSave={interruptSave || undefined}
                nextSaveTime={nextSaveTime}
                proxyMode={!isLeader}
                userId={userId}
                title={(() => { const t = (((nodes as any[]).find(n => n.type === 'title')?.data?.content) as string) || ''; return (t || '').trim() || (typeof routeParams?.id === 'string' ? routeParams.id : String(routeParams?.id || '')); })()}
                onTitleInput={(newTitle: string) => {
                    const t = nodes.find(n => n.type === 'title');
                    if (t) updateNodeContent(t.id, newTitle);
                }}
                onTitleCommit={(newTitle: string) => {
                    try {
                        const t = nodes.find(n => n.type === 'title');
                        if (t) updateNodeContent(t.id, newTitle);
                        // Also persist to db so listing shows updated title
                        try {
                            const rid = typeof routeParams?.id === 'string' ? routeParams.id : String(routeParams?.id || '');
                            fetch(`/api/experimental/rationales/${encodeURIComponent(rid)}`, {
                                method: 'PATCH',
                                headers: { 'content-type': 'application/json' },
                                body: JSON.stringify({ title: newTitle })
                            }).catch(() => { });
                        } catch { }
                    } catch { }
                }}
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
                    createSupportBelow,
                    addPointBelow,
                    createInversePair: inversePair,
                    deleteNode,
                    startEditingNode: startEditingNodeCtx,
                    stopEditingNode: stopEditingNodeCtx,
                    getEditorsForNode,
                    isLockedForMe,
                    getLockOwner,
                    isAnyNodeEditing,
                    beginConnectFromNode: (id: string) => { connectAnchorRef.current = id; setConnectAnchorId(id); },
                    beginConnectFromEdge: (edgeId: string) => {
                        const anchorId = `anchor:${edgeId}`;
                        connectAnchorRef.current = anchorId;
                        setConnectAnchorId(anchorId);
                        // Ensure a local anchor node exists for preview
                        const edge = (edges as any[]).find(e => e.id === edgeId);
                        if (edge) {
                            const src = (nodes as any[]).find(n => n.id === edge.source);
                            const tgt = (nodes as any[]).find(n => n.id === edge.target);
                            if (src && tgt) {
                                const ax = (src.position.x + tgt.position.x) / 2;
                                const ay = (src.position.y + tgt.position.y) / 2;
                                const anchorNode: any = { id: anchorId, type: 'edge_anchor', position: { x: ax, y: ay }, data: { parentEdgeId: edgeId } };
                                setNodes((nds: any[]) => nds.some(n => n.id === anchorId) ? nds : [...nds, anchorNode]);
                            }
                        }
                    },
                    completeConnectToNode: (nodeId: string) => {
                        if (!connectMode) return;
                        if (!isLeader) {
                            toast.warning('Read-only mode: Changes won\'t be saved');
                            return;
                        }
                        const anchorId = connectAnchorId || connectAnchorRef.current;
                        if (!anchorId) return;
                        if (nodeId === anchorId) {
                            setConnectAnchorId(null);
                            connectAnchorRef.current = null;
                            setConnectCursor(null);
                            return;
                        }
                        // Edge->Node: if anchor is an edge anchor, create an objection for that edge
                        if (anchorId.startsWith('anchor:')) {
                            const edgeId = anchorId.slice('anchor:'.length);
                            const baseEdge = (edges as any[]).find(e => e.id === edgeId);
                            const src = (nodes as any[]).find(n => n.id === baseEdge?.source);
                            const tgt = (nodes as any[]).find(n => n.id === baseEdge?.target);
                            const midX = src && tgt ? (src.position.x + tgt.position.x) / 2 : 0;
                            const midY = src && tgt ? (src.position.y + tgt.position.y) / 2 : 0;
                            const anchorIdForEdge = `anchor:${edgeId}`;
                            const anchorNodeExists = (nodes as any[]).some(n => n.id === anchorIdForEdge);
                            if (!anchorNodeExists) {
                                const anchorNode: any = { id: anchorIdForEdge, type: 'edge_anchor', position: { x: midX, y: midY }, data: { parentEdgeId: edgeId } };
                                setNodes((nds: any[]) => nds.some(n => n.id === anchorIdForEdge) ? nds : [...nds, anchorNode]);
                                if (yNodesMap && ydoc && isLeader) {
                                    ydoc.transact(() => { if (!(yNodesMap as any).has(anchorIdForEdge)) (yNodesMap as any).set(anchorIdForEdge, anchorNode); }, localOriginRef.current);
                                }
                            }
                            // Always create an objection edge from the node to this edge's anchor without spawning a new node
                            const newObjEdge = { id: generateEdgeId(), type: 'objection', source: nodeId, target: anchorIdForEdge } as any;
                            setEdges((eds: any[]) => eds.some(e => e.id === newObjEdge.id) ? eds : [...eds, newObjEdge]);
                            if (yEdgesMap && ydoc && isLeader) {
                                ydoc.transact(() => { if (!(yEdgesMap as any).has(newObjEdge.id)) (yEdgesMap as any).set(newObjEdge.id, newObjEdge); }, localOriginRef.current);
                            }
                            setConnectAnchorId(null);
                            connectAnchorRef.current = null;
                            setConnectCursor(null);
                            setConnectMode(false);
                            return;
                        }
                        const parentId = anchorId;
                        const childId = nodeId;
                        if (isLockedForMe?.(parentId) || isLockedForMe?.(childId)) {
                            const lockedNodeId = isLockedForMe?.(parentId) ? parentId : childId;
                            const owner = getLockOwner?.(lockedNodeId);
                            toast.warning(`Locked by ${owner?.name || 'another user'}`);
                            setConnectAnchorId(null);
                            connectAnchorRef.current = null;
                            setConnectCursor(null);
                            return;
                        }
                        const { id, edge } = buildConnectionEdge(nodes as any, parentId, childId) as any;
                        const exists = edges.some((e: any) => e.id === id);
                        if (!exists) {
                            if (yEdgesMap && ydoc && isLeader) {
                                ydoc.transact(() => { if (!yEdgesMap.has(id)) yEdgesMap.set(id, edge as any); }, localOriginRef.current);
                            } else {
                                setEdges((eds) => (eds.some(e => e.id === id) ? eds : [...eds, edge as any]));
                            }
                        }
                        // Objection nodes render as point-like dynamically based on negation edges; do not flip types
                        setConnectAnchorId(null);
                        connectAnchorRef.current = null;
                        setConnectCursor(null);
                        setConnectMode(false);
                    },
                    cancelConnect: () => { setConnectAnchorId(null); connectAnchorRef.current = null; setConnectCursor(null); setConnectMode(false); },
                    completeConnectToEdge: (edgeId: string, midX?: number, midY?: number) => {
                        if (!connectMode) return;
                        const origin = connectAnchorRef.current;
                        if (!origin) return;
                        if (origin.startsWith('anchor:')) {
                            // Edge->Edge not supported
                            return;
                        }
                        const originNode = (nodes as any[]).find(n => n.id === origin);
                        if (originNode && originNode.type === 'objection') {
                            // Attach existing objection node
                            const anchorId = `anchor:${edgeId}`;
                            const anchorExists = (nodes as any[]).some(n => n.id === anchorId);
                            if (!anchorExists) {
                                const base = (edges as any[]).find(e => e.id === edgeId);
                                const src = (nodes as any[]).find(n => n.id === base?.source);
                                const tgt = (nodes as any[]).find(n => n.id === base?.target);
                                const ax = (midX != null ? midX : (src && tgt ? (src.position.x + tgt.position.x) / 2 : 0));
                                const ay = (midY != null ? midY : (src && tgt ? (src.position.y + tgt.position.y) / 2 : 0));
                                const anchorNode: any = { id: anchorId, type: 'edge_anchor', position: { x: ax, y: ay }, data: { parentEdgeId: edgeId } };
                                setNodes((nds: any[]) => nds.some(n => n.id === anchorId) ? nds : [...nds, anchorNode]);
                                if (yNodesMap && ydoc && isLeader) {
                                    ydoc.transact(() => { if (!(yNodesMap as any).has(anchorId)) (yNodesMap as any).set(anchorId, anchorNode); }, localOriginRef.current);
                                }
                            }
                            const newEdge = { id: generateEdgeId(), type: 'objection', source: originNode.id, target: `anchor:${edgeId}` } as any;
                            setEdges((eds: any[]) => eds.some(e => e.id === newEdge.id) ? eds : [...eds, newEdge]);
                            if (yEdgesMap && ydoc && isLeader) {
                                ydoc.transact(() => { if (!(yEdgesMap as any).has(newEdge.id)) (yEdgesMap as any).set(newEdge.id, newEdge); }, localOriginRef.current);
                            }
                        } else {
                            addObjectionForEdge(edgeId, midX, midY);
                        }
                        setConnectAnchorId(null);
                        connectAnchorRef.current = null;
                        setConnectCursor(null);
                        setConnectMode(false);
                    },
                    isConnectingFromNodeId: connectAnchorId,
                    connectMode,
                    addObjectionForEdge,
                    hoveredEdgeId,
                    setHoveredEdge: setHoveredEdgeId,
                    updateEdgeRelevance,
                    selectedEdgeId,
                    setSelectedEdge: setSelectedEdgeId,
                    updateEdgeAnchorPosition,
                    lockNode,
                    unlockNode,
                    proxyMode: !isLeader,

                    undo,
                    redo,
                    addNodeAtPosition: createAddNodeAtPosition(
                        yNodesMap as any,
                        yTextMap as any,
                        ydoc as any,
                        isLeader,
                        localOriginRef.current,
                        setNodes as any,
                        registerTextInUndoScope,
                    ),
                    updateNodeType: createUpdateNodeType(
                        yNodesMap as any,
                        yTextMap as any,
                        ydoc as any,
                        isLeader,
                        localOriginRef.current,
                        setNodes as any,
                        registerTextInUndoScope,
                    ),
                    deleteInversePair,
                    setPairNodeHeight,
                    pairHeights,
                    hoveredNodeId: hoveredNodeId,
                    setHoveredNodeId: (nid: string | null) => {
                        setHoveredNodeId(nid);
                    },
                    commitGroupLayout: (groupId: string, positions: Record<string, { x: number; y: number }>, width: number, height: number) => {
                        if (!isLeader) return;
                        try {
                            (ydoc as any)?.transact?.(() => {
                                const gBase = (yNodesMap as any)?.get(groupId);
                                const curGroup = (nodes as any[])?.find?.((n: any) => n.id === groupId);
                                const pos = curGroup?.position || gBase?.position || { x: 0, y: 0 };
                                if (gBase) {
                                    (yNodesMap as any).set(groupId, {
                                        ...gBase,
                                        position: pos,
                                        width,
                                        height,
                                        style: { ...((gBase as any).style || {}), width, height },
                                    });
                                }
                                Object.entries(positions || {}).forEach(([nid, pos]) => {
                                    const base = (yNodesMap as any)?.get(nid);
                                    if (base) {
                                        (yNodesMap as any).set(nid, { ...base, position: { x: pos.x, y: pos.y } });
                                    }
                                });
                            }, localOriginRef.current);
                        } catch { }
                        // Update local state immediately as well
                        setNodes((nds: any[]) => nds.map((n: any) => {
                            if (n.id === groupId) return { ...n, width, height, style: { ...(n.style || {}), width, height } };
                            const p = (positions as any)[n.id];
                            if (p) return { ...n, position: { ...(n.position || { x: 0, y: 0 }), x: p.x, y: p.y } };
                            return n;
                        }));
                    },
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
                            panOnDrag={grabMode ? [0, 1, 2] : [1, 2]}
                            panOnScroll={true}
                            zoomOnScroll={false}
                            connectMode={connectMode}
                            connectAnchorId={connectAnchorId}
                            onFlowMouseMove={(x, y) => setConnectCursor({ x, y })}
                            connectCursor={connectCursor}
                            onBackgroundMouseUp={() => {
                                // No-op: edge connections by drag are disabled
                            }}
                            onBackgroundDoubleClick={(flowX, flowY) => {
                                if (!isLeader) {
                                    toast.warning("Read-only mode: Changes won't be saved");
                                    return;
                                }
                                const addNodeAtPosition = createAddNodeAtPosition(
                                    yNodesMap as any,
                                    yTextMap as any,
                                    ydoc as any,
                                    isLeader,
                                    localOriginRef.current,
                                    setNodes as any,
                                    registerTextInUndoScope,
                                );
                                const nodeId = addNodeAtPosition('point', flowX, flowY);

                                setTimeout(() => {
                                    const element = document.querySelector(`[data-id="${nodeId}"]`);
                                    if (element) {
                                        const rect = element.getBoundingClientRect();
                                        setNewNodeWithDropdown({
                                            id: nodeId,
                                            x: rect.left - 130,
                                            y: rect.top
                                        });
                                    } else {
                                        setNewNodeWithDropdown({
                                            id: nodeId,
                                            x: window.innerWidth / 2 - 130,
                                            y: window.innerHeight / 2
                                        });
                                    }
                                }, 50);
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

                        />
                    </div>
                    <GraphUpdater nodes={nodes} edges={edges} setNodes={setNodes} />
                </GraphProvider>

                {newNodeWithDropdown && (
                    <TypeSelectorDropdown
                        open={true}
                        x={newNodeWithDropdown.x}
                        y={newNodeWithDropdown.y}
                        currentType="point"
                        onClose={() => setNewNodeWithDropdown(null)}
                        onSelect={(type) => {
                            const updateNodeType = createUpdateNodeType(
                                yNodesMap as any,
                                yTextMap as any,
                                ydoc as any,
                                isLeader,
                                localOriginRef.current,
                                setNodes as any,
                                registerTextInUndoScope,
                            );
                            updateNodeType(newNodeWithDropdown.id, type);
                            setNewNodeWithDropdown(null);
                        }}
                    />
                )}
            </ReactFlowProvider>
            {null}
        </div>
    );
}
