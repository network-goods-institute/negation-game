import { useCallback, useEffect, useRef, useState } from "react";
import { Edge, Node, useEdgesState, useNodesState } from "@xyflow/react";
import * as Y from "yjs";
import { syncYMapFromArray as syncYMapFromArrayHelper } from "./yjs/sync";
import {
  HydrationStatus,
  useYjsDocumentHydration,
} from "./useYjsDocumentHydration";
import { useYjsProviderConnection } from "./useYjsProviderConnection";
import { useYjsSynchronization } from "./useYjsSynchronization";
import { useYjsUndoRedo } from "./useYjsUndoRedo";

interface UseYjsMultiplayerProps {
  roomName: string;
  initialNodes: Node[];
  initialEdges: Edge[];
  enabled?: boolean;
  localOrigin?: unknown;
  isLockedForMe?: (nodeId: string) => boolean;
  onSaveComplete?: () => void;
  onRemoteNodesAdded?: (ids: string[]) => void;
  currentUserId?: string;
}

export const useYjsMultiplayer = ({
  roomName,
  initialNodes,
  initialEdges,
  enabled = true,
  localOrigin,
  isLockedForMe,
  onSaveComplete,
  onRemoteNodesAdded,
  currentUserId,
}: UseYjsMultiplayerProps) => {
  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<
    "initializing" | "connecting" | "connected" | "failed"
  >("initializing");
  const [nextSaveTime, setNextSaveTime] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const ydocRef = useRef<Y.Doc | null>(null);
  const yNodesMapRef = useRef<Y.Map<Node> | null>(null);
  const yEdgesMapRef = useRef<Y.Map<Edge> | null>(null);
  const yTextMapRef = useRef<Y.Map<Y.Text> | null>(null);
  const yMetaMapRef = useRef<Y.Map<unknown> | null>(null);

  const saveTimerRef = useRef<number | null>(null);
  const savingRef = useRef(false);
  const serverVectorRef = useRef<Uint8Array | null>(null);
  const localOriginRef = useRef(localOrigin);
  const didResyncOnConnectRef = useRef(false);
  const shouldSeedOnConnectRef = useRef(false);
  const seededOnceRef = useRef(false);
  const hydrationStatusRef = useRef<HydrationStatus>({
    phase: "pending",
    hasContent: false,
    mapCount: { nodes: 0, edges: 0 },
    observedNodeIds: [],
  });
  const isUndoRedoRef = useRef(false);
  const forceSaveRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    localOriginRef.current = localOrigin;
  }, [localOrigin]);

  const persistId = roomName.includes(":")
    ? roomName.slice(roomName.indexOf(":") + 1)
    : roomName;

  const { hydrateFromServer, resyncFromServer, updateLocalStateVector } =
    useYjsDocumentHydration({
      persistId,
      ydocRef,
      yNodesMapRef,
      yEdgesMapRef,
      serverVectorRef,
      shouldSeedOnConnectRef,
      hydrationStatusRef,
      setConnectionError,
      setConnectionState,
    });

  const {
    undoManagerRef,
    setupUndoManager,
    undo,
    redo,
    stopCapturing,
    canUndo,
    canRedo,
    setScheduleSave,
  } = useYjsUndoRedo({
    yNodesMapRef,
    yEdgesMapRef,
    yTextMapRef,
    yMetaMapRef,
    localOriginRef,
    isUndoRedoRef,
  });

  const {
    setupObservers,
    getForceSave,
    getScheduleSave,
    getInterruptSave,
    getInterruptSaveForCleanup,
  } = useYjsSynchronization({
    ydocRef,
    yNodesMapRef,
    yEdgesMapRef,
    yTextMapRef,
    yMetaMapRef,
    serverVectorRef,
    saveTimerRef,
    savingRef,
    localOriginRef,
    isUndoRedoRef,
    persistId,
    setNodes,
    setEdges,
    setIsSaving,
    setNextSaveTime,
    undoManagerRef,
    updateLocalStateVector,
    isLockedForMe,
    onSaveComplete,
    onRemoteNodesAdded,
    currentUserId,
  });

  const {
    providerRef,
    initializeProvider,
    restartProviderWithNewToken,
    cleanup: cleanupProvider,
  } = useYjsProviderConnection({
    roomName,
    wsUrl: process.env.NEXT_PUBLIC_YJS_WS_URL || "",
    ydocRef,
    yNodesMapRef,
    yEdgesMapRef,
    yTextMapRef,
    shouldSeedOnConnectRef,
    seededOnceRef,
    didResyncOnConnectRef,
    hydrationStatusRef,
    initialNodes,
    initialEdges,
    forceSaveRef,
    setIsConnected,
    setConnectionError,
    setConnectionState,
    onResyncFromServer: resyncFromServer,
  });

  const handleForceSave = useCallback(async () => {
    const forceSave = getForceSave();
    if (forceSave) {
      await forceSave();
    }
  }, [getForceSave]);

  const handleInterruptSave = useCallback(() => {
    getInterruptSave()?.();
  }, [getInterruptSave]);

  useEffect(() => {
    console.log("[useYjsMultiplayer] Effect triggered", {
      enabled,
      persistId,
      roomName,
    });

    if (process.env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED !== "true") {
      console.log("[useYjsMultiplayer] Multiplayer experiment disabled");
      setConnectionError("Multiplayer experiment is disabled");
      setIsConnected(false);
      return;
    }

    if (!enabled) {
      console.log("[useYjsMultiplayer] Not enabled, waiting...");
      setConnectionError("Initializing...");
      setIsConnected(false);
      return;
    }

    console.log("[useYjsMultiplayer] Starting initialization for", persistId);
    const doc = new Y.Doc();
    ydocRef.current = doc;
    setIsConnected(false);
    setConnectionState("connecting");
    setConnectionError("Connecting to server...");

    const yNodes = doc.getMap<Node>("nodes");
    const yEdges = doc.getMap<Edge>("edges");
    const yText = doc.getMap<Y.Text>("node_text");
    const yMeta = doc.getMap<unknown>("meta");

    yNodesMapRef.current = yNodes;
    yEdgesMapRef.current = yEdges;
    yTextMapRef.current = yText;
    yMetaMapRef.current = yMeta;

    console.log("[useYjsMultiplayer] Setting up observers and undo manager");
    const syncCleanup = setupObservers();
    const undoCleanup = setupUndoManager();

    setScheduleSave(getScheduleSave() || undefined);
    forceSaveRef.current = getForceSave();

    console.log("[useYjsMultiplayer] Starting hydration and provider");
    hydrateFromServer().catch((err) => {
      console.error("[useYjsMultiplayer] Hydration failed:", err);
    });
    initializeProvider().catch((err) => {
      console.error("[useYjsMultiplayer] Provider init failed:", err);
    });

    return () => {
      getInterruptSaveForCleanup()?.();

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      const activeDoc = ydocRef.current;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const vector = serverVectorRef.current;
      if (activeDoc) {
        try {
          const update = vector
            ? Y.encodeStateAsUpdate(activeDoc, vector)
            : Y.encodeStateAsUpdate(activeDoc);
          if (update && update.byteLength) {
            fetch(
              `/api/experimental/rationales/${encodeURIComponent(persistId)}/updates`,
              {
                method: "POST",
                body: new Blob([update as unknown as BlobPart]),
              }
            ).catch(() => undefined);
          }
        } catch {}
      }

      syncCleanup?.();
      undoCleanup?.();
      cleanupProvider();
      ydocRef.current = null;
      yNodesMapRef.current = null;
      yEdgesMapRef.current = null;
      yTextMapRef.current = null;
      yMetaMapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, persistId]);

  const syncYMapFromArray = useCallback(
    <T extends { id: string }>(ymap: Y.Map<T>, arr: T[]) =>
      syncYMapFromArrayHelper(ymap, arr),
    []
  );

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    provider: providerRef.current,
    ydoc: ydocRef.current,
    yNodesMap: yNodesMapRef.current,
    yEdgesMap: yEdgesMapRef.current,
    yTextMap: yTextMapRef.current,
    yMetaMap: yMetaMapRef.current,
    syncYMapFromArray,
    connectionError,
    connectionState,
    isConnected,
    isSaving,
    resyncNow: resyncFromServer,
    undo,
    redo,
    stopCapturing,
    canUndo,
    canRedo,
    forceSave: handleForceSave,
    interruptSave: handleInterruptSave,
    nextSaveTime,
    restartProviderWithNewToken,
  };
};
