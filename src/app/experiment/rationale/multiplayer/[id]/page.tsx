'use client';

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ReactFlowProvider, } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { usePrivy } from '@privy-io/react-auth';
import { userQueryKey } from '@/queries/users/useUser';
import { useQueryClient } from '@tanstack/react-query';
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
import { useWriteAccess } from '@/hooks/experiment/multiplayer/useWriteAccess';
import { useWritableSync } from '@/hooks/experiment/multiplayer/useWritableSync';
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
    createUpdateEdgeType,
    createAddNodeAtPosition,
    createUpdateNodeType,
    createInversePair,
    createDeleteInversePair
} from '@/utils/experiment/multiplayer/graphOperations';
import { Roboto_Slab } from 'next/font/google';
import { recordOpen } from '@/actions/experimental/rationales';

const robotoSlab = Roboto_Slab({ subsets: ['latin'] });

export default function MultiplayerBoardDetailPage() {
    const routeParams = useParams<{ id: string }>();
    const { authenticated, ready, login, user: privyUser } = usePrivy();

    const [connectMode, setConnectMode] = useState<boolean>(false);
    const [grabMode, setGrabMode] = useState<boolean>(false);
    const [connectAnchorId, setConnectAnchorId] = useState<string | null>(null);
    const connectAnchorRef = useRef<string | null>(null);
    useEffect(() => {
        if (!connectAnchorId) {
            connectAnchorRef.current = null;
            setConnectCursor(null);
        }
    }, [connectAnchorId]);
    const [connectCursor, setConnectCursor] = useState<{ x: number; y: number } | null>(null);
    useEffect(() => {
        if (!connectMode) {
            setConnectAnchorId(null);
            connectAnchorRef.current = null;
            setConnectCursor(null);
        }
    }, [connectMode]);
    const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
    const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
    const [newNodeWithDropdown, setNewNodeWithDropdown] = useState<{ id: string, x: number, y: number } | null>(null);
    const localOriginRef = useRef<object>({});
    const lastAddRef = useRef<Record<string, number>>({});
    const [pairNodeHeights, setPairNodeHeights] = useState<Record<string, Record<string, number>>>({});
    const [pairHeights, setPairHeights] = useState<Record<string, number>>({});
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    const [titleEditingUser, setTitleEditingUser] = useState<{ name: string; color: string } | null>(null);

    const initialGraph = useInitialGraph();
    const [dbTitle, setDbTitle] = useState<string | null>(null);
    const [ownerId, setOwnerId] = useState<string | null>(null);


    const loadDbTitle = useCallback(async () => {
        if (!routeParams?.id) return;
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
    }, [routeParams?.id]);

    useEffect(() => {
        loadDbTitle();
    }, [loadDbTitle]);


    const queryClient = useQueryClient();
    const cachedUser = queryClient.getQueryData(userQueryKey(privyUser?.id));
    const username = (cachedUser as any)?.username || 'Anonymous';
    const userId = privyUser?.id || '';

    const userColor = useUserColor(userId);

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
    } = useYjsMultiplayer({
        roomName,
        initialNodes: initialGraph?.nodes || [],
        initialEdges: initialGraph?.edges || [],
        enabled: ready && authenticated && Boolean(initialGraph),
        localOrigin: localOriginRef.current,
        onSaveComplete: loadDbTitle,
    });

    const loadDbTitleWithSync = useCallback(async () => {
        if (!routeParams?.id) return;
        try {
            const rid = typeof routeParams.id === 'string' ? routeParams.id : String(routeParams.id);
            try { await recordOpen(rid); } catch { }
            const res = await fetch(`/api/experimental/rationales/${encodeURIComponent(rid)}`);
            if (res.ok) {
                const data = await res.json();
                const normalizedTitle = data.title || null;
                setDbTitle(normalizedTitle);
                setOwnerId(data.ownerId || null);

                if (yMetaMap && ydoc && normalizedTitle) {
                    ydoc.transact(() => {
                        yMetaMap.set('title', normalizedTitle);
                    }, localOriginRef.current);
                }
            }
        } catch (e) {
            console.error('[title] Failed to load DB title:', e);
        }
    }, [routeParams?.id, yMetaMap, ydoc]);

    useEffect(() => {
        if (!yMetaMap || !ydoc) return;

        const handleMetaChange = () => {
            const syncedTitle = yMetaMap.get('title') as string;
            if (syncedTitle && syncedTitle !== dbTitle) {
                setDbTitle(syncedTitle);
            }
        };

        yMetaMap.observe(handleMetaChange);

        return () => {
            yMetaMap.unobserve(handleMetaChange);
        };
    }, [yMetaMap, ydoc, dbTitle]);

    useEffect(() => {
        if (yMetaMap && ydoc) {
            loadDbTitleWithSync();
        }
    }, [yMetaMap, ydoc, loadDbTitleWithSync]);

    useEffect(() => {
        if (!provider?.awareness) return;

        const awareness = provider.awareness;

        const handleAwarenessChange = () => {
            const states = Array.from(awareness.getStates().entries());
            const titleEditor = states.find(([clientId, state]: [number, any]) =>
                clientId !== awareness.clientID && (state.editingTitle || state.countdownTitle || state.savingTitle)
            );

            if (titleEditor) {
                const [, state] = titleEditor;
                setTitleEditingUser({
                    name: state.user?.name || 'Someone',
                    color: state.user?.color || '#666'
                });
            } else {
                setTitleEditingUser(null);
            }
        };

        awareness.on('change', handleAwarenessChange);
        return () => {
            awareness.off('change', handleAwarenessChange);
        };
    }, [provider?.awareness]);

    const handleTitleEditingStart = useCallback(() => {
        if (provider?.awareness) {
            provider.awareness.setLocalStateField('editingTitle', true);
        }
    }, [provider?.awareness]);

    const handleTitleEditingStop = useCallback(() => {
        if (provider?.awareness) {
            provider.awareness.setLocalStateField('editingTitle', false);
        }
    }, [provider?.awareness]);

    const handleTitleSavingStart = useCallback(() => {
        if (provider?.awareness) {
            provider.awareness.setLocalStateField('savingTitle', true);
        }
    }, [provider?.awareness]);

    const handleTitleSavingStop = useCallback(() => {
        if (provider?.awareness) {
            provider.awareness.setLocalStateField('savingTitle', false);
        }
    }, [provider?.awareness]);

    const handleTitleCountdownStart = useCallback(() => {
        if (provider?.awareness) {
            provider.awareness.setLocalStateField('countdownTitle', true);
        }
    }, [provider?.awareness]);

    const handleTitleCountdownStop = useCallback(() => {
        if (provider?.awareness) {
            provider.awareness.setLocalStateField('countdownTitle', false);
        }
    }, [provider?.awareness]);

    const getNodeCenter = useCallback((nodeId: string) => {
        const node = (nodes as any[])?.find?.((n: any) => n.id === nodeId);
        if (!node) return null;
        const abs = node.positionAbsolute || node.position || { x: 0, y: 0 };
        const point = abs as { x?: number; y?: number };
        const baseX = typeof point.x === 'number' ? point.x : 0;
        const baseY = typeof point.y === 'number' ? point.y : 0;
        const measured = (node as any).measured as { width?: number; height?: number } | undefined;
        const style = node.style as { width?: number; height?: number } | undefined;
        const width = typeof node.width === 'number'
            ? node.width
            : (typeof measured?.width === 'number'
                ? measured.width
                : (typeof style?.width === 'number' ? style.width : 0));
        const height = typeof node.height === 'number'
            ? node.height
            : (typeof measured?.height === 'number'
                ? measured.height
                : (typeof style?.height === 'number' ? style.height : 0));
        return { x: baseX + (width || 0) / 2, y: baseY + (height || 0) / 2 };
    }, [nodes]);

    const getEdgeMidpoint = useCallback((edgeId: string) => {
        const edge = (edges as any[])?.find?.((e: any) => e.id === edgeId);
        if (!edge) return null;
        const sourceCenter = getNodeCenter(edge.source);
        const targetCenter = getNodeCenter(edge.target);
        if (sourceCenter && targetCenter) {
            return {
                x: (sourceCenter.x + targetCenter.x) / 2,
                y: (sourceCenter.y + targetCenter.y) / 2,
            };
        }
        return null;
    }, [edges, getNodeCenter]);


    const { canWrite } = useWriteAccess(provider, userId);

    const cursors = useMultiplayerCursors({ provider, userId, username, userColor, canWrite });
    const { startEditing, stopEditing, getEditorsForNode, lockNode, unlockNode, isLockedForMe, getLockOwner, locks } = useMultiplayerEditing({ provider, userId, username, userColor, canWrite });
    const [editingSet, setEditingSet] = useState<Set<string>>(new Set());

    // Update node draggability when locks change
    useEffect(() => {
        setNodes((currentNodes) =>
            currentNodes.map((node) => {
                const isLocked = isLockedForMe(node.id);
                if (node.draggable === !isLocked) return node; // No change needed
                return { ...node, draggable: !isLocked };
            })
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locks, setNodes]);
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

    const deleteNode = createDeleteNode(
        nodes,
        edges,
        yNodesMap,
        yEdgesMap,
        yTextMap,
        ydoc,
        canWrite,
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
        canWrite,
        localOriginRef.current,
        lastAddRef,
        setNodes,
        setEdges,
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
        canWrite,
        localOriginRef.current,
        lastAddRef,
        setNodes,
        setEdges,
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
        canWrite,
        localOriginRef.current,
        lastAddRef,
        setNodes,
        setEdges,
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
        canWrite,
        localOriginRef.current,
        setNodes,
        setEdges,
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
            canWrite,
            localOriginRef.current,
            setNodes as any,
            setEdges as any,
            isLockedForMe,
            getLockOwner,
        )
    ), [nodes, edges, yNodesMap, yEdgesMap, yTextMap, ydoc, canWrite, setNodes, setEdges, isLockedForMe, getLockOwner]);


    const updateNodeFavor = (nodeId: string, favor: 1 | 2 | 3 | 4 | 5) => {
        setNodes((nds: any[]) => nds.map(n => n.id === nodeId ? { ...n, data: { ...(n.data || {}), favor } } : n));
        if (yNodesMap && ydoc && canWrite) {
            ydoc.transact(() => {
                const base = (yNodesMap as any).get(nodeId);
                if (base) (yNodesMap as any).set(nodeId, { ...base, data: { ...(base.data || {}), favor } });
            }, localOriginRef.current);
        }
    };

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
    const updateEdgeRelevance = (edgeId: string, relevance: 1 | 2 | 3 | 4 | 5) => {
        setEdges((eds: any[]) => eds.map(e => e.id === edgeId ? { ...e, data: { ...(e.data || {}), relevance } } : e));
        if (yEdgesMap && ydoc && canWrite) {
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

    const writeSynced = useWritableSync({
        canWrite,
        yNodesMap: yNodesMap as any,
        yEdgesMap: yEdgesMap as any,
        yTextMap: yTextMap as any,
        setNodes: setNodes as any,
        setEdges: setEdges as any,
        clearConnect,
    });

    const updateEdgeAnchorPosition = createUpdateEdgeAnchorPosition(
        setNodes as any,
        canWrite && writeSynced ? (yNodesMap as any) : null,
        canWrite && writeSynced ? (ydoc as any) : null,
        canWrite && writeSynced,
        localOriginRef.current,
        undefined
    );

    const { onNodesChange, onEdgesChange, onConnect, commitNodePositions } = createGraphChangeHandlers(
        setNodes,
        setEdges,
        canWrite && writeSynced ? yNodesMap : null,
        canWrite && writeSynced ? yEdgesMap : null,
        canWrite && writeSynced ? ydoc : null,
        syncYMapFromArray,
        localOriginRef.current,
        () => nodes as any[]
    );

    const updateNodeContent = createUpdateNodeContent(
        yTextMap as any,
        ydoc as any,
        canWrite,
        localOriginRef.current,
        setNodes
    );

    const inversePair = createInversePair(
        nodes,
        yNodesMap,
        yTextMap,
        yEdgesMap,
        ydoc,
        canWrite,
        localOriginRef.current,
        setNodes,
        setEdges,
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
            if (!canWrite) return;
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



    if (!ready) {
        return <LoadingState />;
    }

    if (!authenticated) {
        return <AuthGate onLogin={login} />;
    }




    return (
        <div className={`fixed inset-0 top-16 bg-gray-50 ${robotoSlab.className}`}>
            {(!nodes || nodes.length === 0) && (
                <div className="fixed inset-0 top-16 bg-gray-50/80 z-50 flex items-center justify-center">
                    <div className="text-center bg-white/80 px-6 py-4 rounded-lg border shadow-sm">
                        <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <div className="text-sm text-gray-600">Loading board…</div>
                    </div>
                </div>
            )}

            {nodes && nodes.length > 0 && (
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
                    proxyMode={!canWrite}
                    userId={userId}
                    title={dbTitle || 'Untitled'}
                    documentId={typeof routeParams?.id === 'string' ? routeParams.id : String(routeParams?.id || '')}
                    onTitleChange={(newTitle: string) => {
                        setDbTitle(newTitle);
                        // Sync title change to other clients via Yjs meta map
                        if (yMetaMap && ydoc) {
                            ydoc.transact(() => {
                                yMetaMap.set('title', newTitle);
                            }, localOriginRef.current);
                        }
                    }}
                    onTitleEditingStart={handleTitleEditingStart}
                    onTitleEditingStop={handleTitleEditingStop}
                    onTitleCountdownStart={handleTitleCountdownStart}
                    onTitleCountdownStop={handleTitleCountdownStop}
                    onTitleSavingStart={handleTitleSavingStart}
                    onTitleSavingStop={handleTitleSavingStop}
                    titleEditingUser={titleEditingUser}
                />
            )}

            <ReactFlowProvider>
                <GraphProvider value={{
                    updateNodeContent,
                    updateNodeHidden: createUpdateNodeHidden(
                        yNodesMap as any,
                        ydoc as any,
                        canWrite,
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
                    grabMode,
                    clearNodeSelection,
                    beginConnectFromNode: (id: string, cursor?: { x: number; y: number }) => {
                        connectAnchorRef.current = id;
                        setConnectAnchorId(id);
                        const fallback = cursor || getNodeCenter(id);
                        if (fallback) {
                            setConnectCursor(fallback);
                        }
                    },
                    beginConnectFromEdge: (edgeId: string, cursor?: { x: number; y: number }) => {
                        const anchorId = `anchor:${edgeId}`;
                        connectAnchorRef.current = anchorId;
                        setConnectAnchorId(anchorId);
                        const midpoint = cursor || getEdgeMidpoint(edgeId);
                        if (midpoint) {
                            setConnectCursor(midpoint);
                        }
                        const edge = (edges as any[]).find(e => e.id === edgeId);
                        if (edge) {
                            const position = midpoint || getEdgeMidpoint(edgeId) || { x: 0, y: 0 };
                            const anchorNode: any = { id: anchorId, type: 'edge_anchor', position, data: { parentEdgeId: edgeId } };
                            setNodes((nds: any[]) => nds.some(n => n.id === anchorId) ? nds : [...nds, anchorNode]);
                        }
                    },
                    completeConnectToNode: (nodeId: string) => {
                        if (!connectMode) return;
                        if (!canWrite) {
                            toast.warning("Read-only mode: Changes won't be saved");
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
                        if (anchorId.startsWith('anchor:')) {
                            const edgeId = anchorId.slice('anchor:'.length);
                            const anchorIdForEdge = `anchor:${edgeId}`;
                            const anchorNodeExists = (nodes as any[]).some(n => n.id === anchorIdForEdge);
                            if (!anchorNodeExists) {
                                const midpoint = getEdgeMidpoint(edgeId) || { x: 0, y: 0 };
                                const anchorNode: any = { id: anchorIdForEdge, type: 'edge_anchor', position: midpoint, data: { parentEdgeId: edgeId } };
                                setNodes((nds: any[]) => nds.some(n => n.id === anchorIdForEdge) ? nds : [...nds, anchorNode]);
                                if (yNodesMap && ydoc && canWrite) {
                                    ydoc.transact(() => { if (!(yNodesMap as any).has(anchorIdForEdge)) (yNodesMap as any).set(anchorIdForEdge, anchorNode); }, localOriginRef.current);
                                }
                            }
                            const newObjEdge = { id: generateEdgeId(), type: 'objection', source: nodeId, target: anchorIdForEdge } as any;
                            setEdges((eds: any[]) => eds.some(e => e.id === newObjEdge.id) ? eds : [...eds, newObjEdge]);
                            if (yEdgesMap && ydoc && canWrite) {
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
                            setEdges((eds) => (eds.some(e => e.id === id) ? eds : [...eds, edge as any]));
                        }
                        if (yEdgesMap && ydoc && canWrite) {
                            ydoc.transact(() => { if (!yEdgesMap.has(id)) yEdgesMap.set(id, edge as any); }, localOriginRef.current);
                        }
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
                            return;
                        }
                        const originNode = (nodes as any[]).find(n => n.id === origin);
                        if (originNode) {
                            const anchorId = `anchor:${edgeId}`;
                            const anchorExists = (nodes as any[]).some(n => n.id === anchorId);
                            if (!anchorExists) {
                                const midpoint = getEdgeMidpoint(edgeId) || { x: midX ?? 0, y: midY ?? 0 };
                                const anchorNode: any = { id: anchorId, type: 'edge_anchor', position: midpoint, data: { parentEdgeId: edgeId } };
                                setNodes((nds: any[]) => nds.some(n => n.id === anchorId) ? nds : [...nds, anchorNode]);
                                if (yNodesMap && ydoc && canWrite) {
                                    ydoc.transact(() => { if (!(yNodesMap as any).has(anchorId)) (yNodesMap as any).set(anchorId, anchorNode); }, localOriginRef.current);
                                }
                            }
                            const newEdge = { id: generateEdgeId(), type: 'objection', source: originNode.id, target: `anchor:${edgeId}` } as any;
                            setEdges((eds: any[]) => eds.some(e => e.id === newEdge.id) ? eds : [...eds, newEdge]);
                            if (yEdgesMap && ydoc && canWrite) {
                                ydoc.transact(() => { if (!(yEdgesMap as any).has(newEdge.id)) (yEdgesMap as any).set(newEdge.id, newEdge); }, localOriginRef.current);
                            }
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
                    updateEdgeType: createUpdateEdgeType(
                        nodes as any,
                        edges as any,
                        yNodesMap as any,
                        yEdgesMap as any,
                        ydoc as any,
                        canWrite,
                        localOriginRef.current,
                        setNodes as any,
                        setEdges as any,
                        isLockedForMe,
                        getLockOwner
                    ),
                    selectedEdgeId,
                    setSelectedEdge: setSelectedEdgeId,
                    updateEdgeAnchorPosition,
                    lockNode,
                    unlockNode,
                    proxyMode: !canWrite,
                    undo,
                    redo,
                    addNodeAtPosition: createAddNodeAtPosition(
                        yNodesMap as any,
                        yTextMap as any,
                        ydoc as any,
                        canWrite,
                        localOriginRef.current,
                        setNodes as any,
                    ),
                    updateNodeType: createUpdateNodeType(
                        yNodesMap as any,
                        yTextMap as any,
                        ydoc as any,
                        canWrite,
                        localOriginRef.current,
                        setNodes as any,
                    ),
                    deleteInversePair,
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
                        if (!canWrite) return;
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
                            grabMode={grabMode}
                            panOnDrag={grabMode ? [0, 1, 2] : [1, 2]}
                            panOnScroll={true}
                            zoomOnScroll={false}
                            connectMode={connectMode}
                            connectAnchorId={connectAnchorId}
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
                                if (!canWrite) {
                                    toast.warning("Read-only mode: Changes won't be saved");
                                    return;
                                }
                                const addNodeAtPosition = createAddNodeAtPosition(
                                    yNodesMap as any,
                                    yTextMap as any,
                                    ydoc as any,
                                    canWrite,
                                    localOriginRef.current,
                                    setNodes as any,
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
                            readOnly={!canWrite}
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
                                canWrite,
                                localOriginRef.current,
                                setNodes as any,
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
