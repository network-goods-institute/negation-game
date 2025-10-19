'use client';

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ReactFlowProvider, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { usePrivy } from '@privy-io/react-auth';
import { userQueryKey } from '@/queries/users/useUser';
import { useQueryClient } from '@tanstack/react-query';
import { LoadingState } from '@/components/ui/LoadingState';
import { useUserColor } from '@/hooks/experiment/multiplayer/useUserColor';
import { useKeyboardShortcuts } from '@/hooks/experiment/multiplayer/useKeyboardShortcuts';
import { useInitialGraph } from '@/hooks/experiment/multiplayer/useInitialGraph';
import { useNodeDragHandlers } from '@/hooks/experiment/multiplayer/useNodeDragHandlers';
import { useMultiplayerTitle } from '@/hooks/experiment/multiplayer/useMultiplayerTitle';
import { useConnectionMode } from '@/hooks/experiment/multiplayer/useConnectionMode';
import { useEdgeTypeManager } from '@/hooks/experiment/multiplayer/useEdgeTypeManager';
import { useGraphOperations } from '@/hooks/experiment/multiplayer/useGraphOperations';
import { useConnectionHandlers } from '@/hooks/experiment/multiplayer/useConnectionHandlers';
import { useNodeHelpers } from '@/hooks/experiment/multiplayer/useNodeHelpers';
import { usePairHeights } from '@/hooks/experiment/multiplayer/usePairHeights';
import { useEdgeSelection } from '@/hooks/experiment/multiplayer/useEdgeSelection';
import { useAnonymousId } from '@/hooks/experiment/multiplayer/useAnonymousId';
import { MultiplayerHeader } from '@/components/experiment/multiplayer/MultiplayerHeader';
import { ToolsBar } from '@/components/experiment/multiplayer/ToolsBar';
import { GraphCanvas } from '@/components/experiment/multiplayer/GraphCanvas';
import { UndoHintOverlay } from '@/components/experiment/multiplayer/UndoHintOverlay';
import { useYjsMultiplayer } from '@/hooks/experiment/multiplayer/useYjsMultiplayer';
import { useMultiplayerCursors } from '@/hooks/experiment/multiplayer/useMultiplayerCursors';
import { useMultiplayerEditing } from '@/hooks/experiment/multiplayer/useMultiplayerEditing';
import { useWriteAccess } from '@/hooks/experiment/multiplayer/useWriteAccess';
import { useWritableSync } from '@/hooks/experiment/multiplayer/useWritableSync';
import { createGraphChangeHandlers } from '@/utils/experiment/multiplayer/graphSync';
import { GraphProvider } from '@/components/experiment/multiplayer/GraphContext';
import { GraphUpdater } from '@/components/experiment/multiplayer/GraphUpdater';
import { TypeSelectorDropdown } from '@/components/experiment/multiplayer/TypeSelectorDropdown';
import { toast } from 'sonner';
import { Roboto_Slab } from 'next/font/google';
import { recordOpen } from '@/actions/experimental/rationales';
import { PerfProvider } from '@/components/experiment/multiplayer/PerformanceContext';
import { buildRationaleDetailPath } from '@/utils/hosts/syncPaths';
import { isProductionEnvironment, isProductionRequest } from '@/utils/hosts';
import { AuthGate } from '@/components/auth/AuthGate';
import { setMindchange as setMindchangeAction, getMindchangeBreakdown as getMindchangeBreakdownAction, getMindchangeAveragesForEdges } from '@/actions/experimental/mindchange';
import { ORIGIN } from '@/hooks/experiment/multiplayer/yjs/origins';

const robotoSlab = Roboto_Slab({ subsets: ['latin'] });

