'use client';

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { ReactFlowProvider, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toast } from 'sonner';
import { showReadOnlyToast } from '@/utils/readonlyToast';
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
import { useEdgeSelection } from '@/hooks/experiment/multiplayer/useEdgeSelection';
import { useNodeDragHandlers } from '@/hooks/experiment/multiplayer/useNodeDragHandlers';
import { useMultiplayerTitle } from '@/hooks/experiment/multiplayer/useMultiplayerTitle';
import { useKeyboardShortcuts } from '@/hooks/experiment/multiplayer/useKeyboardShortcuts';
import { useInitialGraph } from '@/hooks/experiment/multiplayer/useInitialGraph';
import { createGraphChangeHandlers } from '@/utils/experiment/multiplayer/graphSync';
import { buildRationaleDetailPath } from '@/utils/hosts/syncPaths';
import { isProductionRequest } from '@/utils/hosts';
import { QueryClient, QueryClientContext, QueryClientProvider } from '@tanstack/react-query';
import { ORIGIN } from '@/hooks/experiment/multiplayer/yjs/origins';
import { useMarket } from '@/hooks/market/useMarket';
import { syncMarketDataToYDoc } from '@/utils/market/marketYDocSync';
import { buildMarketViewPayload, isMarketEnabled } from '@/utils/market/marketUtils';
import { logger } from '@/lib/logger';
import { MarketPanel } from './market/MarketPanel';
import { MarketErrorBoundary } from './market/MarketErrorBoundary';
import { BoardLoading } from './BoardLoading';
import { DocAccessRole } from '@/services/mpAccess';
import { NotificationsSidebar } from './notifications/NotificationsSidebar';
import type { MultiplayerNotification } from './notifications/types';
import { Bell } from 'lucide-react';
import { useMultiplayerNotifications } from '@/queries/experiment/multiplayer/useMultiplayerNotifications';
import {
  useMarkAllMultiplayerNotificationsRead,
  useMarkMultiplayerNotificationRead,
} from '@/mutations/experiment/multiplayer/useMarkMultiplayerNotificationsRead';
import { stampMissingCreator } from '@/utils/experiment/multiplayer/creatorStamp';
import { buildEdgeNotificationCandidates } from '@/utils/experiment/multiplayer/notificationRouting';
import { normalizeNotificationVotes } from '@/utils/experiment/multiplayer/notificationVotes';
import { createMultiplayerNotification } from '@/actions/experiment/multiplayer/notifications';

const robotoSlab = Roboto_Slab({ subsets: ['latin'] });

interface MultiplayerBoardContentProps {
  authenticated: boolean;
  userId: string;
  username: string;
  userColor: string;
  roomName: string;
  resolvedId: string;
  resolvedSlug?: string | null;
  routeParams: any;
  grabMode: boolean;
  setGrabMode: (value: boolean) => void;
  perfBoost: boolean;
  setPerfBoost: (value: boolean) => void;
  selectMode: boolean;
  accessRole?: DocAccessRole | null;
  shareToken?: string | null;
  ownerId?: string | null;
}

type MarketPanelState = {
  nodeId: string | null;
  edgeId: string | null;
  isExpanded: boolean;
  shareParamsApplied: boolean;
};

const logDevError = (message: string, error: unknown) => {
  if (process.env.NODE_ENV === 'development') {
    const payload = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { error };
    logger.error(message, payload);
  }
};

const isAbortError = (error: unknown) => {
  return error instanceof DOMException && error.name === 'AbortError';
};

