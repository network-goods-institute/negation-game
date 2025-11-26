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
import { usePairHeights } from '@/hooks/experiment/multiplayer/usePairHeights';
import { useEdgeSelection } from '@/hooks/experiment/multiplayer/useEdgeSelection';
import { useNodeDragHandlers } from '@/hooks/experiment/multiplayer/useNodeDragHandlers';
import { useMultiplayerTitle } from '@/hooks/experiment/multiplayer/useMultiplayerTitle';
import { useKeyboardShortcuts } from '@/hooks/experiment/multiplayer/useKeyboardShortcuts';
import { useInitialGraph } from '@/hooks/experiment/multiplayer/useInitialGraph';
import { createGraphChangeHandlers } from '@/utils/experiment/multiplayer/graphSync';
import { getMindchangeAveragesForEdges } from '@/actions/experimental/mindchange';
import { buildRationaleDetailPath } from '@/utils/hosts/syncPaths';
import { isProductionRequest } from '@/utils/hosts';
import { QueryClient, QueryClientContext, QueryClientProvider } from '@tanstack/react-query';
import { ORIGIN } from '@/hooks/experiment/multiplayer/yjs/origins';
import { useMindchangeActions } from '@/hooks/experiment/multiplayer/useMindchangeActions';
import { isMindchangeEnabledClient } from '@/utils/featureFlags';
import { useMarket } from '@/hooks/market/useMarket';
import { syncMarketDataToYDoc } from '@/utils/market/marketYDocSync';
import { buildMarketViewPayload, isMarketEnabled } from '@/utils/market/marketUtils';
import { logger } from '@/lib/logger';
import { MarketPanel } from './market/MarketPanel';
import { MarketErrorBoundary } from './market/MarketErrorBoundary';
import { BoardLoading } from './BoardLoading';

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

  const blurNodesImmediately = useCallback(() => {
    setForceBlurNodes((v) => v + 1);
  }, []);

  const { pairHeights, setPairNodeHeight, commitGroupLayout: commitGroupLayoutBase } = usePairHeights();
  const initialGraph = useInitialGraph();

  const isProdHost = typeof window !== 'undefined' ? isProductionRequest(window.location.hostname) : false;

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
    allowPersistence: !(isProdHost && !authenticated),
    localOrigin: localOriginRef.current,
    currentUserId: userId,
    onRemoteNodesAdded: (ids: string[]) => {
      if (!connectMode) {
        for (const id of ids) markNodeCenterOnce(id);
      }
    }
  });

  const marketEnabled = isMarketEnabled();
  const market = useMarket(resolvedId || '');
  const marketViewData = marketEnabled ? (market?.view?.data || null) : null;
  const livePostInFlightRef = React.useRef(false);
  const lastLivePostRef = React.useRef(0);
  // (Reverted) No Yjs-driven refresh; rely on explicit refresh + polling to avoid loops

  // Write market view snapshot to Yjs when local query updates
  useEffect(() => {
    if (!marketEnabled || !market) return;
    if (!ydoc || !yMetaMap) return;
    try {
      const marketData = {
        prices: marketViewData?.prices || {},
        holdings: {},
        totals: marketViewData?.totals || {},
        updatedAt: marketViewData?.updatedAt || new Date().toISOString(),
      };
      syncMarketDataToYDoc(ydoc, yMetaMap, marketData, resolvedId || '', ORIGIN.RUNTIME);
      try {
        const pCount = Object.keys(marketData.prices).length;
        const hCount = Object.keys(marketData.holdings).length;
        const tCount = Object.keys(marketData.totals).length;
        logger.info('[market/ui] wrote snapshot to yMetaMap', { docId: resolvedId, prices: pCount, holdings: hCount, totals: tCount, updatedAt: marketData.updatedAt });
      } catch (error) {
        logDevError('[market/ui] snapshot log failed', error);
      }
    } catch (error) {
      logDevError('[market/ui] snapshot sync failed', error);
    }
  }, [marketEnabled, marketViewData, ydoc, yMetaMap, resolvedId, market]);

  useEffect(() => {
    if (!marketEnabled || !market) return;
    if (!ydoc || !yMetaMap) return;
    const prices = marketViewData?.prices || null;
    const hasServerPrices = prices && Object.keys(prices).length > 0;
    if (hasServerPrices) return;
    try {
      const existing = (yMetaMap as any).get?.('market:prices') || null;
      if (existing && Object.keys(existing).length > 0) return;
    } catch (error) {
      logDevError('[market/ui] read yMetaMap prices failed', error);
    }
    if (!Array.isArray(nodes) || !Array.isArray(edges)) return;
    if (nodes.length === 0 && edges.length === 0) return;
    (async () => {
      try {
        const payload = buildMarketViewPayload(nodes, edges);
        const res = await fetch(`/api/market/${encodeURIComponent(resolvedId || '')}/view`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const view = await res.json();
          const marketData = {
            prices: view?.prices || {},
            holdings: {},
            totals: view?.totals || {},
            updatedAt: view?.updatedAt || new Date().toISOString(),
          };
          const prevUpdated = (yMetaMap as any).get?.('market:updatedAt');
          if (!prevUpdated || prevUpdated !== marketData.updatedAt) {
            syncMarketDataToYDoc(ydoc, yMetaMap, marketData, resolvedId || '', ORIGIN.RUNTIME);
          }
        }
      } catch (error) {
        if (isAbortError(error)) return;
        logDevError('[market/ui] initial market fetch failed', error);
      }
    })();
  }, [marketEnabled, marketViewData, nodes, edges, ydoc, yMetaMap, resolvedId, market]);

  useEffect(() => {
    if (!marketEnabled) return;
    if (!resolvedId || !ydoc || !yMetaMap) return;
    if (!Array.isArray(nodes) || !Array.isArray(edges)) return;
    const payload = buildMarketViewPayload(nodes, edges);
    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      if (livePostInFlightRef.current) return;
      const now = Date.now();
      if (now - lastLivePostRef.current < 2000) return;
      livePostInFlightRef.current = true;
      try {
        const res = await fetch(`/api/market/${encodeURIComponent(resolvedId || '')}/view`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });
        if (!res.ok) {
          try {
            const txt = await res.text();
            if (txt && (/outcome enumeration cap exceeded/i.test(txt) || /too many variables/i.test(txt))) {
              toast.error('Too many variables in market view. Delete a few nodes or edges to continue.');
            }
          } catch {}
          return;
        }
        const view = await res.json();
        const marketData = {
          prices: view?.prices || {},
          holdings: {},
          totals: view?.totals || {},
          updatedAt: view?.updatedAt || new Date().toISOString(),
        };
        const prevUpdated = (yMetaMap as any).get?.('market:updatedAt');
        if (!prevUpdated || prevUpdated !== marketData.updatedAt) {
          syncMarketDataToYDoc(ydoc, yMetaMap, marketData, resolvedId || '', ORIGIN.RUNTIME, 'live');
        }
        lastLivePostRef.current = Date.now();
      } catch (error) {
        if (isAbortError(error)) return;
        logDevError('[market/ui] live market post failed', error);
      }
      finally {
        livePostInFlightRef.current = false;
      }
    }, 400);
    return () => {
      try { ctrl.abort(); } catch (error) { logDevError('[market/ui] abort live post failed', error); }
      window.clearTimeout(timer);
    };
  }, [marketEnabled, resolvedId, nodes, edges, ydoc, yMetaMap, grabMode, connectMode, market]);

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
      } catch (error) {
        logDevError('[mindchange/ui] preload averages failed', error);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedId, ydoc, yMetaMap, edges]);

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
            window.history.replaceState(null, '', path);
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
  const canEdit = Boolean(canWrite && (isConnected || connectedWithGrace));
  const mindchangeEnabled = isMindchangeEnabledClient() && canEdit;

  useEffect(() => {
    if (!mindchangeEnabled) {
      setMindchangeSelectMode(false);
      setMindchangeEdgeId(null);
      setMindchangeNextDir(null);
    }
  }, [mindchangeEnabled, setMindchangeSelectMode, setMindchangeEdgeId, setMindchangeNextDir]);

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
    } else if (hasEdge) {
      setMarketPanelSelection(null, edgeParam!);
      setSelectedEdgeId(edgeParam!);
      setNodes((nds: any[]) =>
        nds.map((n: any) => (n.selected ? { ...n, selected: false } : n))
      );
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
  }, [shareParamsApplied, isConnected, nodes, edges, setNodes, setSelectedEdgeId, setMarketPanelSelection, markShareParamsApplied]);

  // Track node selection changes to open market panel
  useEffect(() => {
    if (!nodes || nodes.length === 0) return;
    const selectedNode = nodes.find((n: any) => n.selected);
    if (selectedNode && isMarketEnabled()) {
      // Only show panel for point and objection nodes
      const nodeType = (selectedNode as any).type;
      if (nodeType === 'point' || nodeType === 'objection') {
        setMarketPanelSelection(selectedNode.id, null);
      } else {
        setMarketPanelSelection(null, null);
      }
    } else if (!selectedNode) {
      // Only clear if there's no edge selected either
      if (!selectedEdgeId) {
        setMarketPanelSelection(null, null);
      }
    }
  }, [nodes, selectedEdgeId, setMarketPanelSelection]);

  // Track edge selection changes to open market panel
  useEffect(() => {
    if (selectedEdgeId && isMarketEnabled()) {
      // Only open market panel for support, negation, and objection edges
      const selectedEdge = edges.find((e: any) => e.id === selectedEdgeId);
      const edgeType = selectedEdge?.type;
      if (edgeType === 'support' || edgeType === 'negation' || edgeType === 'objection') {
        setMarketPanelSelection(null, selectedEdgeId);
      } else {
        setMarketPanelSelection(null, null);
      }
    } else if (!selectedEdgeId) {
      // Only clear if there's no node selected either
      const hasSelectedNode = nodes && nodes.some((n: any) => n.selected);
      if (!hasSelectedNode) {
        setMarketPanelSelection(null, null);
      }
    }
  }, [selectedEdgeId, nodes, edges, setMarketPanelSelection]);

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

  const mindchangeActions = useMindchangeActions({
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
  const setMindchange = mindchangeEnabled ? mindchangeActions.setMindchange : async () => {};
  const getMindchangeBreakdown = mindchangeEnabled
    ? mindchangeActions.getMindchangeBreakdown
    : async () => ({ forward: [], backward: [] } as any);

  const updateEdgeTypeWrapped = useCallback(async (edgeId: string, newType: 'negation' | 'support') => {
    try {
      const prev = edges.find((e: any) => e.id === edgeId);
      if (!prev) return;
      if (prev.type === newType) return;
      updateEdgeType(edgeId, newType);
      if (newType === 'support') {
        try {
          setEdges((eds: any[]) => eds.map((e: any) => e.id === edgeId ? { ...e, data: { ...(e.data || {}), mindchange: undefined } } : e));
        } catch (error) {
          logDevError('[mindchange/ui] clear mindchange on support failed', error);
        }
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
        } catch (error) {
          logDevError('[mindchange/ui] update edge type failed', error);
        }
      }
    } catch (error) {
      logDevError('[mindchange/ui] edge type effect failed', error);
    }
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

  const refreshMarketNow = useCallback(async () => {
    try { await forceSave?.(); } catch {}
    try {
      if (marketEnabled && ydoc && yMetaMap && resolvedId) {
        const payload = buildMarketViewPayload(nodes, edges);
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
            }
          } catch {}
          return;
        }
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
    } catch {}
  }, [forceSave, marketEnabled, ydoc, yMetaMap, resolvedId, nodes, edges]);

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
    onNodeAddedCenterOnce: async (id: string) => {
      if (!connectMode) markNodeCenterOnce(id);
      await refreshMarketNow();
    },
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
          } catch (error) {
            logDevError('[graph/ui] update slug failed', error);
          }
        }}
      />

      <ReactFlowProvider>
        <PerfProvider value={{ perfMode: (((nodes?.length || 0) + (edges?.length || 0)) > 600) || perfBoost || grabMode, setPerfMode: setPerfBoost }}>
          <GraphProvider value={{
            globalMarketOverlays: true,
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
            mindchangeEnabled,
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
              } catch (error) {
                logDevError('[mindchange/ui] beginMindchangeOnEdge failed', error);
              }
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
                mindchangeEnabled={mindchangeEnabled}
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
                isMarketPanelVisible={!!(marketPanelNodeId || marketPanelEdgeId)}
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