export default function MultiplayerBoardDetailPage() {
    const routeParams = useParams<{ id: string }>();
    const router = useRouter();
    const { authenticated, ready, login, user: privyUser } = usePrivy();

    const [privyTimeout, setPrivyTimeout] = useState(false);
    useEffect(() => {
        if (ready) return;
        const timer = setTimeout(() => {
            console.log('[MultiplayerBoardDetailPage] Privy timeout - proceeding as anonymous');
            setPrivyTimeout(true);
        }, 5000);
        return () => clearTimeout(timer);
    }, [ready]);

    const privyReady = ready || privyTimeout;

    const {
        connectMode,
        setConnectMode,
        connectAnchorId,
        setConnectAnchorId,
        connectAnchorRef,
        connectCursor,
        setConnectCursor,
        clearConnect,
        cancelConnect,
    } = useConnectionMode();
    const [mindchangeSelectMode, setMindchangeSelectMode] = useState(false);
    const [mindchangeEdgeId, setMindchangeEdgeId] = useState<string | null>(null);
    const [mindchangeNextDir, setMindchangeNextDir] = useState<null | 'forward' | 'backward'>(null);

    const [grabMode, setGrabMode] = useState<boolean>(false);
    const [perfBoost, setPerfBoost] = useState<boolean>(false);
    const [newNodeWithDropdown, setNewNodeWithDropdown] = useState<{ id: string, x: number, y: number } | null>(null);

    const { hoveredEdgeId, setHoveredEdgeId, selectedEdgeId, setSelectedEdgeId, revealEdgeTemporarily } = useEdgeSelection();
    const localOriginRef = useRef<object>({});
    const lastAddRef = useRef<Record<string, number>>({});
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    const [undoHintPosition, setUndoHintPosition] = useState<{ x: number; y: number } | null>(null);
    const [overlayActiveEdgeId, setOverlayActiveEdgeId] = useState<string | null>(null);
    const selectMode = useMemo(() => !connectMode && !grabMode && !mindchangeSelectMode, [connectMode, grabMode, mindchangeSelectMode]);
    const [forceBlurNodes, setForceBlurNodes] = useState(0);
    const centerOnceIdsRef = useRef<Set<string>>(new Set());
    const [centerQueueVersion, setCenterQueueVersion] = useState(0);
    const markNodeCenterOnce = useCallback((id: string) => {
        if (!id) return;
        centerOnceIdsRef.current.add(id);
        setCenterQueueVersion((v) => v + 1);
    }, []);
    const consumeCenterQueue = useCallback(() => {
        const out = Array.from(centerOnceIdsRef.current);
        centerOnceIdsRef.current.clear();
        return out;
    }, []);

    const blurNodesImmediately = useCallback(() => {
        setForceBlurNodes((v) => v + 1);
    }, []);

    const { pairNodeHeights, pairHeights, setPairNodeHeight, commitGroupLayout: commitGroupLayoutBase } = usePairHeights();

    const initialGraph = useInitialGraph();


    const queryClient = useQueryClient();
    const cachedUser = queryClient.getQueryData(userQueryKey(privyUser?.id));
    const mcCacheRef = useRef<Map<string, { ts: number; data: { forward: Array<{ userId: string; username: string; value: number }>; backward: Array<{ userId: string; username: string; value: number }> } }>>(new Map());

    const anonymousId = useAnonymousId(authenticated);

    const userId = privyUser?.id || anonymousId;

    const authenticatedUsername = (cachedUser as any)?.username;
    const anonymousSuffix = anonymousId ? anonymousId.slice(-4) : '0000';
    const username = authenticatedUsername || (authenticated ? 'Anonymous' : `Viewer #${anonymousSuffix}`);

    const userColor = useUserColor(userId);

    const [resolvedId, setResolvedId] = useState<string | null>(null);
    const [resolvedSlug, setResolvedSlug] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);
    useEffect(() => {
        const raw = typeof routeParams?.id === 'string' ? routeParams.id : String(routeParams?.id || '');
        if (!raw) return;
        // Resolve slug to id if needed
        (async () => {
            try {
                const res = await fetch(`/api/experimental/rationales/${encodeURIComponent(raw)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.id) {
                        setResolvedId(data.id);
                        setResolvedSlug(data.slug || null);
                        try {
                            const host = typeof window !== 'undefined' ? window.location.host : '';
                            const canonical = buildRationaleDetailPath(data.id, host, data.slug || undefined);
                            const current = typeof window !== 'undefined' ? window.location.pathname : '';
                            if (canonical && current && canonical !== current) {
                                router.replace(canonical);
                            }
                        } catch { }
                    } else {
                        console.error('[Slug Resolution] API returned invalid data:', data);
                        setResolvedId(raw);
                    }
                } else if (res.status === 404) {
                    console.error('[Slug Resolution] Document not found:', raw);
                    setNotFound(true);
                } else {
                    console.error('[Slug Resolution] API request failed:', res.status, res.statusText);
                    setResolvedId(raw);
                }
            } catch (err) {
                console.error('[Slug Resolution] Failed to resolve slug:', err);
                setResolvedId(raw);
            }
        })();
    }, [routeParams?.id, router]);

    const roomName = useMemo(() => {
        const idPart = resolvedId || '';
        return `rationale:${idPart}`;
    }, [resolvedId]);

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
        stopCapturing,
        canUndo,
        canRedo,
    } = useYjsMultiplayer({
        roomName,
        initialNodes: initialGraph?.nodes || [],
        initialEdges: initialGraph?.edges || [],
        enabled: privyReady && Boolean(initialGraph) && Boolean(resolvedId),
        localOrigin: localOriginRef.current,
        currentUserId: userId,
        onRemoteNodesAdded: (ids: string[]) => {
            for (const id of ids) markNodeCenterOnce(id);
        }
    });
    useEffect(() => {
        const enableMindchange = ["true", "1", "yes", "on"].includes(String(process.env.NEXT_PUBLIC_ENABLE_MINDCHANGE || '').toLowerCase());
        if (!enableMindchange) return;
        if (!resolvedId || !ydoc || !yMetaMap) return;
        if (!edges || edges.length === 0) return;
        (async () => {
            try {
                const ids = edges.map((e) => e.id);
                const map = await getMindchangeAveragesForEdges(resolvedId, ids);
                if (!map) return;
                (ydoc as any).transact(() => {
                    for (const [eid, averages] of Object.entries(map)) {
                        const key = `mindchange:${eid}`;
                        const existing = (yMetaMap as any).get(key);
                        if (!existing) {
                            (yMetaMap as any).set(key, averages);
                        }
                    }
                }, ORIGIN.RUNTIME);
            } catch { }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resolvedId, ydoc, yMetaMap, edges]);

    useEffect(() => {
        if (!resolvedId || !authenticated) return;
        recordOpen(resolvedId).catch(() => { });
    }, [resolvedId, authenticated]);

    const [requireAuth, setRequireAuth] = useState<boolean>(isProductionEnvironment());
    useEffect(() => {
        try {
            const host = typeof window !== 'undefined' ? window.location.hostname : '';
            setRequireAuth(isProductionRequest(host));
        } catch { }
    }, []);

    const {
        dbTitle,
        ownerId,
        titleEditingUser,
        loadDbTitle,
        handleTitleChange,
        handleTitleEditingStart,
        handleTitleEditingStop,
        handleTitleSavingStart,
        handleTitleSavingStop,
        handleTitleCountdownStart,
        handleTitleCountdownStop,
    } = useMultiplayerTitle({
        routeParams,
        yMetaMap,
        ydoc,
        provider,
        localOrigin: localOriginRef.current,
    });

    const { getNodeCenter, getEdgeMidpoint } = useNodeHelpers({ nodes, edges });


    const { canWrite } = useWriteAccess(provider, userId);
    const canEdit = Boolean(canWrite && isConnected);
    useEffect(() => {
        if (!connectMode) return;
        setNodes((current) => {
            const existing = new Set(current.map((n: any) => n.id));
            const additions: Node[] = [];
            for (const e of edges) {
                if (e.type === 'objection') continue;
                const anchorId = `anchor:${e.id}`;
                if (existing.has(anchorId)) continue;
                const midpoint = getEdgeMidpoint(e.id) || { x: 0, y: 0 };
                const anchorNode: Node = { id: anchorId, type: 'edge_anchor', position: midpoint, data: { parentEdgeId: e.id }, draggable: false, selectable: false } as Node;
                additions.push(anchorNode);
                existing.add(anchorId);
                // Anchor nodes are local-only; do not sync to Yjs
            }
            return additions.length ? [...current, ...additions] : current;
        });
    }, [connectMode, edges, getEdgeMidpoint, setNodes, yNodesMap, ydoc, canWrite]);

    const broadcastCursor = true;
    const broadcastLocks = true;

    const cursors = useMultiplayerCursors({ provider, userId, username, userColor, canWrite: canEdit, broadcastCursor });
    const { startEditing, stopEditing, getEditorsForNode, lockNode, unlockNode, isLockedForMe, getLockOwner, markNodeActive, locks } = useMultiplayerEditing({ provider, userId, username, userColor, canWrite: canEdit, broadcastLocks });

    const { preferredEdgeTypeRef, updateEdgeType } = useEdgeTypeManager({
        nodes,
        edges,
        yNodesMap,
        yEdgesMap,
        yTextMap,
        ydoc,
        canWrite: canEdit,
        localOrigin: localOriginRef.current,
        setNodes,
        setEdges,
        isLockedForMe,
        getLockOwner,
    });

    const [editingSet, setEditingSet] = useState<Set<string>>(new Set());

    // Update node draggability when locks or grabMode change
    useEffect(() => {
        setNodes((currentNodes) =>
            currentNodes.map((node) => {
                const isLocked = isLockedForMe(node.id);
                const shouldBeDraggable = !isLocked && !grabMode;
                if (node.draggable === shouldBeDraggable) return node; // No change needed
                return { ...node, draggable: shouldBeDraggable };
            })
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locks, grabMode, setNodes]);

    // Update edge selectability when grabMode changes
    useEffect(() => {
        setEdges((currentEdges) =>
            currentEdges.map((edge) => {
                const shouldBeSelectable = !grabMode;
                if ((edge as any).selectable === shouldBeSelectable) return edge; // No change needed
                return { ...edge, selectable: shouldBeSelectable };
            })
        );
    }, [grabMode, setEdges]);
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
        getLockOwner,
        connectMode,
    });

    const getViewportOffset = React.useCallback(() => {
        const nodeSpacing = 16;
        return { x: 0, y: nodeSpacing };
    }, []);

    const writeSynced = useWritableSync({
        canWrite: canEdit,
        yNodesMap: yNodesMap as any,
        yEdgesMap: yEdgesMap as any,
        yTextMap: yTextMap as any,
        setNodes: setNodes as any,
        setEdges: setEdges as any,
        clearConnect: clearConnect,
    });

    const clearNodeSelection = React.useCallback(() => {
        setNodes((nds: any[]) => {
            let changed = false;
            const next = nds.map((node: any) => {
                if (node?.selected) {
                    changed = true;
                    return { ...node, selected: false };
                }
                return node;
            });
            return changed ? next : nds;
        });
    }, [setNodes]);

    const {
        updateNodeContent,
        updateNodeHidden,
        updateNodePosition,
        updateNodeFavor,
        deleteNode,
        addPointBelow,
        addObjectionForEdge,
        updateEdgeAnchorPosition,
        ensureEdgeAnchor,
        addNodeAtPosition,
        updateNodeType,
        createInversePair: inversePair,
        deleteInversePair,
        updateEdgeRelevance,
        duplicateNodeWithConnections,
    } = useGraphOperations({
        nodes,
        edges,
        yNodesMap,
        yEdgesMap,
        yTextMap,
        ydoc,
        yMetaMap,
        documentId: resolvedId || undefined,
        canWrite: canEdit,
        writeSynced,
        localOrigin: localOriginRef.current,
        lastAddRef,
        setNodes,
        setEdges,
        isLockedForMe,
        getLockOwner,
        getViewportOffset,
        onEdgeCreated: ({ edgeId, edgeType }) => {
            if (edgeType === 'support' || edgeType === 'negation') {
                preferredEdgeTypeRef.current = edgeType;
            }
            // Select the new edge and reveal its HUD; do NOT select the node
            setSelectedEdgeId(edgeId);
            setHoveredEdgeId(edgeId);
        },
        getPreferredEdgeType: ({ parent }) => {
            if (parent?.type === 'point' || parent?.type === 'objection') {
                return preferredEdgeTypeRef.current;
            }
            return preferredEdgeTypeRef.current;
        },
        onShowUndoHint: setUndoHintPosition,
        onClearSelections: () => {
            clearNodeSelection();
            setSelectedEdgeId(null);
            setHoveredEdgeId(null);
        },
        onNodeAddedCenterOnce: markNodeCenterOnce,
    });
    const { onNodesChange, onEdgesChange, onConnect, commitNodePositions } = createGraphChangeHandlers(
        setNodes,
        setEdges,
        canEdit && writeSynced ? yNodesMap : null,
        canEdit && writeSynced ? yEdgesMap : null,
        canEdit && writeSynced ? ydoc : null,
        syncYMapFromArray,
        localOriginRef.current,
        () => nodes as any[],
        () => preferredEdgeTypeRef.current
    );

    const {
        beginConnectFromNode,
        beginConnectFromEdge,
        completeConnectToNode,
        completeConnectToEdge,
        cancelConnect: cancelConnectHandler,
    } = useConnectionHandlers({
        nodes,
        edges,
        yNodesMap,
        yEdgesMap,
        ydoc,
        canWrite: canEdit,
        localOrigin: localOriginRef.current,
        setNodes,
        setEdges,
        connectMode,
        connectAnchorId,
        connectAnchorRef,
        setConnectMode,
        setConnectAnchorId,
        setConnectCursor,
        isLockedForMe,
        getLockOwner,
        getNodeCenter,
        getEdgeMidpoint,
        getPreferredEdgeType: () => preferredEdgeTypeRef.current,
        mindchangeSelectMode,
        setSelectedEdgeId: setSelectedEdgeId,
        mindchangeEdgeId,
        setMindchangeNextDir,
    });


    useKeyboardShortcuts(undo, redo, {
        onToggleConnect: () => {
            if (!canEdit) return;
            setConnectMode((v) => !v);
            setConnectAnchorId(null);
            setMindchangeSelectMode(false);
        },
        onExitConnect: () => {
            setConnectMode(false);
            setConnectAnchorId(null);
            setMindchangeSelectMode(false);
        },
        onPointerMode: () => {
            setConnectMode(false);
            setGrabMode(false);
            setConnectAnchorId(null);
            setMindchangeSelectMode(false);
        },
        onToggleGrab: () => {
            setConnectMode(false);
            setGrabMode((g) => !g);
            setConnectAnchorId(null);
            setMindchangeSelectMode(false);
        }
    });



    if (notFound) {
        return (
            <div className="fixed inset-0 top-16 bg-gray-50 flex items-center justify-center">
                <div className="text-center bg-white px-8 py-6 rounded-lg border shadow-sm max-w-md">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Board Not Found</h2>
                    <p className="text-gray-600 mb-4">
                        The board you&apos;re looking for doesn&apos;t exist or may have been deleted.
                    </p>
                    <button
                        onClick={() => router.push('/experiment/rationale/multiplayer')}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                        Go to Boards List
                    </button>
                </div>
            </div>
        );
    }

    if (privyReady && !authenticated && requireAuth) {
        return <AuthGate onLogin={login as any} />;
    }

    // Show loading state until Privy is ready (or timeout) AND board data is loaded
    if (!privyReady || !nodes || nodes.length === 0) {
        return (
            <div className="fixed inset-0 top-16 bg-gray-50/80 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(249, 250, 251, 0.8)' }}>
                <div className="text-center bg-white/80 px-6 py-4 rounded-lg border shadow-sm">
                    <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <div className="text-sm text-gray-600">Loading board…</div>
                </div>
            </div>
        );
    }



    return (
        <div className={`fixed inset-0 top-16 bg-gray-50 ${robotoSlab.className}`} style={{ backgroundColor: '#f9fafb' }}>
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
                proxyMode={!canEdit}
                userId={userId}
                title={dbTitle || 'Untitled'}
                documentId={resolvedId || ''}
                onTitleChange={handleTitleChange}
                onTitleEditingStart={handleTitleEditingStart}
                onTitleEditingStop={handleTitleEditingStop}
                onTitleCountdownStart={handleTitleCountdownStart}
                onTitleCountdownStop={handleTitleCountdownStop}
                onTitleSavingStart={handleTitleSavingStart}
                onTitleSavingStop={handleTitleSavingStop}
                titleEditingUser={titleEditingUser}
                onResyncNow={resyncNow}
            />

            <ReactFlowProvider>
                <PerfProvider value={{ perfMode: (((nodes?.length || 0) + (edges?.length || 0)) > 600) || perfBoost || grabMode, setPerfMode: setPerfBoost }}>
                    <GraphProvider value={{
                        updateNodeContent,
                        updateNodeHidden,
                        updateNodePosition,
                        updateNodeFavor,
                        addPointBelow,
                        preferredEdgeType: preferredEdgeTypeRef.current,
                        createInversePair: inversePair,
                        deleteNode,
                        startEditingNode: startEditingNodeCtx,
                        stopEditingNode: stopEditingNodeCtx,
                        getEditorsForNode,
                        isLockedForMe,
                        getLockOwner,
                        isAnyNodeEditing,
                        grabMode,
                        clearNodeSelection,
                        beginConnectFromNode,
                        beginConnectFromEdge,
                        completeConnectToNode,
                        completeConnectToEdge,
                        cancelConnect: cancelConnectHandler,
                        isConnectingFromNodeId: connectAnchorId,
                        connectMode,
                        addObjectionForEdge,
                        hoveredEdgeId,
                        setHoveredEdge: setHoveredEdgeId,
                        updateEdgeRelevance,
                        updateEdgeType,
                        selectedEdgeId,
                        setSelectedEdge: setSelectedEdgeId,
                        overlayActiveEdgeId,
                        setOverlayActiveEdge: setOverlayActiveEdgeId,
                        updateEdgeAnchorPosition,
                        ensureEdgeAnchor,
                        lockNode,
                        unlockNode,
                        markNodeActive,
                        proxyMode: !canEdit,
                        undo,
                        redo,
                        stopCapturing,
                        addNodeAtPosition,
                        updateNodeType,
                        deleteInversePair,
                        duplicateNodeWithConnections,
                        setPairNodeHeight,
                        pairHeights,
                        hoveredNodeId: hoveredNodeId,
                        setHoveredNodeId: (nid: string | null) => {
                            // Ensure only one node can be hovered at a time
                            if (nid !== null && hoveredNodeId === nid) {
                                return; // Already hovering this node
                            }
                            setHoveredNodeId(nid);
                        },
                        commitGroupLayout: (groupId: string, positions: Record<string, { x: number; y: number }>, width: number, height: number) => {
                            commitGroupLayoutBase(groupId, positions, width, height, nodes, yNodesMap, ydoc, canEdit, localOriginRef.current, setNodes);
                        },
                        blurNodesImmediately,
                        mindchangeMode: mindchangeSelectMode,
                        mindchangeEdgeId,
                        mindchangeNextDir,
                        beginMindchangeSelection: () => {
                            const enableMindchange = ["true", "1", "yes", "on"].includes(String(process.env.NEXT_PUBLIC_ENABLE_MINDCHANGE || '').toLowerCase());
                            if (!enableMindchange) return;
                            setMindchangeSelectMode(true);
                            setConnectMode(true);
                            setConnectAnchorId(null);
                        },
                        beginMindchangeOnEdge: (edgeId: string) => {
                            const enableMindchange = ["true", "1", "yes", "on"].includes(String(process.env.NEXT_PUBLIC_ENABLE_MINDCHANGE || '').toLowerCase());
                            if (!enableMindchange) return;
                            try { console.debug('[Mindchange] begin on edge', edgeId); } catch { }
                            setMindchangeSelectMode(true);
                            setMindchangeEdgeId(edgeId);
                            setMindchangeNextDir(null);
                            setConnectMode(false);
                            setConnectAnchorId(null);
                        },
                        cancelMindchangeSelection: () => {
                            setMindchangeSelectMode(false);
                            setMindchangeEdgeId(null);
                            setMindchangeNextDir(null);
                            setConnectMode(false);
                            setConnectAnchorId(null);
                        },
                        setMindchangeNextDir: setMindchangeNextDir,
                        setMindchange: async (edgeId: string, params: { forward?: number; backward?: number }) => {
                            const enableMindchange = ["true", "1", "yes", "on"].includes(String(process.env.NEXT_PUBLIC_ENABLE_MINDCHANGE || '').toLowerCase());
                            if (!enableMindchange) return;
                            if (!resolvedId) return;
                            try {
                                const edgeTypeNow = (edges.find((e: any) => e.id === edgeId)?.type === 'negation') ? 'negation' : 'support';
                                const res = await setMindchangeAction(resolvedId, edgeId, params.forward, params.backward, edgeTypeNow as any, userId);
                                if ((res as any)?.ok && ydoc && yMetaMap) {
                                    const averages = (res as any).averages as { forward: number; backward: number; forwardCount: number; backwardCount: number };
                                    const key = `mindchange:${edgeId}`;
                                    try {
                                        (ydoc as any).transact(() => {
                                            (yMetaMap as any).set(key, averages);
                                        }, ORIGIN.RUNTIME);
                                    } catch { }
                                    try {
                                        const ukey = `mindchange:user:${userId}:${edgeId}`;
                                        const prev = (yMetaMap as any).get(ukey) || {};
                                        const snapshot = {
                                            forward: typeof params.forward === 'number' ? Math.max(0, Math.min(100, Math.round(params.forward))) : (typeof prev.forward === 'number' ? prev.forward : undefined),
                                            backward: typeof params.backward === 'number' ? Math.max(0, Math.min(100, Math.round(params.backward))) : (typeof prev.backward === 'number' ? prev.backward : undefined),
                                        } as any;
                                        (ydoc as any).transact(() => {
                                            (yMetaMap as any).set(ukey, snapshot);
                                        }, localOriginRef.current);
                                    } catch { }
                                    // Optimistic local patch to avoid brief stale UI
                                    try {
                                        setEdges((prev) => prev.map((e: any) => e.id === edgeId ? { ...e, data: { ...(e.data || {}), mindchange: { forward: { average: averages.forward, count: averages.forwardCount }, backward: { average: averages.backward, count: averages.backwardCount } } } } : e));
                                    } catch { }
                                    try {
                                        setMindchangeSelectMode(false);
                                        setMindchangeEdgeId(null);
                                        setMindchangeNextDir(null);
                                        setSelectedEdgeId(null);
                                    } catch { }
                                }
                            } catch { }
                        },
                        getMindchangeBreakdown: async (edgeId: string) => {
                            if (!resolvedId) return { forward: [], backward: [] };
                            try {
                                const key = edgeId;
                                const now = Date.now();
                                const cached = mcCacheRef.current.get(key);
                                if (cached && (now - cached.ts) < 30000) {
                                    return cached.data;
                                }
                                const res = await getMindchangeBreakdownAction(resolvedId, edgeId);
                                mcCacheRef.current.set(key, { ts: now, data: res });
                                return res;
                            } catch {
                                return { forward: [], backward: [] };
                            }
                        },
                    }}>
                        <div className="w-full h-full relative">
                            <GraphCanvas
                                nodes={nodes as any}
                                edges={edges as any}
                                authenticated={authenticated}
                                canWrite={canEdit}
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
                                grabMode={grabMode}
                                panOnDrag={grabMode ? [0, 1, 2] : [1]}
                                panOnScroll={true}
                                zoomOnScroll={false}
                                connectMode={connectMode}
                                mindchangeMode={mindchangeSelectMode}
                                connectAnchorId={connectAnchorId}
                                selectMode={selectMode}
                                blurAllNodes={forceBlurNodes}
                                forceSave={forceSave}
                                yMetaMap={yMetaMap as any}
                                onFlowMouseMove={(x, y) => {
                                    if (!connectAnchorRef.current) return;
                                    setConnectCursor({ x, y });
                                }}
                                connectCursor={connectCursor}
                                onBackgroundMouseUp={() => {
                                    setConnectAnchorId(null);
                                    connectAnchorRef.current = null;
                                    setConnectCursor(null);
                                }}
                                onBackgroundDoubleClick={(flowX, flowY) => {
                                    if (connectMode) return;
                                    if (!canEdit) {
                                        toast.warning("Read-only mode: Changes won't be saved");
                                        return;
                                    }
                                    const nodeId = addNodeAtPosition('point', flowX, flowY);

                                    setTimeout(() => {
                                        const element = document.querySelector(`[data-id="${nodeId}"]`);
                                        if (element) {
                                            const rect = element.getBoundingClientRect();
                                            setNewNodeWithDropdown({
                                                id: nodeId,
                                                x: rect.right + 16,
                                                y: rect.top - 8
                                            });
                                        } else {
                                            setNewNodeWithDropdown({
                                                id: nodeId,
                                                x: window.innerWidth / 2 - 120,
                                                y: window.innerHeight / 2 - 50
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
                                readOnly={!canEdit}
                                grabMode={grabMode}
                                setGrabMode={setGrabMode}
                                selectMode={selectMode}
                                mindchangeMode={mindchangeSelectMode}
                                onMindchangeDone={() => {
                                    setMindchangeSelectMode(false);
                                    setConnectMode(false);
                                    setConnectAnchorId(null);
                                }}
                                mindchangeNextDir={mindchangeNextDir}
                                mindchangeEdgeType={(mindchangeEdgeId || connectAnchorId) ? edges.find((e: any) => e.id === (mindchangeEdgeId || connectAnchorId))?.type : undefined}

                            />
                        </div>
                        <GraphUpdater nodes={nodes} edges={edges} setNodes={setNodes} documentId={resolvedId || ''} centerQueueVersion={centerQueueVersion} consumeCenterQueue={consumeCenterQueue} />
                    </GraphProvider>
                </PerfProvider>

                {newNodeWithDropdown && (
                    <TypeSelectorDropdown
                        open={true}
                        x={newNodeWithDropdown.x}
                        y={newNodeWithDropdown.y}
                        currentType="point"
                        onClose={() => setNewNodeWithDropdown(null)}
                        onSelect={(type) => {
                            updateNodeType(newNodeWithDropdown.id, type);
                            setNewNodeWithDropdown(null);
                        }}
                    />
                )}
            </ReactFlowProvider>
            <UndoHintOverlay
                position={undoHintPosition}
                onDismiss={() => setUndoHintPosition(null)}
            />
        </div>
    );
}
