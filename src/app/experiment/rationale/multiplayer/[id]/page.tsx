'use client';

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ReactFlowProvider, Node } from '@xyflow/react';
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

const robotoSlab = Roboto_Slab({ subsets: ['latin'] });

export default function MultiplayerBoardDetailPage() {
    const routeParams = useParams<{ id: string }>();
    const { authenticated, ready, login, user: privyUser } = usePrivy();

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

    const [grabMode, setGrabMode] = useState<boolean>(false);
    const [perfBoost, setPerfBoost] = useState<boolean>(false);
    const [newNodeWithDropdown, setNewNodeWithDropdown] = useState<{ id: string, x: number, y: number } | null>(null);

    const { hoveredEdgeId, setHoveredEdgeId, selectedEdgeId, setSelectedEdgeId, revealEdgeTemporarily } = useEdgeSelection();
    const localOriginRef = useRef<object>({});
    const lastAddRef = useRef<Record<string, number>>({});
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    const [undoHintPosition, setUndoHintPosition] = useState<{ x: number; y: number } | null>(null);

    const { pairNodeHeights, pairHeights, setPairNodeHeight, commitGroupLayout: commitGroupLayoutBase } = usePairHeights();

    const initialGraph = useInitialGraph();


    const queryClient = useQueryClient();
    const cachedUser = queryClient.getQueryData(userQueryKey(privyUser?.id));

    const anonymousId = useAnonymousId(authenticated);

    const userId = privyUser?.id || anonymousId;

    const authenticatedUsername = (cachedUser as any)?.username;
    const anonymousSuffix = anonymousId ? anonymousId.slice(-4) : '0000';
    const username = authenticatedUsername || (authenticated ? 'Anonymous' : `Viewer #${anonymousSuffix}`);

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
        stopCapturing,
        canUndo,
        canRedo,
    } = useYjsMultiplayer({
        roomName,
        initialNodes: initialGraph?.nodes || [],
        initialEdges: initialGraph?.edges || [],
        enabled: ready && Boolean(initialGraph), // Allow unauthenticated access
        localOrigin: localOriginRef.current,
    });

    useEffect(() => {
        if (!routeParams?.id || !authenticated) return;
        const rid = typeof routeParams.id === 'string' ? routeParams.id : String(routeParams.id);
        recordOpen(rid).catch(() => { });
    }, [routeParams?.id, authenticated]);

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
                const anchorNode: Node = { id: anchorId, type: 'edge_anchor', position: midpoint, data: { parentEdgeId: e.id } } as Node;
                additions.push(anchorNode);
                existing.add(anchorId);
                // Anchor nodes are local-only; do not sync to Yjs
            }
            return additions.length ? [...current, ...additions] : current;
        });
    }, [connectMode, edges, getEdgeMidpoint, setNodes, yNodesMap, ydoc, canWrite]);

    const broadcastCursor = true;
    const broadcastLocks = true;

    const cursors = useMultiplayerCursors({ provider, userId, username, userColor, canWrite, broadcastCursor });
    const { startEditing, stopEditing, getEditorsForNode, lockNode, unlockNode, isLockedForMe, getLockOwner, locks } = useMultiplayerEditing({ provider, userId, username, userColor, canWrite, broadcastLocks });

    const { preferredEdgeTypeRef, updateEdgeType } = useEdgeTypeManager({
        nodes,
        edges,
        yNodesMap,
        yEdgesMap,
        yTextMap,
        ydoc,
        canWrite,
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
        canWrite,
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
    } = useGraphOperations({
        nodes,
        edges,
        yNodesMap,
        yEdgesMap,
        yTextMap,
        ydoc,
        canWrite,
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
    });
    const { onNodesChange, onEdgesChange, onConnect, commitNodePositions } = createGraphChangeHandlers(
        setNodes,
        setEdges,
        canWrite && writeSynced ? yNodesMap : null,
        canWrite && writeSynced ? yEdgesMap : null,
        canWrite && writeSynced ? ydoc : null,
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
        canWrite,
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
    });


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
                    onTitleChange={handleTitleChange}
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
                        updateEdgeAnchorPosition,
                        ensureEdgeAnchor,
                        lockNode,
                        unlockNode,
                        proxyMode: !canWrite,
                        undo,
                        redo,
                        stopCapturing,
                        addNodeAtPosition,
                        updateNodeType,
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
                            commitGroupLayoutBase(groupId, positions, width, height, nodes, yNodesMap, ydoc, canWrite, localOriginRef.current, setNodes);
                        },
                    }}>
                        <div className="w-full h-full relative">
                            <GraphCanvas
                                nodes={nodes as any}
                                edges={edges as any}
                                authenticated={authenticated}
                                canWrite={canWrite}
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
                                    if (connectMode) return;
                                    if (!canWrite) {
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
                                readOnly={!canWrite}
                                grabMode={grabMode}
                                setGrabMode={setGrabMode}

                            />
                        </div>
                        <GraphUpdater nodes={nodes} edges={edges} setNodes={setNodes} />
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
