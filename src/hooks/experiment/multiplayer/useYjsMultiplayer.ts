import { useEffect, useRef, useCallback, useState } from "react";
import { Node, Edge, useNodesState, useEdgesState } from "@xyflow/react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import {
  createOnTextMapChange,
  createScheduleSave,
  createUpdateEdgesFromY,
  createUpdateNodesFromText,
  createUpdateNodesFromY,
} from "./yjs/handlers";
import { addTextToUndoScope, createUndoManager } from "./yjs/undo";
import { syncYMapFromArray as syncYMapFromArrayHelper } from "./yjs/sync";

interface UseYjsMultiplayerProps {
  roomName: string;
  initialNodes: Node[];
  initialEdges: Edge[];
  enabled?: boolean;
  localOrigin?: any;
}

export const useYjsMultiplayer = ({
  roomName,
  initialNodes,
  initialEdges,
  enabled = true,
  localOrigin,
}: UseYjsMultiplayerProps) => {
  const [nodes, setNodes, rawOnNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, rawOnEdgesChange] = useEdgesState(initialEdges);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [nextSaveTime, setNextSaveTime] = useState<number | null>(null);

  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const yNodesMapRef = useRef<Y.Map<Node> | null>(null);
  const yEdgesMapRef = useRef<Y.Map<Edge> | null>(null);
  const yTextMapRef = useRef<Y.Map<Y.Text> | null>(null);
  const yMetaMapRef = useRef<Y.Map<any> | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const savingRef = useRef(false);
  const serverVectorRef = useRef<Uint8Array | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const lastNodesSigRef = useRef<string>("");
  const lastEdgesSigRef = useRef<string>("");
  const localOriginRef = useRef<any>(localOrigin);
  const forceSaveRef = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    localOriginRef.current = localOrigin;
  }, [localOrigin]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const isUndoRedoRef = useRef(false);

  const handleForceSave = useCallback(async () => {
    if (forceSaveRef.current) {
      await forceSaveRef.current();
    }
  }, []);

  // Initialize Yjs doc/provider once on mount (only if enabled)
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
    setConnectionError("Waiting for other users to join...");

    const yNodes = doc.getMap<Node>("nodes");
    const yEdges = doc.getMap<Edge>("edges");
    const yTextMap = doc.getMap<Y.Text>("node_text");
    const yMetaMap = doc.getMap<any>("meta");
    yNodesMapRef.current = yNodes;
    yEdgesMapRef.current = yEdges;
    yTextMapRef.current = yTextMap;
    yMetaMapRef.current = yMetaMap;

    // Hydrate from server before provider connect
    const persistId = roomName.includes(":")
      ? roomName.slice(roomName.indexOf(":") + 1)
      : roomName;
    (async () => {
      try {
        let hadContent = false;
        // Try diff-first load using last known state vector from localStorage
        try {
          const svB64 = typeof window !== 'undefined' ? window.localStorage.getItem(`yjs:sv:${persistId}`) : null;
          if (svB64) {
            const diffRes = await fetch(`/api/experimental/rationales/${encodeURIComponent(persistId)}/state?sv=${encodeURIComponent(svB64)}`);
            if (diffRes.ok && (diffRes.headers.get('content-type') || '').includes('application/octet-stream')) {
              const buf = new Uint8Array(await diffRes.arrayBuffer());
              if (buf.byteLength > 0) {
                Y.applyUpdate(doc, buf);
                hadContent = true;
              }
            } else if (diffRes.status === 204) {
              hadContent = true;
            }
          }
        } catch {}

        // If diff load did not produce content, fall back to snapshot/updates
        const res = hadContent ? null : await fetch(
          `/api/experimental/rationales/${encodeURIComponent(persistId)}/state`
        );
        if (!hadContent && res && res.ok) {
          const ct = res.headers.get("content-type") || "";
          if (ct.includes("application/octet-stream")) {
            try {
              const buf = new Uint8Array(await res.arrayBuffer());
              if (buf.byteLength > 0) {
                Y.applyUpdate(doc, buf);
                hadContent = true;
              }
            } catch (error) {
              console.warn(
                "[yjs] Failed to apply binary snapshot:",
                (error as Error).message
              );
            }
          } else {
            const json: any = await res.json().catch(() => ({}));
            if (json?.snapshot) {
              try {
                const bytes = Uint8Array.from(atob(json.snapshot), (c) =>
                  c.charCodeAt(0)
                );
                Y.applyUpdate(doc, bytes);
                hadContent = true;
              } catch (updateError) {
                console.warn(
                  "[yjs] Failed to apply snapshot:",
                  (updateError as Error).message
                );
              }
            } else if (Array.isArray(json?.updates)) {
              let appliedUpdates = 0;
              for (const b64 of json.updates) {
                try {
                  const bytes = Uint8Array.from(atob(b64), (c) =>
                    c.charCodeAt(0)
                  );
                  Y.applyUpdate(doc, bytes);
                  appliedUpdates++;
                } catch (updateError) {
                  console.warn(
                    "[yjs] Skipping corrupted update:",
                    (updateError as Error).message
                  );
                }
              }
              if (appliedUpdates > 0) {
                hadContent = true;
                console.log(
                  `[yjs] Applied ${appliedUpdates}/${json.updates.length} updates`
                );
              }
            }
          }
          if (hadContent) {
            serverVectorRef.current = Y.encodeStateVector(doc);
            try {
              if (typeof window !== 'undefined' && serverVectorRef.current) {
                // @ts-ignore Buffer available in browser bundlers via polyfill; fallback to btoa
                const b64 = (typeof Buffer !== 'undefined')
                  ? Buffer.from(serverVectorRef.current).toString('base64')
                  : btoa(String.fromCharCode(...Array.from(serverVectorRef.current)));
                window.localStorage.setItem(`yjs:sv:${persistId}`, b64);
              }
            } catch {}
          }
          if (yNodes.size === 0 && yEdges.size === 0 && !hadContent) {
            doc.transact(() => {
              for (const n of initialNodes) yNodes.set(n.id, n);
              for (const e of initialEdges) yEdges.set(e.id, e);
              for (const n of initialNodes) {
                if (!yTextMap.get(n.id)) {
                  const t = new Y.Text();
                  const initial =
                    (n as any).type === "statement"
                      ? (n as any).data?.statement || ""
                      : (n as any).data?.content || "";
                  if (initial) t.insert(0, initial);
                  yTextMap.set(n.id, t);
                }
              }
            }, "seed");
          } else if (yNodes.size === 0 && yEdges.size === 0 && hadContent) {
            console.warn(
              "[yjs] Document appears corrupted - has updates but no content after applying them"
            );
            setConnectionError(
              "Document data appears corrupted. Some content may be missing."
            );
          }
        }
      } catch (e) {
        console.error("[yjs] Failed to load document state:", e);
        setConnectionError(
          `Failed to load document: ${e instanceof Error ? e.message : "Unknown error"}`
        );

        // Only initialize with default content if we couldn't reach the server at all
        // Don't overwrite potentially recoverable data
        if (yNodes.size === 0 && yEdges.size === 0) {
          console.log(
            "[yjs] Initializing with default content due to load failure"
          );
          doc.transact(() => {
            for (const n of initialNodes) yNodes.set(n.id, n);
            for (const e of initialEdges) yEdges.set(e.id, e);
            for (const n of initialNodes) {
              if (!yTextMap.get(n.id)) {
                const t = new Y.Text();
                const initial =
                  (n as any).type === "statement"
                    ? (n as any).data?.statement || ""
                    : (n as any).data?.content || "";
                if (initial) t.insert(0, initial);
                yTextMap.set(n.id, t);
              }
            }
          }, "fallback-seed");
        }
      }
    })();

    // Autosave: throttle Y updates to API
    const { scheduleSave, forceSave, syncFromMeta } = createScheduleSave(
      ydocRef,
      serverVectorRef,
      setIsSaving,
      savingRef,
      saveTimerRef,
      persistId,
      setNextSaveTime,
      yMetaMapRef,
      localOriginRef
    );

    forceSaveRef.current = forceSave;

    const onDocUpdate = (_update: Uint8Array, origin: any) => {
      // Only schedule on local-origin transactions to avoid multiple clients saving
      if (origin === localOriginRef.current) scheduleSave();
      // Update local SV cache opportunistically
      try {
        serverVectorRef.current = Y.encodeStateVector(doc);
        if (typeof window !== 'undefined' && serverVectorRef.current) {
          // @ts-ignore Buffer may not exist; provide fallback
          const b64 = (typeof Buffer !== 'undefined')
            ? Buffer.from(serverVectorRef.current).toString('base64')
            : btoa(String.fromCharCode(...Array.from(serverVectorRef.current)));
          window.localStorage.setItem(`yjs:sv:${persistId}`, b64);
        }
      } catch {}
    };
    doc.on("update", onDocUpdate);

    const wsUrl = process.env.NEXT_PUBLIC_YJS_WS_URL;
    console.log("[mp] initializing provider", {
      wsUrl: Boolean(wsUrl),
      roomName,
    });

    if (!wsUrl) {
      console.error("[mp] NEXT_PUBLIC_YJS_WS_URL is required");
      setConnectionError("WebSocket URL not configured");
      return;
    }

    const provider = new WebsocketProvider(wsUrl, roomName, doc);
    providerRef.current = provider;

    // Connection event handlers for WebSocket
    // @ts-ignore minimal event API cross-provider
    provider.on("synced", () => {
      console.log("provider synced with document");
    });

    // y-websocket doesn't have a 'peers' event like y-webrtc

    // @ts-ignore minimal event API
    provider.on("status", (status: any) => {
      console.log("[mp] provider status:", status);
      const isUp = status?.status === "connected";
      setIsConnected(Boolean(isUp));
      if (isUp) {
        setConnectionError(null);
      } else {
        setConnectionError("WebSocket connection lost");
      }
    });

    provider.on("connection-error", (error: any) => {
      console.error("[mp] WebSocket connection error:", error);
      setConnectionError(
        `Connection error: ${error?.message || "Unknown error"}`
      );
      setIsConnected(false);
    });

    provider.on("connection-close", (event: any) => {
      console.log("[mp] WebSocket connection closed:", event);
      if (event?.code === 1006) {
        setConnectionError("WebSocket connection closed abnormally");
      } else {
        setConnectionError("WebSocket connection closed");
      }
      setIsConnected(false);
    });

    const updateNodesFromY = createUpdateNodesFromY(
      yNodes as any,
      yTextMapRef as any,
      lastNodesSigRef,
      setNodes as any,
      localOriginRef as any
    );

    const updateEdgesFromY = createUpdateEdgesFromY(
      yEdges as any,
      lastEdgesSigRef,
      setEdges as any
    );

    yNodes.observe(updateNodesFromY as any);
    yEdges.observe(updateEdgesFromY);
    const updateNodesFromText = createUpdateNodesFromText(
      yTextMapRef as any,
      localOriginRef as any,
      setNodes as any,
      isUndoRedoRef
    );
    yTextMap.observeDeep(updateNodesFromText as any);

    // Initialize per-user undo manager and restrict to local origin
    const trackedOrigins = new Set<any>();
    if (localOrigin) trackedOrigins.add(localOrigin);
    // Also capture transactions without an explicit origin
    trackedOrigins.add(null as any);
    undoManagerRef.current = createUndoManager(
      yNodes as any,
      yEdges as any,
      yTextMap as any,
      localOriginRef.current
    );

    // Ensure existing Y.Text instances are added to the undo scope
    if (yTextMap) addTextToUndoScope(undoManagerRef.current!, yTextMap as any);

    // Track future additions/updates of Y.Text in the map
    const onTextMapChange = createOnTextMapChange(
      yTextMap as any,
      undoManagerRef.current
    );
    yTextMap.observe(onTextMapChange as any);

    // Observe shared meta for nextSaveAt/saving across peers and align timer
    const onMetaChange = () => {
      try {
        syncFromMeta();
      } catch {}
    };
    // initial alignment
    onMetaChange();
    yMetaMap.observe(onMetaChange as any);
    console.log(
      "[undo] UndoManager initialized with scoped origins and Y.Text tracking"
    );

    // Wire undo manager events to reflect canUndo/canRedo state
    const recalcStacks = () => {
      const um = undoManagerRef.current;
      if (!um) {
        setCanUndo(false);
        setCanRedo(false);
        return;
      }
      setCanUndo(um.undoStack.length > 0);
      setCanRedo(um.redoStack.length > 0);
    };
    recalcStacks();
    const onAdded = () => recalcStacks();
    const onPopped = () => recalcStacks();
    const onCleared = () => recalcStacks();
    // @ts-ignore
    undoManagerRef.current.on("stack-item-added", onAdded);
    // @ts-ignore
    undoManagerRef.current.on("stack-item-popped", onPopped);
    // @ts-ignore
    undoManagerRef.current.on("stack-cleared", onCleared);
    // @ts-ignore events are untyped
    undoManagerRef.current.on("stack-item-added", (evt: any) => {
      console.log("[undo] stack-item-added", {
        source: evt?.source,
        type: evt?.type,
      });
    });
    // @ts-ignore
    undoManagerRef.current.on("stack-item-popped", (evt: any) => {
      console.log("[undo] stack-item-popped", {
        source: evt?.source,
        type: evt?.type,
      });
    });
    // @ts-ignore
    undoManagerRef.current.on("stack-cleared", () => {
      console.log("[undo] stack-cleared");
    });

    // Initial sync to local state
    updateNodesFromY();
    updateEdgesFromY();

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (ydocRef.current) {
        // flush a final save
        try {
          const update = serverVectorRef.current
            ? Y.encodeStateAsUpdate(ydocRef.current, serverVectorRef.current)
            : Y.encodeStateAsUpdate(ydocRef.current);
          if (update && update.byteLength)
            fetch(
              `/api/experimental/rationales/${encodeURIComponent(persistId)}/updates`,
              { method: "POST", body: update }
            ).catch(() => {});
        } catch {}
      }
      doc.off("update", onDocUpdate);
      yNodes.unobserve(updateNodesFromY);
      yEdges.unobserve(updateEdgesFromY);
      yTextMap.unobserveDeep(updateNodesFromText);
      // @ts-ignore
      yTextMap.unobserve(onTextMapChange);
      yMetaMap.unobserve(onMetaChange as any);
      // Detach UndoManager listeners before destroy
      try {
        if (undoManagerRef.current) {
          // @ts-ignore
          undoManagerRef.current.off?.("stack-item-added", onAdded);
          // @ts-ignore
          undoManagerRef.current.off?.("stack-item-popped", onPopped);
          // @ts-ignore
          undoManagerRef.current.off?.("stack-cleared", onCleared);
        }
      } catch {}

      providerRef.current?.destroy?.();
      ydocRef.current = null;
      providerRef.current = null;
      undoManagerRef.current = null;
    };
  }, [
    roomName,
    setNodes,
    setEdges,
    initialNodes,
    initialEdges,
    enabled,
    localOrigin,
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
    syncYMapFromArray,
    connectionError,
    isConnected,
    isSaving,
    undo: () => {
      console.log("[undo] requested");
      if (!undoManagerRef.current) return;
      const before = {
        undo: undoManagerRef.current.undoStack.length,
        redo: undoManagerRef.current.redoStack.length,
      } as any;
      console.log("[undo] stack sizes before", before);

      isUndoRedoRef.current = true;
      undoManagerRef.current.undo();
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 100);

      // reflect current state
      try {
        setCanUndo(undoManagerRef.current.undoStack.length > 0);
        setCanRedo(undoManagerRef.current.redoStack.length > 0);
      } catch {}
      const after = {
        undo: undoManagerRef.current.undoStack.length,
        redo: undoManagerRef.current.redoStack.length,
      } as any;
      console.log("[undo] stack sizes after", after);
    },
    redo: () => {
      console.log("[undo] redo requested");
      if (!undoManagerRef.current) return;
      const before = {
        undo: undoManagerRef.current.undoStack.length,
        redo: undoManagerRef.current.redoStack.length,
      } as any;
      console.log("[undo] stack sizes before", before);

      isUndoRedoRef.current = true;
      undoManagerRef.current.redo();
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 100);

      try {
        setCanUndo(undoManagerRef.current.undoStack.length > 0);
        setCanRedo(undoManagerRef.current.redoStack.length > 0);
      } catch {}
      const after = {
        undo: undoManagerRef.current.undoStack.length,
        redo: undoManagerRef.current.redoStack.length,
      } as any;
      console.log("[undo] stack sizes after", after);
    },
    canUndo,
    canRedo,
    forceSave: handleForceSave,
    nextSaveTime,
    registerTextInUndoScope: (t: any) => {
      try {
        if (undoManagerRef.current && t) {
          undoManagerRef.current.addToScope(t);
        }
      } catch (error) {
        console.warn("[undo] Failed to manually register Y.Text:", error);
      }
    },
  };
};
