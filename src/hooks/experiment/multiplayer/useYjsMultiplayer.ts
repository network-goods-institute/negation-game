import { useCallback, useEffect, useRef, useState } from "react";
import { Edge, Node, useEdgesState, useNodesState } from "@xyflow/react";
import * as Y from "yjs";
import { syncYMapFromArray as syncYMapFromArrayHelper } from "./yjs/sync";
import { useYjsDocumentHydration } from "./useYjsDocumentHydration";
import { useYjsProviderConnection } from "./useYjsProviderConnection";
import { useYjsSynchronization } from "./useYjsSynchronization";
import { useYjsUndoRedo } from "./useYjsUndoRedo";

interface UseYjsMultiplayerProps {
  roomName: string;
  initialNodes: Node[];
  initialEdges: Edge[];
  enabled?: boolean;
  localOrigin?: unknown;
}

export const useYjsMultiplayer = ({
  roomName,
  initialNodes,
  initialEdges,
  enabled = true,
  localOrigin,
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
      setConnectionError,
      setConnectionState,
    });

  const {
    undoManagerRef,
    setupUndoManager,
    undo,
    redo,
    canUndo,
    canRedo,
    registerTextInUndoScope,
    setScheduleSave,
  } = useYjsUndoRedo({
    yNodesMapRef,
    yEdgesMapRef,
    yTextMapRef,
    localOriginRef,
    isUndoRedoRef,
  });

  const { setupObservers, getForceSave, getScheduleSave, getInterruptSave } =
    useYjsSynchronization({
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
    if (process.env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED !== "true") {
      setConnectionError("Multiplayer experiment is disabled");
      setIsConnected(false);
      return;
    }

    if (!enabled) {
      setConnectionError("Initializing...");
      setIsConnected(false);
      return;
    }

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

    const syncCleanup = setupObservers();
    const undoCleanup = setupUndoManager();

    setScheduleSave(getScheduleSave() || undefined);
    forceSaveRef.current = getForceSave();

    hydrateFromServer().catch(() => undefined);
    initializeProvider().catch(() => undefined);

    return () => {
      handleInterruptSave();

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
  }, [
    cleanupProvider,
    enabled,
    getForceSave,
    getScheduleSave,
    handleInterruptSave,
    hydrateFromServer,
    initializeProvider,
    persistId,
    setScheduleSave,
    setupObservers,
    setupUndoManager,
  ]);

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
    canUndo,
    canRedo,
    forceSave: handleForceSave,
    interruptSave: handleInterruptSave,
    nextSaveTime,
    registerTextInUndoScope,
    isUndoRedoRef,
    restartProviderWithNewToken,
  };
};
