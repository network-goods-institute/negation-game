import { useEffect, useRef, useCallback, useState } from "react";
import { Node, Edge, useNodesState, useEdgesState } from "@xyflow/react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { fetchYjsAuthToken, getRefreshDelayMs } from "./yjs/auth";
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
  const interruptSaveRef = useRef<(() => void) | null>(null);
  const tokenRefreshTimerRef = useRef<number | null>(null);
  const isRefreshingTokenRef = useRef(false);
  const didResyncOnConnectRef = useRef(false);
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

  const persistId = roomName.includes(":")
    ? roomName.slice(roomName.indexOf(":") + 1)
    : roomName;

  const resyncNow = useCallback(async () => {
    try {
      const doc = ydocRef.current;
      if (!doc) return;
      const sv = Y.encodeStateVector(doc);
      const b64 =
        typeof Buffer !== "undefined"
          ? Buffer.from(sv).toString("base64")
          : btoa(String.fromCharCode(...Array.from(sv)));
      const res = await fetch(
        `/api/experimental/rationales/${encodeURIComponent(persistId)}/state?sv=${encodeURIComponent(b64)}&t=${Date.now()}`,
        { cache: "no-store" as RequestCache }
      );
      if (res.status === 204) {
        console.log("[yjs][resync] up-to-date");
        return;
      }
      if (res.ok && (res.headers.get("content-type") || "").includes("application/octet-stream")) {
        const buf = new Uint8Array(await res.arrayBuffer());
        if (buf.byteLength > 0) {
          Y.applyUpdate(doc, buf);
          serverVectorRef.current = Y.encodeStateVector(doc);
          console.log("[yjs][resync] applied", { bytes: buf.byteLength });
        }
      } else {
        console.warn("[yjs][resync] failed", { status: res.status });
      }
    } catch (e) {
      console.warn("[yjs][resync] error", (e as Error).message);
    }
  }, [persistId]);

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
        let authError = false;
        // Try diff-first load using last known state vector from localStorage
        try {
          const svB64 =
            typeof window !== "undefined"
              ? window.localStorage.getItem(`yjs:sv:${persistId}`)
              : null;
          const svTsStr =
            typeof window !== "undefined"
              ? window.localStorage.getItem(`yjs:sv:${persistId}:ts`)
              : null;
          const svTs = svTsStr ? Number(svTsStr) : 0;
          const maxAgeMs = 1000 * 60 * 60 * 24 * 14; // 14 days TTL
          const isFresh = !!svB64 && !!svTs && Date.now() - svTs < maxAgeMs;
          if (svB64 && isFresh) {
            const diffRes = await fetch(
              `/api/experimental/rationales/${encodeURIComponent(persistId)}/state?sv=${encodeURIComponent(svB64)}`
            );
            if (diffRes.status === 401) {
              authError = true;
              setConnectionError(
                "You need to be logged in to load this document"
              );
            } else if (
              diffRes.ok &&
              (diffRes.headers.get("content-type") || "").includes(
                "application/octet-stream"
              )
            ) {
              const buf = new Uint8Array(await diffRes.arrayBuffer());
              if (buf.byteLength > 0) {
                Y.applyUpdate(doc, buf);
                // Only consider hydrated if content actually appeared
                if (yNodes.size > 0 || yEdges.size > 0) {
                  hadContent = true;
                }
              }
            } else if (diffRes.status === 204) {
              // No missing updates vs provided SV. If local doc is empty, the SV is likely stale.
              if (yNodes.size > 0 || yEdges.size > 0) {
                hadContent = true;
              } else if (typeof window !== "undefined") {
                // Clear stale SV to force a full snapshot fetch
                try {
                  window.localStorage.removeItem(`yjs:sv:${persistId}`);
                  window.localStorage.removeItem(`yjs:sv:${persistId}:ts`);
                } catch {}
              }
            }
          } else if (svB64 && !isFresh) {
            // Stale SV present: clear it so we don't take the diff path
            try {
              if (typeof window !== "undefined") {
                window.localStorage.removeItem(`yjs:sv:${persistId}`);
                window.localStorage.removeItem(`yjs:sv:${persistId}:ts`);
              }
            } catch {}
          }
        } catch {}

        // If diff load did not produce content, fall back to snapshot/updates
        let res: Response | null = hadContent
          ? null
          : await fetch(
              `/api/experimental/rationales/${encodeURIComponent(persistId)}/state`
            );
        if (!hadContent && res && res.status === 401) {
          authError = true;
          setConnectionError("You need to be logged in to load this document");
        }
        if (!hadContent && res && res.status === 304) {
          // 304 is success (not modified), treat as having content
          hadContent = true;
        } else if (!hadContent && res && !res.ok && res.status !== 304) {
          // Only refetch on actual errors, not 304
          try {
            res = await fetch(
              `/api/experimental/rationales/${encodeURIComponent(persistId)}/state?t=${Date.now()}`,
              { cache: "no-store" as RequestCache }
            );
          } catch {}
        }
        if (!hadContent && res && res.ok) {
          const ct = res.headers.get("content-type") || "";
          if (ct.includes("application/octet-stream")) {
            try {
              const buf = new Uint8Array(await res.arrayBuffer());
              if (buf.byteLength > 0) {
                Y.applyUpdate(doc, buf);
                if (yNodes.size > 0 || yEdges.size > 0) hadContent = true;
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
                if (yNodes.size > 0 || yEdges.size > 0) hadContent = true;
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
                if (yNodes.size > 0 || yEdges.size > 0) hadContent = true;
                console.log(
                  `[yjs] Applied ${appliedUpdates}/${json.updates.length} updates`
                );
              }
            }
          }
          if (hadContent) {
            serverVectorRef.current = Y.encodeStateVector(doc);
            try {
              if (typeof window !== "undefined" && serverVectorRef.current) {
                // @ts-ignore Buffer available in browser bundlers via polyfill; fallback to btoa
                const b64 =
                  typeof Buffer !== "undefined"
                    ? Buffer.from(serverVectorRef.current).toString("base64")
                    : btoa(
                        String.fromCharCode(
                          ...Array.from(serverVectorRef.current)
                        )
                      );
                window.localStorage.setItem(`yjs:sv:${persistId}`, b64);
                window.localStorage.setItem(
                  `yjs:sv:${persistId}:ts`,
                  String(Date.now())
                );
              }
            } catch {}
          }
          if (
            !authError &&
            yNodes.size === 0 &&
            yEdges.size === 0 &&
            !hadContent
          ) {
            console.log("[yjs] Initializing new document with default content");
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
          } else if (
            !authError &&
            yNodes.size === 0 &&
            yEdges.size === 0 &&
            hadContent
          ) {
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

        // Never initialize default content on load failures
        // Existing documents that fail to load should remain empty to prevent data loss
        console.warn(
          "[yjs] Document load failed - keeping empty state to prevent overwriting existing data"
        );
        setConnectionError(
          "Document failed to load. Try refreshing the page or check your connection."
        );
      }
    })();

    // Autosave: throttle Y updates to API
    const { scheduleSave, forceSave, syncFromMeta, interruptSave } = createScheduleSave(
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
    interruptSaveRef.current = interruptSave;

    const onDocUpdate = (_update: Uint8Array, origin: any) => {
      const isLocal = origin === localOriginRef.current;
      console.log("[yjs][doc.update]", {
        localOrigin: Boolean(isLocal),
        updateBytes: _update?.byteLength ?? 0,
      });
      // Only schedule on local-origin transactions to avoid multiple clients saving
      if (isLocal) scheduleSave();
      // Update local SV cache opportunistically
      try {
        serverVectorRef.current = Y.encodeStateVector(doc);
        if (typeof window !== "undefined" && serverVectorRef.current) {
          // @ts-ignore Buffer may not exist; provide fallback
          const b64 =
            typeof Buffer !== "undefined"
              ? Buffer.from(serverVectorRef.current).toString("base64")
              : btoa(
                  String.fromCharCode(...Array.from(serverVectorRef.current))
                );
          window.localStorage.setItem(`yjs:sv:${persistId}`, b64);
          window.localStorage.setItem(
            `yjs:sv:${persistId}:ts`,
            String(Date.now())
          );
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

    const applyServerDiffIfAny = async () => {
      try {
        const doc = ydocRef.current;
        if (!doc) return;
        const persistId = roomName.includes(":")
          ? roomName.slice(roomName.indexOf(":") + 1)
          : roomName;
        const sv = Y.encodeStateVector(doc);
        const b64 =
          typeof Buffer !== "undefined"
            ? Buffer.from(sv).toString("base64")
            : btoa(String.fromCharCode(...Array.from(sv)));
        const res = await fetch(
          `/api/experimental/rationales/${encodeURIComponent(persistId)}/state?sv=${encodeURIComponent(b64)}`
        );
        if (res.status === 204) return;
        if (res.ok && (res.headers.get("content-type") || "").includes("application/octet-stream")) {
          const buf = new Uint8Array(await res.arrayBuffer());
          if (buf.byteLength > 0) {
            Y.applyUpdate(doc, buf);
            serverVectorRef.current = Y.encodeStateVector(doc);
          }
        }
      } catch (e) {
        console.warn("[yjs] Resync diff fetch failed:", (e as Error).message);
      }
    };

    const attachProviderListeners = (p: WebsocketProvider) => {
      // @ts-ignore minimal event API cross-provider
      p.on("synced", () => {
        console.log("provider synced with document");
        if (!didResyncOnConnectRef.current) {
          didResyncOnConnectRef.current = true;
          void applyServerDiffIfAny();
        }
      });
      // @ts-ignore minimal event API
      p.on("status", (status: any) => {
        console.log("[mp] provider status:", status);
        const isUp = status?.status === "connected";
        setIsConnected(Boolean(isUp));
        if (isUp) setConnectionError(null);
        if (isUp && !didResyncOnConnectRef.current) {
          didResyncOnConnectRef.current = true;
          void applyServerDiffIfAny();
        }
        else setConnectionError("WebSocket connection lost");
      });
      p.on("connection-error", async (error: any) => {
        console.error("[mp] WebSocket connection error:", error);
        setConnectionError(`Connection error: ${error?.message || "Unknown error"}`);
        setIsConnected(false);
        if (!isRefreshingTokenRef.current) {
          isRefreshingTokenRef.current = true;
          try {
            await restartProviderWithNewToken();
          } finally {
            isRefreshingTokenRef.current = false;
          }
        }
      });
      p.on("connection-close", async (_event: any) => {
        if (!isRefreshingTokenRef.current) {
          isRefreshingTokenRef.current = true;
          try {
            await restartProviderWithNewToken();
          } finally {
            isRefreshingTokenRef.current = false;
          }
        }
      });
    };

    const clearTokenTimer = () => {
      if (tokenRefreshTimerRef.current != null) {
        clearTimeout(tokenRefreshTimerRef.current);
        tokenRefreshTimerRef.current = null;
      }
    };

    const scheduleRefresh = (expiresAt: number) => {
      clearTokenTimer();
      const delay = getRefreshDelayMs(expiresAt);
      tokenRefreshTimerRef.current = window.setTimeout(async () => {
        try {
          await restartProviderWithNewToken();
        } catch (e) {
          console.error("[mp] Token refresh failed:", e);
        }
      }, delay) as unknown as number;
    };

    const restartProviderWithNewToken = async () => {
      try {
        const { token, expiresAt } = await fetchYjsAuthToken();
        console.log("[mp] Auth token refreshed");
        const wsProvider = new WebsocketProvider(wsUrl, roomName, doc, {
          WebSocketPolyfill: class extends WebSocket {
            constructor(url: string, protocols?: string | string[]) {
              const urlWithAuth = `${url}?auth=${encodeURIComponent(token)}`;
              super(urlWithAuth, protocols);
            }
          } as any,
        });
        const prev = providerRef.current;
        providerRef.current = wsProvider;
        attachProviderListeners(wsProvider);
        didResyncOnConnectRef.current = false;
        if (prev) {
          try { prev.destroy?.(); } catch {}
        }
        scheduleRefresh(expiresAt);
      } catch (error) {
        console.error("[mp] Failed to refresh auth token:", error);
        setConnectionError("Failed to authenticate WebSocket connection");
      }
    };

    (async () => {
      try {
        const { token, expiresAt } = await fetchYjsAuthToken();
        console.log("[mp] Auth token obtained");
        const provider = new WebsocketProvider(wsUrl, roomName, doc, {
          WebSocketPolyfill: class extends WebSocket {
            constructor(url: string, protocols?: string | string[]) {
              const urlWithAuth = `${url}?auth=${encodeURIComponent(token)}`;
              super(urlWithAuth, protocols);
            }
          } as any,
        });
        providerRef.current = provider;
        attachProviderListeners(provider);
        didResyncOnConnectRef.current = false;
        scheduleRefresh(expiresAt);
      } catch (error) {
        console.error("[mp] Failed to get auth token:", error);
        setConnectionError("Failed to authenticate WebSocket connection");
        return;
      }
    })();

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
      if (tokenRefreshTimerRef.current) {
        clearTimeout(tokenRefreshTimerRef.current);
        tokenRefreshTimerRef.current = null;
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
    yMetaMap: yMetaMapRef.current,
    syncYMapFromArray,
    connectionError,
    isConnected,
    isSaving,
    resyncNow,
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
    interruptSave: interruptSaveRef.current,
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