const MultiplayerBoardContentInner: React.FC<MultiplayerBoardContentProps> = ({
  authenticated,
  userId,
  username,
  userColor,
  roomName,
  resolvedId,
  resolvedSlug = null,
  routeParams,
  grabMode,
  setGrabMode,
  perfBoost,
  setPerfBoost,
  selectMode,
  accessRole = null,
  shareToken = null,
  ownerId = null,
}) => {
  const routeId = typeof routeParams?.id === 'string' ? routeParams.id : String(routeParams?.id || '');
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
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [notificationsSidebarOpen, setNotificationsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<MultiplayerNotification[]>([]);
  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );
  const [focusTarget, setFocusTarget] = useState<{
    id: string;
    kind?: "node" | "edge";
    nonce: number;
  } | null>(null);
  const [missingNotificationId, setMissingNotificationId] = useState<string | null>(null);
  const [marketPanelState, setMarketPanelState] = useState<MarketPanelState>({
    nodeId: null,
    edgeId: null,
    isExpanded: false,
    shareParamsApplied: false,
  });
  const setMarketPanelSelection = useCallback((nodeId: string | null, edgeId: string | null) => {
    setMarketPanelState((prev) => {
      if (prev.nodeId === nodeId && prev.edgeId === edgeId) return prev;
      return { ...prev, nodeId, edgeId };
    });
  }, []);
  const setMarketPanelExpanded = useCallback((isExpanded: boolean) => {
    setMarketPanelState((prev) => {
      if (prev.isExpanded === isExpanded) return prev;
      return { ...prev, isExpanded };
    });
  }, []);
  const markShareParamsApplied = useCallback(() => {
    setMarketPanelState((prev) => {
      if (prev.shareParamsApplied) return prev;
      return { ...prev, shareParamsApplied: true };
    });
  }, []);
  const resetMarketPanel = useCallback(() => {
    setMarketPanelState((prev) => {
      if (!prev.nodeId && !prev.edgeId && !prev.isExpanded) return prev;
      return { ...prev, nodeId: null, edgeId: null, isExpanded: false };
    });
  }, []);
  const [overlayActiveEdgeId, setOverlayActiveEdgeId] = useState<string | null>(null);
  const [forceBlurNodes, setForceBlurNodes] = useState(0);
  const centerOnceIdsRef = useRef<Set<string>>(new Set());
  const focusNonceRef = useRef(0);
  const [centerQueueVersion, setCenterQueueVersion] = useState(0);
  const {
    nodeId: marketPanelNodeId,
    edgeId: marketPanelEdgeId,
    isExpanded: isMarketPanelExpanded,
    shareParamsApplied,
  } = marketPanelState;

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

  const requestFocusTarget = useCallback((id: string, kind?: "node" | "edge") => {
    if (!id) return;
    focusNonceRef.current += 1;
    setFocusTarget({ id, kind, nonce: focusNonceRef.current });
  }, []);

  const blurNodesImmediately = useCallback(() => {
    setForceBlurNodes((v) => v + 1);
  }, []);

  const initialGraph = useInitialGraph();

  const notificationDocId = resolvedId || routeId || '';
  const notificationQueryOptions = useMemo(
    () => ({
      docId: notificationDocId,
      limit: 50,
      pauseAutoRefresh: notificationsSidebarOpen,
    }),
    [notificationDocId, notificationsSidebarOpen]
  );
  const {
    data: multiplayerNotifications = [],
    isLoading: notificationsLoading,
    isFetching: notificationsFetching,
    refetch: refetchNotifications,
  } = useMultiplayerNotifications(notificationQueryOptions);
  const notificationsLoadingState = notificationsLoading || notificationsFetching;
  const markNotificationReadMutation = useMarkMultiplayerNotificationRead();
  const markAllNotificationsReadMutation = useMarkAllMultiplayerNotificationsRead();
  const [pendingNavigateId, setPendingNavigateId] = useState<string | null>(null);
  const getNodeTitle = useCallback((node: any) => {
    const data = node?.data || {};
    const content = data.content ?? data.statement;
    if (typeof content === 'string' && content.trim()) return content.trim();
    return 'Untitled point';
  }, []);

  useEffect(() => {
    setNotifications((prev) => {
      if (prev.length === multiplayerNotifications.length) {
        const same = prev.every((item, idx) => {
          const next = multiplayerNotifications[idx];
          return (
            next &&
            item.id === next.id &&
            item.userName === next.userName &&
            item.count === next.count &&
            item.timestamp === next.timestamp &&
            item.isRead === next.isRead &&
            item.pointTitle === next.pointTitle &&
            item.type === next.type &&
            item.action === next.action
          );
        });
        if (same) return prev;
      }
      return multiplayerNotifications;
    });
  }, [multiplayerNotifications]);

  const handleNotificationRead = useCallback(
    async (notification: MultiplayerNotification) => {
      const targetIds = new Set(notification.ids ?? [notification.id]);
      setNotifications((prev) =>
        prev.map((n) => {
          const match =
            (n.ids && n.ids.some((id) => targetIds.has(id))) ||
            targetIds.has(n.id);
          return match ? { ...n, isRead: true } : n;
        })
      );
      try {
        if (targetIds.size > 1) {
          await markAllNotificationsReadMutation.mutateAsync({
            ids: Array.from(targetIds),
            showToast: false,
          });
        } else {
          const [id] = Array.from(targetIds);
          await markNotificationReadMutation.mutateAsync(id);
        }
      } catch (error) {
        logger.error("Failed to mark multiplayer notification read", error);
      }
    },
    [markNotificationReadMutation, markAllNotificationsReadMutation]
  );

  const handleMarkAllNotificationsRead = useCallback(
    async (notificationIds: string[]) => {
      if (!notificationIds.length) return;
      const targetIds = new Set(notificationIds);
      setNotifications((prev) =>
        prev.map((n) =>
          (n.ids && n.ids.some((id) => targetIds.has(id))) || targetIds.has(n.id)
            ? { ...n, isRead: true }
            : n
        )
      );
      try {
        await markAllNotificationsReadMutation.mutateAsync({
          ids: notificationIds,
          showToast: true,
        });
      } catch (error) {
        logger.error("Failed to mark multiplayer notifications read", error);
      }
    },
    [markAllNotificationsReadMutation]
  );

  useEffect(() => {
    if (!missingNotificationId) return;
    const target = notifications.find(
      (n) => n.id === missingNotificationId || (n.ids && n.ids.includes(missingNotificationId))
    );
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === missingNotificationId || (n.ids && n.ids.includes(missingNotificationId))
          ? { ...n, isRead: true }
          : n
      )
    );
    if (target && !target.isRead) {
      void handleNotificationRead(target);
    } else {
      markNotificationReadMutation
        .mutateAsync(missingNotificationId)
        .catch((error) => logger.error("Failed to mark multiplayer notification read", error));
    }
    setMissingNotificationId(null);
  }, [missingNotificationId, notifications, handleNotificationRead, markNotificationReadMutation]);

  const isProdHost = typeof window !== 'undefined' ? isProductionRequest(window.location.hostname) : false;
  const allowedByRole = accessRole ? (accessRole === 'owner' || accessRole === 'editor') : true;
  const allowPersistence = allowedByRole && !(isProdHost && !authenticated);
  const lastMarketStructSigRef = useRef<string | null>(null);
  const nodesRef = useRef<any[]>([]);
  const edgesRef = useRef<any[]>([]);
  const notifiedEdgeIdsRef = useRef<Set<string>>(new Set());
  const initializedEdgeNotificationsRef = useRef(false);
  const notifiedEdgeTypesRef = useRef<Map<string, Set<string>>>(new Map());
  const notifiedCommentIdsRef = useRef<Set<string>>(new Set());
  const notifiedUpvotesRef = useRef<Map<string, Set<string>>>(new Map());
  const notifiedEdgeVotesRef = useRef<Map<string, Set<string>>>(new Map());
  const seededHistoricNotificationsRef = useRef(false);
  const lastVoteSnapshotRef = useRef<Map<string, Set<string>>>(new Map());

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
    connectedWithGrace,
    connectionState,
    hasSyncedOnce,
    isReady,
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
    allowPersistence,
    localOrigin: localOriginRef.current,
    currentUserId: userId,
    shareToken,
    docId: resolvedId || routeId,
    accessRole,
    onRemoteNodesAdded: (ids: string[]) => {
      if (!connectMode) {
        for (const id of ids) markNodeCenterOnce(id);
      }
    }
  });

  const marketEnabled = isMarketEnabled();
  const market = useMarket(marketEnabled && resolvedId ? resolvedId : '');
  const marketViewData = marketEnabled ? (market?.view?.data || null) : null;
  const initialMarketFetchDoneRef = useRef(false);

  const handleNavigateToPoint = useCallback(
    (pointId: string, boardId?: string) => {
      if (!pointId) return;
      if (boardId && boardId !== resolvedId) {
        const targetPath = `/experiment/rationale/multiplayer/${encodeURIComponent(boardId)}?node=${encodeURIComponent(pointId)}`;
        try {
          window.location.href = targetPath;
        } catch (error) {
          logger.error("Failed to navigate to notification board", error);
        }
        return;
      }
      const targetNode = nodes.find((n: any) => n.id === pointId);
      const targetEdge = edges.find((e: any) => e.id === pointId);
      if (!targetNode && !targetEdge) {
        logger.warn("Notification target missing", {
          pointId,
          nodeCount: nodes.length,
          edgeCount: edges.length,
          sampleNodeIds: nodes.slice(0, 5).map((n: any) => n.id),
          sampleEdgeIds: edges.slice(0, 5).map((e: any) => e.id),
        });
        toast.error('That point no longer exists on this board.');
        const missing = notifications.find((n) => n.pointId === pointId);
        if (missing) {
          setMissingNotificationId(missing.id);
        }
        return;
      }
      if (targetNode) {
        setSelectedEdgeId(null);
        setHoveredEdgeId(null);
        setMarketPanelSelection(pointId, null);
        setNodes((prev) =>
          prev.map((n: any) =>
            n.id === pointId ? { ...n, selected: true } : { ...n, selected: false }
          )
        );
        requestFocusTarget(pointId, "node");
      } else if (targetEdge) {
        setMarketPanelSelection(null, pointId);
        setSelectedEdgeId(pointId);
        setHoveredEdgeId(pointId);
        requestFocusTarget(pointId, "edge");
      }
    },
    [resolvedId, setSelectedEdgeId, setHoveredEdgeId, setMarketPanelSelection, setNodes, requestFocusTarget, nodes, edges, notifications]
  );

  useEffect(() => {
    nodesRef.current = nodes as any[];
    edgesRef.current = edges as any[];
  }, [nodes, edges]);

  useEffect(() => {
    if (!ydoc || !yNodesMap || !yEdgesMap) return;
    if (!Array.isArray(nodes) || !Array.isArray(edges)) return;
    const fallbackCreatorId = ownerId || userId || null;
    if (!fallbackCreatorId) return;
    if (!allowPersistence) return;
    const fallbackCreatorName = fallbackCreatorId === userId ? username : null;

    const {
      nodes: stampedNodes,
      edges: stampedEdges,
      changed,
      changedNodeIds,
      changedEdgeIds,
    } = stampMissingCreator(nodes as Node[], edges as any[], fallbackCreatorId, fallbackCreatorName);

    if (!changed) return;

    const changedNodeSet = new Set(changedNodeIds);
    const changedEdgeSet = new Set(changedEdgeIds);
    const updatedNodeMap = new Map<string, Node>();
    stampedNodes.forEach((node) => {
      if (changedNodeSet.has(node.id)) {
        updatedNodeMap.set(node.id, node);
      }
    });
    const updatedEdgeMap = new Map<string, any>();
    stampedEdges.forEach((edge) => {
      if (changedEdgeSet.has(edge.id)) {
        updatedEdgeMap.set(edge.id, edge);
      }
    });

    setNodes((prev) => {
      let touched = false;
      const next = prev.map((node: any) => {
        const replacement = updatedNodeMap.get(node.id);
        if (replacement) {
          touched = true;
          return replacement;
        }
        return node;
      });
      return touched ? next : prev;
    });

    setEdges((prev) => {
      let touched = false;
      const next = prev.map((edge: any) => {
        const replacement = updatedEdgeMap.get(edge.id);
        if (replacement) {
          touched = true;
          return replacement;
        }
        return edge;
      });
      return touched ? next : prev;
    });

    ydoc.transact(() => {
      changedNodeIds.forEach((id) => {
        const base = yNodesMap.get(id) || nodes.find((n: any) => n.id === id);
        if (!base) return;
        const existingName = (base as any)?.data?.createdByName;
        yNodesMap.set(id, {
          ...base,
          data: {
            ...(base as any).data,
            createdBy: fallbackCreatorId,
            createdByName:
              typeof existingName === "string" ? existingName : fallbackCreatorName,
          },
        });
      });
      changedEdgeIds.forEach((id) => {
        const base = yEdgesMap.get(id) || edges.find((e: any) => e.id === id);
        if (!base) return;
        const existingName = (base as any)?.data?.createdByName;
        yEdgesMap.set(id, {
          ...base,
          data: {
            ...(base as any).data,
            createdBy: fallbackCreatorId,
            createdByName:
              typeof existingName === "string" ? existingName : fallbackCreatorName,
          },
        });
      });
    }, localOriginRef.current);
  }, [ydoc, yNodesMap, yEdgesMap, nodes, edges, ownerId, userId, username, setNodes, setEdges, allowPersistence]);

  useEffect(() => {
    initialMarketFetchDoneRef.current = false;
    lastMarketStructSigRef.current = null;
  }, [resolvedId]);

  useEffect(() => {
    if (!marketEnabled) return;
    if (!ydoc || !yMetaMap) return;
    if (!marketViewData) return;
    try {
      const marketData = {
        prices: marketViewData?.prices || {},
        holdings: {},
        totals: marketViewData?.totals || {},
        updatedAt: marketViewData?.updatedAt || new Date().toISOString(),
      };
      syncMarketDataToYDoc(ydoc, yMetaMap, marketData, resolvedId || '', ORIGIN.RUNTIME);
    } catch (error) {
      logDevError('[market/ui] snapshot sync failed', error);
    }
  }, [marketEnabled, marketViewData, ydoc, yMetaMap, resolvedId]);

  useEffect(() => {
    if (!marketEnabled) return;
    if (!resolvedId || !ydoc || !yMetaMap) return;
    if (initialMarketFetchDoneRef.current) return;
    if (marketViewData && Object.keys(marketViewData.prices || {}).length > 0) {
      initialMarketFetchDoneRef.current = true;
      return;
    }
    try {
      const existing = (yMetaMap as any).get?.('market:prices') || null;
      if (existing && Object.keys(existing).length > 0) {
        initialMarketFetchDoneRef.current = true;
        return;
      }
    } catch (error) {
      logDevError('[market/ui] read yMetaMap prices failed', error);
    }
    if (!Array.isArray(nodes) || !Array.isArray(edges)) return;
    if (nodes.length === 0 && edges.length === 0) return;
    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      if (initialMarketFetchDoneRef.current) return;
      initialMarketFetchDoneRef.current = true;
      try {
        const payload = buildMarketViewPayload(nodes, edges);
        const res = await fetch(`/api/market/${encodeURIComponent(resolvedId)}/view`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          if (/outcome enumeration cap exceeded|too many variables/i.test(txt)) {
            toast.error('Market too complex. Remove some nodes or edges.');
          }
          initialMarketFetchDoneRef.current = false;
          return;
        }
        const view = await res.json();
        const marketData = {
          prices: view?.prices || {},
          holdings: {},
          totals: view?.totals || {},
          updatedAt: view?.updatedAt || new Date().toISOString(),
        };
        syncMarketDataToYDoc(ydoc, yMetaMap, marketData, resolvedId, ORIGIN.RUNTIME);
      } catch (error) {
        if (isAbortError(error)) {
          initialMarketFetchDoneRef.current = false;
          return;
        }
        initialMarketFetchDoneRef.current = false;
        logDevError('[market/ui] initial market fetch failed', error);
      }
    }, 800);
    return () => {
      try { ctrl.abort(); } catch { }
      window.clearTimeout(timer);
    };
  }, [marketEnabled, marketViewData, nodes, edges, ydoc, yMetaMap, resolvedId]);

  useEffect(() => {
    if (!marketEnabled) return;
    const handler = async () => {
      try {
        const currentId = String(resolvedId || routeId || '');
        if (currentId && ydoc && yMetaMap) {
          const res = await fetch(`/api/market/${encodeURIComponent(currentId)}/view?bypassCache=1`, { cache: 'no-store' }).catch(() => null as any);
          if (res && res.ok) {
            const view = await res.json().catch(() => null);
            if (view) {
              const marketData = {
                prices: view?.prices || {},
                holdings: {},
                totals: view?.totals || {},
                updatedAt: view?.updatedAt || new Date().toISOString(),
              };
              syncMarketDataToYDoc(ydoc, yMetaMap, marketData, currentId, ORIGIN.RUNTIME, 'refresh');
            }
          }
        }
      } catch (error) {
        if (isAbortError(error)) return;
        logDevError('[market/ui] refresh failed', error);
      }
    };
    const optimistic = (e: any) => {
      if (!ydoc || !yMetaMap) return;
      try {
        const detail = (e as CustomEvent)?.detail || {};
        const evDoc = String(detail.docId || '');
        const localSlug = routeId;
        const localResolved = String(resolvedId || '');
        const currentId = localResolved || localSlug;
        if (evDoc && currentId && evDoc !== currentId) return;
        const sec = String(detail.securityId || '');
        const delta = BigInt(String(detail.deltaScaled || '0'));
        if (!sec || delta === 0n) return;
        const existingHoldings = (yMetaMap as any).get?.('market:holdings') || {};
        const existingTotals = (yMetaMap as any).get?.('market:totals') || {};
        const currH = BigInt(String(existingHoldings[sec] || '0'));
        const currT = BigInt(String(existingTotals[sec] || '0'));
        const holdings = { ...existingHoldings, [sec]: (currH + delta).toString() };
        const totals = { ...existingTotals, [sec]: (currT + delta).toString() };
        syncMarketDataToYDoc(ydoc, yMetaMap, { holdings, totals, updatedAt: new Date().toISOString() }, resolvedId || '', ORIGIN.RUNTIME, 'optimistic');
      } catch (error) {
        logDevError('[market/ui] optimistic trade failed', error);
      }
    };
    try { window.addEventListener('market:refresh', handler); } catch (error) { logDevError('[market/ui] add refresh listener failed', error); }
    try { window.addEventListener('market:optimisticTrade', optimistic as any); } catch (error) { logDevError('[market/ui] add optimistic listener failed', error); }
    return () => {
      try { window.removeEventListener('market:refresh', handler); } catch (error) { logDevError('[market/ui] remove refresh listener failed', error); }
      try { window.removeEventListener('market:optimisticTrade', optimistic as any); } catch (error) { logDevError('[market/ui] remove optimistic listener failed', error); }
    };
  }, [marketEnabled, ydoc, yMetaMap, resolvedId, routeId, market]);


  useEffect(() => {
    if (!resolvedId || !authenticated) return;
    recordOpen(resolvedId).catch((error) => { logDevError('[market/ui] recordOpen failed', error); });
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
            const search = typeof window !== 'undefined' ? window.location.search || '' : '';
            const hash = typeof window !== 'undefined' ? window.location.hash || '' : '';
            window.history.replaceState(null, '', `${path}${search}${hash}`);
          }
        }
      } catch (error) {
        logDevError('[graph/ui] handleMetaChange failed', error);
      }
    };
    (yMetaMap as any).observe?.(handleMetaChange as any);
    try { handleMetaChange(); } catch (error) { logDevError('[graph/ui] initial meta sync failed', error); }
    return () => {
      try { (yMetaMap as any).unobserve?.(handleMetaChange as any); } catch (error) { logDevError('[graph/ui] unobserve meta failed', error); }
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
    shareToken,
  });

  useEffect(() => {
    if (dbTitle) {
      const fallbackId = typeof routeParams?.id === 'string' ? routeParams.id : String(routeParams?.id || '');
      const title = `${dbTitle} | ${resolvedId || fallbackId} | Negation Game`;
      document.title = title;
    }
  }, [dbTitle, resolvedId, routeParams?.id]);

  const { getNodeCenter, getEdgeMidpoint } = useNodeHelpers({ nodes, edges });
  const { canWrite } = useWriteAccess(provider, userId, { authenticated });
  const canEdit = Boolean(canWrite && allowedByRole && (isConnected || connectedWithGrace));

  useEffect(() => {
    edges.forEach((edge: any) => {
      if (!initializedEdgeNotificationsRef.current) {
        notifiedEdgeIdsRef.current.add(edge.id);
      }
      const typeSet = notifiedEdgeTypesRef.current.get(edge.id) || new Set<string>();
      if (edge?.type) {
        typeSet.add(String(edge.type));
        notifiedEdgeTypesRef.current.set(edge.id, typeSet);
      }
    });
    if (!initializedEdgeNotificationsRef.current) {
      initializedEdgeNotificationsRef.current = true;
    }
  }, [edges]);

  useEffect(() => {
    if (!userId || !resolvedId || !Array.isArray(edges) || !Array.isArray(nodes)) return;
    if (!canEdit) return;

    const candidates = buildEdgeNotificationCandidates(
      edges as any[],
      nodes as any[],
      userId,
      ownerId || null
    ).filter((candidate) => !notifiedEdgeIdsRef.current.has(candidate.edgeId));

    if (candidates.length === 0) return;

    candidates.forEach((candidate) => {
      notifiedEdgeIdsRef.current.add(candidate.edgeId);
      const actionLabel =
        candidate.type === "negation"
          ? "negated"
          : candidate.type === "support"
            ? "supported"
            : "objected to";
      logger.info("mp notifications: creating edge notification", {
        edgeId: candidate.edgeId,
        targetNodeId: candidate.targetNodeId,
        recipientUserId: candidate.recipientUserId,
        type: candidate.type,
        docId: resolvedId,
      });
      void createMultiplayerNotification({
        userId: candidate.recipientUserId,
        docId: resolvedId,
        nodeId: candidate.targetNodeId,
        edgeId: candidate.edgeId,
        type: candidate.type,
        action: actionLabel,
        actorUserId: userId,
        actorUsername: username,
        title: candidate.title,
      }).catch((error) => {
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        notifiedEdgeIdsRef.current.delete(candidate.edgeId);
        logger.error("Failed to create multiplayer notification", error);
      });
    });
  }, [edges, nodes, userId, resolvedId, ownerId, username, canEdit]);

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

  // Handle URL params for auto-selecting nodes/edges and opening market panel
  useEffect(() => {
    if (shareParamsApplied) return;
    if (typeof window === 'undefined') return;
    // Wait until the realtime graph is actually connected and has content
    if (!isConnected) return;
    if (!Array.isArray(nodes) || (!nodes.length && !edges.length)) return;

    const urlParams = new URLSearchParams(window.location.search);
    const nodeParam = urlParams.get('node');
    const edgeParam = urlParams.get('edge');

    const hasNode = nodeParam && nodes.some((n: any) => n.id === nodeParam);
    const hasEdge = edgeParam && edges.some((e: any) => e.id === edgeParam);

    if (hasNode) {
      setMarketPanelSelection(nodeParam!, null);
      setSelectedEdgeId(null);
      setNodes((nds: any[]) =>
        nds.map((n: any) =>
          n.id === nodeParam ? { ...n, selected: true } : { ...n, selected: false }
        )
      );
      requestFocusTarget(nodeParam!, "node");
    } else if (hasEdge) {
      setMarketPanelSelection(null, edgeParam!);
      setSelectedEdgeId(edgeParam!);
      setNodes((nds: any[]) =>
        nds.map((n: any) => (n.selected ? { ...n, selected: false } : n))
      );
      requestFocusTarget(edgeParam!, "edge");
    }

    // Consume the URL parameters so they don't linger once applied
    if (nodeParam || edgeParam) {
      try {
        const cleaned = new URLSearchParams(urlParams.toString());
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        cleaned.delete('node');
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        cleaned.delete('edge');
        const search = cleaned.toString();
        const newUrl = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
        window.history.replaceState(null, '', newUrl);
      } catch {
        // ignore history errors
      }
    }

    markShareParamsApplied();
  }, [shareParamsApplied, isConnected, nodes, edges, setNodes, setSelectedEdgeId, setMarketPanelSelection, markShareParamsApplied, requestFocusTarget]);

  // Track node selection changes to open/switch market panel (but not close - panel is "sticky")
  useEffect(() => {
    if (!nodes || nodes.length === 0) return;
    const selectedNode = nodes.find((n: any) => n.selected);
    if (selectedNode && isMarketEnabled()) {
      const nodeType = (selectedNode as any).type;
      if (nodeType === 'point' || nodeType === 'objection') {
        setMarketPanelSelection(selectedNode.id, null);
      }
    }
  }, [nodes, setMarketPanelSelection]);

  // Track edge selection changes to open/switch market panel (but not close - panel is "sticky")
  useEffect(() => {
    if (selectedEdgeId && isMarketEnabled()) {
      const selectedEdge = edges.find((e: any) => e.id === selectedEdgeId);
      const edgeType = selectedEdge?.type;
      if (edgeType === 'support' || edgeType === 'negation' || edgeType === 'objection') {
        setMarketPanelSelection(null, selectedEdgeId);
      }
    }
  }, [selectedEdgeId, edges, setMarketPanelSelection]);

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

  const updateEdgeTypeWrapped = useCallback(async (edgeId: string, newType: 'negation' | 'support') => {
    try {
      const prev = edges.find((e: any) => e.id === edgeId);
      if (!prev) return;
      if (prev.type === newType) return;
      const updatedEdge = {
        ...prev,
        type: newType,
        data: {
          ...(prev as any).data,
          createdBy: (prev as any)?.data?.createdBy ?? userId,
          createdByName: (prev as any)?.data?.createdByName ?? username,
        },
      };
      const typesSet = notifiedEdgeTypesRef.current.get(edgeId) || new Set<string>();
      const alreadyNotified = typesSet.has(newType);
      updateEdgeType(edgeId, newType);

      if (!alreadyNotified && userId && resolvedId) {
        const candidates = buildEdgeNotificationCandidates(
          [updatedEdge] as any[],
          nodes as any[],
          userId,
          ownerId || null,
          { requireCreatorMatch: false }
        );
        if (candidates.length > 0) {
          const candidate = candidates[0];
          const actionLabel = newType === 'negation' ? 'negated' : 'supported';
          logger.info("mp notifications: edge type switch", {
            edgeId,
            targetNodeId: candidate.targetNodeId,
            recipientUserId: candidate.recipientUserId,
            type: candidate.type,
            docId: resolvedId,
          });
          typesSet.add(newType);
          notifiedEdgeTypesRef.current.set(edgeId, typesSet);
          void createMultiplayerNotification({
            userId: candidate.recipientUserId,
            docId: resolvedId,
            nodeId: candidate.targetNodeId,
            edgeId: candidate.edgeId,
            type: candidate.type,
            action: actionLabel,
            actorUserId: userId,
            actorUsername: username,
            title: candidate.title,
          }).catch((error) => {
            logger.error("Failed to create multiplayer notification for edge type switch", error);
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            typesSet.delete(newType);
          });
        }
      }
    } catch (error) {
      logDevError('[edge/ui] edge type effect failed', error);
    }
  }, [edges, updateEdgeType, userId, ownerId, username, resolvedId, nodes]);

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
    try { startEditing(nodeId); } catch (error) { logDevError('[graph/ui] startEditing failed', error); }
  }, [startEditing]);

  const stopEditingNodeCtx = React.useCallback((nodeId: string) => {
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    setEditingSet((prev) => { const ns = new Set(prev); ns.delete(nodeId); return ns; });
    try { stopEditing(nodeId); } catch (error) { logDevError('[graph/ui] stopEditing failed', error); }
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

  const refreshFlightRef = React.useRef<{ inFlight: boolean; lastRun: number; timer: number | null; pending: boolean; lastErrorPayloadHash: string | null; lastErrorAt: number }>({
    inFlight: false,
    lastRun: 0,
    timer: null,
    pending: false,
    lastErrorPayloadHash: null,
    lastErrorAt: 0,
  });

  const refreshMarketNow = useCallback(async (overridePayload?: { nodes: string[]; edges: Array<{ id: string; source: string; target: string }> }) => {
    const state = refreshFlightRef.current;
    const MIN_INTERVAL_MS = 1200;
    const ERROR_COOLDOWN_MS = 30000;

    const schedule = (delay: number) => {
      if (state.timer !== null) return;
      state.timer = window.setTimeout(() => {
        state.timer = null;
        refreshMarketNow();
      }, delay);
    };

    if (state.inFlight) {
      state.pending = true;
      return;
    }

    const elapsed = Date.now() - state.lastRun;
    if (elapsed < MIN_INTERVAL_MS) {
      schedule(MIN_INTERVAL_MS - elapsed);
      return;
    }

    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;
    const payload = overridePayload || buildMarketViewPayload(currentNodes, currentEdges);
    const payloadHash = JSON.stringify(payload);
    if (
      state.lastErrorPayloadHash &&
      state.lastErrorPayloadHash === payloadHash &&
      Date.now() - state.lastErrorAt < ERROR_COOLDOWN_MS
    ) {
      return;
    }

    state.inFlight = true;
    state.pending = false;
    try { await forceSave?.(); } catch { }
    try {
      if (marketEnabled && ydoc && yMetaMap && resolvedId) {
        const res = await fetch(`/api/market/${encodeURIComponent(resolvedId)}/view`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          try {
            const txt = await res.text();
            if (txt && (/outcome enumeration cap exceeded/i.test(txt) || /too many variables/i.test(txt))) {
              toast.error('Too many variables in market view. Delete a few nodes or edges to continue.');
              state.lastErrorPayloadHash = payloadHash;
              state.lastErrorAt = Date.now();
            }
          } catch { }
          return;
        }
        state.lastErrorPayloadHash = null;
        const view = await res.json();
        const marketData = {
          prices: view?.prices || {},
          holdings: {},
          totals: view?.totals || {},
          updatedAt: view?.updatedAt || new Date().toISOString(),
        };
        const prevUpdated = (yMetaMap as any).get?.('market:updatedAt');
        if (!prevUpdated || prevUpdated !== marketData.updatedAt) {
          syncMarketDataToYDoc(ydoc as any, yMetaMap as any, marketData, resolvedId || '', ORIGIN.RUNTIME);
        }
      }
    } catch { }
    finally {
      state.inFlight = false;
      state.lastRun = Date.now();
      if (state.pending) {
        state.pending = false;
        schedule(MIN_INTERVAL_MS);
      }
    }
  }, [forceSave, marketEnabled, ydoc, yMetaMap, resolvedId]);

  useEffect(() => {
    const state = refreshFlightRef.current;
    return () => {
      if (state.timer !== null) {
        try { window.clearTimeout(state.timer); } catch { }
        state.timer = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!marketEnabled) return;
    if (!resolvedId) return;
    if (!Array.isArray(nodes) || !Array.isArray(edges)) return;
    if (nodes.length === 0 && edges.length === 0) return;
    const relevantNodes = nodes
      .filter((n: any) => String(n?.type || '') !== 'edge_anchor')
      .map((n: any) => `${n.id}:${n.type || ''}`)
      .sort()
      .join('|');
    const relevantEdges = edges
      .filter((e: any) => {
        const t = String(e?.type || '').toLowerCase();
        return t === 'support' || t === 'negation' || t === 'objection';
      })
      .map((e: any) => {
        const src = String(e?.source || '').replace(/^anchor:/, '');
        const tgt = String(e?.target || '').replace(/^anchor:/, '');
        return `${e.id}:${e.type || ''}:${src}->${tgt}`;
      })
      .sort()
      .join('|');
    const sig = `${resolvedId}::${relevantNodes}#${relevantEdges}`;
    if (sig && sig !== lastMarketStructSigRef.current) {
      lastMarketStructSigRef.current = sig;
      refreshMarketNow(buildMarketViewPayload(nodesRef.current, edgesRef.current));
    }
  }, [marketEnabled, resolvedId, nodes, edges, refreshMarketNow]);

  const {
    updateNodeContent,
    updateNodeHidden,
    updateNodePosition,
    toggleNodeVote,
    toggleEdgeVote,
    updateEdgeRelevance,
    deleteNode: deleteNodeBase,
    addPointBelow,
    addObjectionForEdge,
    updateEdgeAnchorPosition,
    ensureEdgeAnchor,
    addNodeAtPosition,
    updateNodeType,
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
    onNodeAddedCenterOnce: async (id: string) => {
      if (!connectMode) markNodeCenterOnce(id);
      await refreshMarketNow();
    },
    connectMode,
    currentUserId: userId,
    currentUsername: username,
  });

  const deleteNode = useCallback((nodeId: string) => {
    if (marketPanelNodeId === nodeId || marketPanelEdgeId === nodeId) {
      resetMarketPanel();
    }
    deleteNodeBase(nodeId);
  }, [deleteNodeBase, marketPanelNodeId, marketPanelEdgeId, resetMarketPanel]);

  useEffect(() => {
    if (marketPanelNodeId && !nodes.some((n: any) => n.id === marketPanelNodeId)) {
      resetMarketPanel();
    }
    if (marketPanelEdgeId && !edges.some((e: any) => e.id === marketPanelEdgeId)) {
      resetMarketPanel();
    }
  }, [nodes, edges, marketPanelNodeId, marketPanelEdgeId, resetMarketPanel]);

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
    connectMode,
    async () => { await refreshMarketNow(); }
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
  });

  useKeyboardShortcuts(undo, redo, {
    onToggleConnect: () => {
      if (!canEdit) return;
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
      setGrabMode(!grabMode);
      setConnectAnchorId(null);
    }
  });

  const selectedMarketNodeContent = useMemo(() => {
    if (!marketPanelNodeId) return null;
    try {
      const node = nodes.find((n: any) => n.id === marketPanelNodeId);
      if (!node) return null;
      const content = (node as any)?.data?.content;
      if (typeof content === 'string') return content;
      if (content === undefined || content === null) return '';
      return String(content);
    } catch {
      return null;
    }
  }, [marketPanelNodeId, nodes]);

  useEffect(() => {
    // Seed seen maps once after initial graph is loaded to avoid retroactive notifications
    if (seededHistoricNotificationsRef.current) return;
    if (!Array.isArray(nodes) || !Array.isArray(edges)) return;
    if (nodes.length === 0 && edges.length === 0) return;
    seededHistoricNotificationsRef.current = true;
    nodes.forEach((node: any) => {
      if (node?.type === 'comment') {
        notifiedCommentIdsRef.current.add(node.id);
      }
      const votes = normalizeNotificationVotes(node?.data?.votes);
      if (votes.length === 0) return;
      const set = notifiedUpvotesRef.current.get(node.id) || new Set<string>();
      votes.forEach((vote) => {
        set.add(vote.id);
      });
      if (set.size > 0) {
        notifiedUpvotesRef.current.set(node.id, set);
      }
    });
    edges.forEach((edge: any) => {
      const votes = normalizeNotificationVotes(edge?.data?.votes);
      if (votes.length === 0) return;
      const set = notifiedEdgeVotesRef.current.get(edge.id) || new Set<string>();
      votes.forEach((vote) => {
        set.add(vote.id);
      });
      if (set.size > 0) {
        notifiedEdgeVotesRef.current.set(edge.id, set);
      }
    });
  }, [nodes, edges]);

  useEffect(() => {
    if (!resolvedId || !Array.isArray(nodes) || !Array.isArray(edges)) return;

    const tasks: Promise<void>[] = [];

    const voteSnapshot = new Map<string, Set<string>>();
    const edgeVoteSnapshot = new Map<string, Set<string>>();

    for (const node of nodes as any[]) {
      // Comment notifications
      if (node?.type === 'comment' && !notifiedCommentIdsRef.current.has(node.id)) {
        const actorId = typeof node?.data?.createdBy === 'string' ? node.data.createdBy : null;
        const actorName = node?.data?.createdByName || username || undefined;
        if (actorId) {
          const commentEdge = edges.find((e: any) => e?.type === 'comment' && e?.source === node.id);
          const targetNodeId = commentEdge?.target || null;
          const targetNode = nodes.find((n: any) => n.id === targetNodeId);
          const recipientRaw = targetNode?.data?.createdBy || ownerId || null;
          const recipientId =
            typeof recipientRaw === 'string' && recipientRaw.trim().length > 0 ? recipientRaw : null;
          if (recipientId && recipientId !== actorId) {
            const title = targetNode ? getNodeTitle(targetNode) : 'Comment';
            const commentContent =
              typeof node?.data?.content === 'string' ? node.data.content : undefined;
            const isReply = targetNode?.type === 'comment';
            const actionLabel = isReply ? 'replied to your comment' : 'commented on';
            notifiedCommentIdsRef.current.add(node.id);
            tasks.push(
              createMultiplayerNotification({
                userId: recipientId,
                docId: resolvedId,
                nodeId: targetNodeId || node.id,
                edgeId: commentEdge?.id || null,
                type: 'comment',
                action: actionLabel,
                actorUserId: actorId,
                actorUsername: actorName,
                title,
                content: commentContent,
                metadata: {
                  ...(node?.data?.metadata || {}),
                  isReply,
                  targetNodeId: targetNodeId || null,
                },
              })
                .then(() => {})
                .catch((error) => {
                  logger.error("Failed to create multiplayer notification for comment", error);
                  // eslint-disable-next-line drizzle/enforce-delete-with-where
                  notifiedCommentIdsRef.current.delete(node.id);
                })
            );
          }
        }
      }

      // Upvote notifications
      const votes = normalizeNotificationVotes(node?.data?.votes);
      if (votes.length === 0) continue;
      const voteSet = new Set(votes.map((vote) => vote.id));
      voteSnapshot.set(node.id, voteSet);

      const seen = notifiedUpvotesRef.current.get(node.id) || new Set<string>();
      for (const vote of votes) {
        const voterId = vote.id;
        if (!voterId || seen.has(voterId)) continue;
        const recipientRaw = node?.data?.createdBy || ownerId || null;
        const recipientId =
          typeof recipientRaw === 'string' && recipientRaw.trim().length > 0 ? recipientRaw : null;
        if (!recipientId || recipientId === voterId) {
          seen.add(voterId);
          continue;
        }
        const voterName = vote.name;
        const title = getNodeTitle(node);
        seen.add(voterId);
        tasks.push(
          createMultiplayerNotification({
            userId: recipientId,
            docId: resolvedId,
            nodeId: node.id,
            edgeId: null,
            type: 'upvote',
            action: 'upvoted',
            actorUserId: voterId,
            actorUsername: voterName,
            title,
          })
            .then(() => {})
            .catch((error) => {
              logger.error("Failed to create multiplayer notification for upvote", error);
              // eslint-disable-next-line drizzle/enforce-delete-with-where
              seen.delete(voterId);
            })
        );
      }
      if (seen.size > 0) {
        notifiedUpvotesRef.current.set(node.id, seen);
      }
    }

    for (const edge of edges as any[]) {
      const votes = normalizeNotificationVotes(edge?.data?.votes);
      if (votes.length === 0) continue;
      const voteSet = new Set(votes.map((vote) => vote.id));
      edgeVoteSnapshot.set(edge.id, voteSet);

      const seen = notifiedEdgeVotesRef.current.get(edge.id) || new Set<string>();
      for (const vote of votes) {
        const voterId = vote.id;
        if (!voterId || seen.has(voterId)) continue;
        const recipientRaw = edge?.data?.createdBy || ownerId || null;
        const recipientId =
          typeof recipientRaw === 'string' && recipientRaw.trim().length > 0 ? recipientRaw : null;
        if (!recipientId || recipientId === voterId) {
          seen.add(voterId);
          continue;
        }
        const targetNodeId = typeof edge?.target === 'string' ? edge.target : null;
        const targetNode = targetNodeId ? nodes.find((n: any) => n.id === targetNodeId) : null;
        const title = targetNode ? getNodeTitle(targetNode) : 'Edge';
        const voterName = vote.name;
        seen.add(voterId);
        tasks.push(
          createMultiplayerNotification({
            userId: recipientId,
            docId: resolvedId,
            nodeId: null,
            edgeId: edge.id,
            type: 'upvote',
            action: 'upvoted',
            actorUserId: voterId,
            actorUsername: voterName,
            title,
          })
            .then(() => {})
            .catch((error) => {
              logger.error("Failed to create multiplayer notification for edge upvote", error);
              // eslint-disable-next-line drizzle/enforce-delete-with-where
              seen.delete(voterId);
            })
        );
      }
      if (seen.size > 0) {
        notifiedEdgeVotesRef.current.set(edge.id, seen);
      }
    }

    // Remove stale vote entries to allow re-notify on genuine revote after removal
    notifiedUpvotesRef.current.forEach((set, nodeId) => {
      const current = voteSnapshot.get(nodeId);
      if (!current) {
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        notifiedUpvotesRef.current.delete(nodeId);
        return;
      }
      for (const voterId of Array.from(set)) {
        if (!current.has(voterId)) {
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          set.delete(voterId);
        }
      }
      if (set.size === 0) {
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        notifiedUpvotesRef.current.delete(nodeId);
      }
    });
    lastVoteSnapshotRef.current = voteSnapshot;

    notifiedEdgeVotesRef.current.forEach((set, edgeId) => {
      const current = edgeVoteSnapshot.get(edgeId);
      if (!current) {
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        notifiedEdgeVotesRef.current.delete(edgeId);
        return;
      }
      for (const voterId of Array.from(set)) {
        if (!current.has(voterId)) {
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          set.delete(voterId);
        }
      }
      if (set.size === 0) {
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        notifiedEdgeVotesRef.current.delete(edgeId);
      }
    });

    if (tasks.length > 0) {
      void Promise.all(tasks);
    }
  }, [edges, getNodeTitle, nodes, ownerId, resolvedId, username]);

  const fullyReady = Boolean(initialGraph && resolvedId && (isReady || connectionState === 'failed'));

  if (!fullyReady) {
    return (
      <div className={`fixed inset-0 top-16 bg-gray-50 ${robotoSlab.className}`} style={{ backgroundColor: '#f9fafb' }}>
        <BoardLoading />
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 top-16 bg-gray-50 ${robotoSlab.className}`} style={{ backgroundColor: '#f9fafb' }}>
      <MultiplayerHeader
        username={username}
        userColor={userColor}
        provider={provider}
        isConnected={Boolean(isConnected || connectedWithGrace)}
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
        slug={resolvedSlug || null}
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
        accessRole={accessRole}
        onShareDialogChange={setShareDialogOpen}
        onUrlUpdate={(id, slug) => {
          try {
            if (ydoc && yMetaMap) {
              (ydoc as any).transact(() => {
                (yMetaMap as any).set?.('slug', slug);
              }, ORIGIN.RUNTIME);
            }
          } catch (error) {
            logDevError('[graph/ui] update slug failed', error);
          }
        }}
      />

      {!shareDialogOpen && !notificationsSidebarOpen && (
        <button
          onClick={() => setNotificationsSidebarOpen(true)}
          className="fixed top-1/3 right-0 z-[70] bg-white/95 backdrop-blur-sm border-2 border-r-0 border-stone-300 rounded-l-lg shadow-lg hover:shadow-xl hover:-translate-x-1 transition-all py-6 px-2 group"
          title="Notifications"
        >
          <div className="flex flex-col items-center gap-2">
            <Bell className="h-4 w-4 text-stone-700" />
            {notificationsLoadingState ? (
              <div className="rounded-full w-6 h-6 border-2 border-red-300 border-l-transparent animate-spin" aria-label="Loading notifications" />
            ) : unreadNotificationsCount > 0 ? (
              <div className="bg-red-500 rounded-full w-6 h-6 flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">{unreadNotificationsCount}</span>
              </div>
            ) : null}
          </div>
        </button>
      )}

      <ReactFlowProvider>
        <PerfProvider value={{ perfMode: (((nodes?.length || 0) + (edges?.length || 0)) > 600) || perfBoost || grabMode, setPerfMode: setPerfBoost }}>
          <GraphProvider value={{
            globalMarketOverlays: true,
            currentUserId: userId,
            updateNodeContent,
            updateNodeHidden,
            updateNodePosition,
            toggleNodeVote,
            toggleEdgeVote,
            addPointBelow,
            preferredEdgeType: preferredEdgeTypeRef.current,
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
            duplicateNodeWithConnections,
            hoveredNodeId: hoveredNodeId,
            setHoveredNodeId: (nid: string | null) => {
              if (nid !== null && hoveredNodeId === nid) {
                return;
              }
              setHoveredNodeId(nid);
            },
            blurNodesImmediately,
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
                connectAnchorId={connectAnchorId}
                selectMode={effectiveSelectMode}
                blurAllNodes={forceBlurNodes}
                forceSave={forceSave}
                yMetaMap={yMetaMap as any}
                isMarketPanelVisible={!!(marketPanelNodeId || marketPanelEdgeId)}
                focusTarget={focusTarget}
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
                    showReadOnlyToast();
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
              {!shareDialogOpen && (
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
                />
              )}
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
              try { clearNodeSelection(); } catch (error) { logDevError('[graph/ui] clear selection failed', error); }
              try { blurNodesImmediately(); } catch (error) { logDevError('[graph/ui] blur nodes failed', error); }
              try { setConnectMode(false); } catch (error) { logDevError('[graph/ui] setConnectMode(false) failed', error); }
              try { setConnectAnchorId(null); } catch (error) { logDevError('[graph/ui] setConnectAnchorId(null) failed', error); }
              setNewNodeWithDropdown(null);
            }}
            onSelect={(type) => {
              updateNodeType(newNodeWithDropdown.id, type);
              try { startEditingNodeCtx(newNodeWithDropdown.id); } catch (error) { logDevError('[graph/ui] startEditing from type selector failed', error); }
            }}
          />
        )}

        {/* Market Panel */}
        {isMarketEnabled() && (marketPanelNodeId || marketPanelEdgeId) && (
          <MarketErrorBoundary>
            <MarketPanel
              selectedNodeId={marketPanelNodeId}
              selectedEdgeId={marketPanelEdgeId}
              docId={resolvedId}
              updateNodeContent={updateNodeContent}
              canEdit={canEdit}
              selectedNodeContent={selectedMarketNodeContent}
              onClose={() => {
                // Mirror canvas onPaneClick behavior: clear edge + node selection immediately
                try { setSelectedEdgeId(null); } catch (error) { logDevError('[market/ui] clear selected edge failed', error); }
                try { setHoveredEdgeId(null); } catch (error) { logDevError('[market/ui] clear hovered edge failed', error); }
                try { clearNodeSelection(); } catch (error) { logDevError('[market/ui] clear node selection failed', error); }

                resetMarketPanel();
              }}
              onExpanded={setMarketPanelExpanded}
            />
          </MarketErrorBoundary>
        )}
      </ReactFlowProvider>

      <UndoHintOverlay
        position={undoHintPosition}
        onDismiss={() => setUndoHintPosition(null)}
      />

      <NotificationsSidebar
        isOpen={notificationsSidebarOpen}
        notifications={notifications}
        onNotificationsUpdate={setNotifications}
        onClose={() => setNotificationsSidebarOpen(false)}
        onNotificationRead={handleNotificationRead}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onNavigateToPoint={handleNavigateToPoint}
        isLoading={notificationsLoading || notificationsFetching}
        onRefresh={() => {
          void refetchNotifications();
        }}
      />
    </div>
  );
};

export const MultiplayerBoardContent: React.FC<MultiplayerBoardContentProps> = (props) => {
  const existingClient = React.useContext(QueryClientContext);
  const [fallbackClient] = React.useState(() => new QueryClient());

  if (existingClient) {
    return <MultiplayerBoardContentInner {...props} />;
  }

  return (
    <QueryClientProvider client={fallbackClient}>
      <MultiplayerBoardContentInner {...props} />
    </QueryClientProvider>
  );
};
