'use client';

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { ReactFlowProvider, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toast } from 'sonner';
import { Roboto_Slab } from 'next/font/google';
import { recordOpen } from '@/actions/experimental/rationales';
import { MultiplayerHeader } from './MultiplayerHeader';
import { ToolsBar } from './ToolsBar';
import { GraphCanvas } from './GraphCanvas';
import { UndoHintOverlay } from './UndoHintOverlay';
import { GraphProvider } from './GraphContext';
import { GraphUpdater } from './GraphUpdater';
import { TypeSelectorDropdown } from './TypeSelectorDropdown';
import { PerfProvider } from './PerformanceContext';
import { useYjsMultiplayer } from '@/hooks/experiment/multiplayer/useYjsMultiplayer';
import { useMultiplayerCursors } from '@/hooks/experiment/multiplayer/useMultiplayerCursors';
import { useMultiplayerEditing } from '@/hooks/experiment/multiplayer/useMultiplayerEditing';
import { useWriteAccess } from '@/hooks/experiment/multiplayer/useWriteAccess';
import { useWritableSync } from '@/hooks/experiment/multiplayer/useWritableSync';
import { useConnectionMode } from '@/hooks/experiment/multiplayer/useConnectionMode';
import { useEdgeTypeManager } from '@/hooks/experiment/multiplayer/useEdgeTypeManager';
import { useGraphOperations } from '@/hooks/experiment/multiplayer/useGraphOperations';
import { useConnectionHandlers } from '@/hooks/experiment/multiplayer/useConnectionHandlers';
import { useNodeHelpers } from '@/hooks/experiment/multiplayer/useNodeHelpers';
import { usePairHeights } from '@/hooks/experiment/multiplayer/usePairHeights';
import { useEdgeSelection } from '@/hooks/experiment/multiplayer/useEdgeSelection';
import { useNodeDragHandlers } from '@/hooks/experiment/multiplayer/useNodeDragHandlers';
import { useMultiplayerTitle } from '@/hooks/experiment/multiplayer/useMultiplayerTitle';
import { useKeyboardShortcuts } from '@/hooks/experiment/multiplayer/useKeyboardShortcuts';
import { useInitialGraph } from '@/hooks/experiment/multiplayer/useInitialGraph';
import { createGraphChangeHandlers } from '@/utils/experiment/multiplayer/graphSync';
import { getMindchangeAveragesForEdges } from '@/actions/experimental/mindchange';
import { buildRationaleDetailPath } from '@/utils/hosts/syncPaths';
import { ORIGIN } from '@/hooks/experiment/multiplayer/yjs/origins';
import { useMindchangeActions } from '@/hooks/experiment/multiplayer/useMindchangeActions';
import { isMindchangeEnabledClient } from '@/utils/featureFlags';

const robotoSlab = Roboto_Slab({ subsets: ['latin'] });

interface MultiplayerBoardContentProps {
  authenticated: boolean;
  userId: string;
  username: string;
  userColor: string;
  roomName: string;
  resolvedId: string;
  routeParams: any;
  grabMode: boolean;
  setGrabMode: (value: boolean) => void;
  perfBoost: boolean;
  setPerfBoost: (value: boolean) => void;
  mindchangeSelectMode: boolean;
  setMindchangeSelectMode: (value: boolean) => void;
  mindchangeEdgeId: string | null;
  setMindchangeEdgeId: (value: string | null) => void;
  mindchangeNextDir: 'forward' | 'backward' | null;
  setMindchangeNextDir: (value: 'forward' | 'backward' | null) => void;
  selectMode: boolean;
}

export const MultiplayerBoardContent: React.FC<MultiplayerBoardContentProps> = ({
  authenticated,
  userId,
  username,
  userColor,
  roomName,
  resolvedId,
  routeParams,
  grabMode,
  setGrabMode,
  perfBoost,
  setPerfBoost,
  mindchangeSelectMode,
  setMindchangeSelectMode,
  mindchangeEdgeId,
  setMindchangeEdgeId,
  mindchangeNextDir,
  setMindchangeNextDir,
  selectMode,
}) => {
  const {
    connectMode,
    setConnectMode,
    connectAnchorId,
    setConnectAnchorId,
    connectAnchorRef,
    connectCursor,
    setConnectCursor,
    clearConnect,
  } = useConnectionMode();

  const effectiveSelectMode = useMemo(() => selectMode && !connectMode, [selectMode, connectMode]);

  const [newNodeWithDropdown, setNewNodeWithDropdown] = useState<{ id: string, x: number, y: number } | null>(null);
  const { hoveredEdgeId, setHoveredEdgeId, selectedEdgeId, setSelectedEdgeId } = useEdgeSelection();
  const localOriginRef = useRef<object>({});
  const lastAddRef = useRef<Record<string, number>>({});
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [undoHintPosition, setUndoHintPosition] = useState<{ x: number; y: number } | null>(null);
  const [overlayActiveEdgeId, setOverlayActiveEdgeId] = useState<string | null>(null);
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

  const { pairHeights, setPairNodeHeight, commitGroupLayout: commitGroupLayoutBase } = usePairHeights();
  const initialGraph = useInitialGraph();

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
    restartProviderWithNewToken,
    undo,
    redo,
    stopCapturing,
    canUndo,
    canRedo,
  } = useYjsMultiplayer({
    roomName,
    initialNodes: initialGraph?.nodes || [],
    initialEdges: initialGraph?.edges || [],
    enabled: Boolean(initialGraph) && Boolean(resolvedId),
    localOrigin: localOriginRef.current,
    currentUserId: userId,
    onRemoteNodesAdded: (ids: string[]) => {
      if (!connectMode) {
        for (const id of ids) markNodeCenterOnce(id);
      }
    }
  });

  useEffect(() => {
    if (!isMindchangeEnabledClient()) return;
    if (!resolvedId || !ydoc || !yMetaMap) return;
    if (!edges || edges.length === 0) return;
    (async () => {
      try {
        const ids = edges.filter((e: any) => e.type === 'negation' || e.type === 'objection').map((e) => e.id);
        if (ids.length === 0) return;
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

  useEffect(() => {
    if (!yMetaMap) return;
    const handleMetaChange = () => {
      try {
        const slug = (yMetaMap as any).get?.('slug') as string | null;
        if (!slug) return;
        const host = typeof window !== 'undefined' ? window.location.host : '';
        const fallbackId = typeof routeParams?.id === 'string' ? routeParams.id : String(routeParams?.id || '');
        const docIdForUrl = resolvedId || fallbackId;
        if (!docIdForUrl) return;
        const path = buildRationaleDetailPath(docIdForUrl, host, slug);
        if (path && typeof window !== 'undefined' && window.location.pathname !== path) {
          if (window.history && typeof window.history.replaceState === 'function') {
            window.history.replaceState(null, '', path);
          }
        }
      } catch { }
    };
    (yMetaMap as any).observe?.(handleMetaChange as any);
    try { handleMetaChange(); } catch { }
    return () => {
      try { (yMetaMap as any).unobserve?.(handleMetaChange as any); } catch { }
    };
  }, [yMetaMap, resolvedId, routeParams?.id]);

  const {
    dbTitle,
    titleEditingUser,
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

  useEffect(() => {
    if (dbTitle) {
      const fallbackId = typeof routeParams?.id === 'string' ? routeParams.id : String(routeParams?.id || '');
      const title = `${dbTitle} | ${resolvedId || fallbackId} | Negation Game`;
      document.title = title;
    }
  }, [dbTitle, resolvedId, routeParams?.id]);

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
      }
      return additions.length ? [...current, ...additions] : current;
    });
  }, [connectMode, edges, getEdgeMidpoint, setNodes, canWrite]);

  const cursors = useMultiplayerCursors({ provider, userId, username, userColor, canWrite: canEdit, broadcastCursor: true });
  const { startEditing, stopEditing, getEditorsForNode, lockNode, unlockNode, isLockedForMe, getLockOwner, markNodeActive, locks } = useMultiplayerEditing({ provider, userId, username, userColor, canWrite: canEdit, broadcastLocks: true });

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

  const { setMindchange, getMindchangeBreakdown } = useMindchangeActions({
    resolvedId,
    edges,
    userId,
    ydoc,
    yMetaMap,
    setEdges,
    setMindchangeSelectMode,
    setMindchangeEdgeId,
    setMindchangeNextDir,
    setSelectedEdgeId,
  });

  const updateEdgeTypeWrapped = useCallback(async (edgeId: string, newType: 'negation' | 'support') => {
    try {
      const prev = edges.find((e: any) => e.id === edgeId);
      if (!prev) return;
      if (prev.type === newType) return;
      updateEdgeType(edgeId, newType);
      if (newType === 'support') {
        try {
          setEdges((eds: any[]) => eds.map((e: any) => e.id === edgeId ? { ...e, data: { ...(e.data || {}), mindchange: undefined } } : e));
        } catch { }
      } else if (newType === 'negation') {
        if (!isMindchangeEnabledClient()) {
          setEdges((eds: any[]) => eds.map((e: any) => e.id === edgeId ? { ...e } : e));
          return;
        }
        try {
          if (resolvedId && ydoc && yMetaMap) {
            const res = await getMindchangeAveragesForEdges(resolvedId, [edgeId]);
            const payload = res?.[edgeId];
            (ydoc as any).transact(() => {
              if (payload) {
                (yMetaMap as any).set?.(`mindchange:${edgeId}`, payload);
              } else {
                (yMetaMap as any).delete?.(`mindchange:${edgeId}`);
              }
            }, ORIGIN.RUNTIME);
            setEdges((eds: any[]) => eds.map((e: any) => e.id === edgeId ? { ...e } : e));
          } else {
            setEdges((eds: any[]) => eds.map((e: any) => e.id === edgeId ? { ...e } : e));
          }
        } catch { }
      }
    } catch { }
  }, [edges, updateEdgeType, resolvedId, setEdges, yMetaMap, ydoc]);

  const [editingSet, setEditingSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        const isLocked = isLockedForMe(node.id);
        const shouldBeDraggable = !isLocked && !grabMode;
        if (node.draggable === shouldBeDraggable) return node;
        return { ...node, draggable: shouldBeDraggable };
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locks, grabMode, setNodes]);

  useEffect(() => {
    setEdges((currentEdges) =>
      currentEdges.map((edge) => {
        const shouldBeSelectable = !grabMode;
        if ((edge as any).selectable === shouldBeSelectable) return edge;
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
    return { x: 0, y: 16 };
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
    updateEdgeRelevance,
    deleteNode,
    addPointBelow,
    addObjectionForEdge,
    updateEdgeAnchorPosition,
    ensureEdgeAnchor,
    addNodeAtPosition,
    updateNodeType,
    createInversePair: inversePair,
    deleteInversePair,
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
    onNodeAddedCenterOnce: (id: string) => { if (!connectMode) markNodeCenterOnce(id); },
    connectMode,
  });

  const { onNodesChange, onEdgesChange, onConnect } = createGraphChangeHandlers(
    setNodes,
    setEdges,
    canEdit && writeSynced ? yNodesMap : null,
    canEdit && writeSynced ? yEdgesMap : null,
    canEdit && writeSynced ? ydoc : null,
    syncYMapFromArray,
    localOriginRef.current,
    () => nodes as any[],
    () => preferredEdgeTypeRef.current,
    connectMode
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
      setGrabMode(!grabMode);
      setConnectAnchorId(null);
      setMindchangeSelectMode(false);
    }
  });

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
        onRetryConnection={restartProviderWithNewToken}
        onUrlUpdate={(id, slug) => {
          try {
            if (ydoc && yMetaMap) {
              (ydoc as any).transact(() => {
                (yMetaMap as any).set?.('slug', slug);
              }, ORIGIN.RUNTIME);
            }
          } catch { }
        }}
      />

      <ReactFlowProvider>
        <PerfProvider value={{ perfMode: (((nodes?.length || 0) + (edges?.length || 0)) > 600) || perfBoost || grabMode, setPerfMode: setPerfBoost }}>
          <GraphProvider value={{
            currentUserId: userId,
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
            updateEdgeType: updateEdgeTypeWrapped,
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
              if (nid !== null && hoveredNodeId === nid) {
                return;
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
              if (!isMindchangeEnabledClient()) return;
              setMindchangeSelectMode(true);
              setConnectMode(true);
              setConnectAnchorId(null);
            },
            beginMindchangeOnEdge: (edgeId: string) => {
              if (!isMindchangeEnabledClient()) return;
              try {
                const et = (edges.find((e: any) => e.id === edgeId)?.type) as string | undefined;
                if (et !== 'negation' && et !== 'objection') return;
              } catch { }
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
            setMindchange,
            getMindchangeBreakdown,
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
                onNodeClick={() => { }}
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
                selectMode={effectiveSelectMode}
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
                selectMode={effectiveSelectMode}
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
            <GraphUpdater nodes={nodes} edges={edges} setNodes={setNodes} documentId={resolvedId || ''} centerQueueVersion={centerQueueVersion} consumeCenterQueue={consumeCenterQueue} connectMode={connectMode} />
          </GraphProvider>
        </PerfProvider>

        {newNodeWithDropdown && (
          <TypeSelectorDropdown
            open={true}
            x={newNodeWithDropdown.x}
            y={newNodeWithDropdown.y}
            currentType="point"
            onClose={() => {
              try { clearNodeSelection(); } catch { }
              try { blurNodesImmediately(); } catch { }
              try { setConnectMode(false); } catch { }
              try { setConnectAnchorId(null); } catch { }
              setNewNodeWithDropdown(null);
            }}
            onSelect={(type) => {
              updateNodeType(newNodeWithDropdown.id, type);
              try { startEditingNodeCtx(newNodeWithDropdown.id); } catch { }
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
};
