import { useEffect, useRef, useCallback, useState } from "react";
import { Node, Edge, useNodesState, useEdgesState } from "@xyflow/react";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { WebsocketProvider } from "y-websocket";

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

  const ydocRef = useRef<Y.Doc | null>(null);
  const webrtcProviderRef = useRef<WebrtcProvider | WebsocketProvider | null>(
    null
  );
  const yNodesMapRef = useRef<Y.Map<Node> | null>(null);
  const yEdgesMapRef = useRef<Y.Map<Edge> | null>(null);
  const yTextMapRef = useRef<Y.Map<Y.Text> | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const savingRef = useRef(false);
  const serverVectorRef = useRef<Uint8Array | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const lastNodesSigRef = useRef<string>("");
  const lastEdgesSigRef = useRef<string>("");
  const localOriginRef = useRef<any>(localOrigin);
  useEffect(() => {
    localOriginRef.current = localOrigin;
  }, [localOrigin]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Initialize Yjs doc/provider once on mount (only if enabled)
  useEffect(() => {
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
    yNodesMapRef.current = yNodes;
    yEdgesMapRef.current = yEdges;
    yTextMapRef.current = yTextMap;

    // Hydrate from server before provider connect
    const persistId = roomName.includes(":")
      ? roomName.slice(roomName.indexOf(":") + 1)
      : roomName;
    (async () => {
      try {
        const res = await fetch(
          `/api/experimental/rationales/${encodeURIComponent(persistId)}/state`
        );
        if (res.ok) {
          const json: { updates: string[] } = await res.json();
          if (Array.isArray(json.updates)) {
            for (const b64 of json.updates) {
              const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
              Y.applyUpdate(doc, bytes);
            }
            if (json.updates.length > 0)
              serverVectorRef.current = Y.encodeStateVector(doc);
          }
          if (yNodes.size === 0 && yEdges.size === 0) {
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
          }
        }
      } catch (e) {
        console.warn("[autosave] load state failed", e);
        if (yNodes.size === 0 && yEdges.size === 0) {
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
        }
      }
    })();

    // Autosave: throttle Y updates to API
    const scheduleSave = () => {
      if (saveTimerRef.current || savingRef.current) return;
      saveTimerRef.current = window.setTimeout(async () => {
        saveTimerRef.current = null;
        if (!ydocRef.current) return;
        try {
          savingRef.current = true;
          setIsSaving(true);
          const update = serverVectorRef.current
            ? Y.encodeStateAsUpdate(ydocRef.current, serverVectorRef.current)
            : Y.encodeStateAsUpdate(ydocRef.current);

          // Guard: only save if there's actual content to save
          if (!update || !update.byteLength) {
            savingRef.current = false;
            setIsSaving(false);
            return;
          }

          await fetch(
            `/api/experimental/rationales/${encodeURIComponent(persistId)}/updates`,
            {
              method: "POST",
              body: update,
            }
          );
          serverVectorRef.current = Y.encodeStateVector(ydocRef.current);
        } catch (e) {
          console.error("[autosave] failed", e);
        } finally {
          savingRef.current = false;
          setIsSaving(false);
        }
      }, 1000);
    };

    const onDocUpdate = () => scheduleSave();
    doc.on("update", onDocUpdate);

    const wsUrl = process.env.NEXT_PUBLIC_YJS_WS_URL;
    console.log("[mp] initializing provider", {
      wsUrl: Boolean(wsUrl),
      roomName,
    });
    const provider = wsUrl
      ? new WebsocketProvider(wsUrl, roomName, doc)
      : new WebrtcProvider(roomName, doc);
    webrtcProviderRef.current = provider as unknown as
      | WebrtcProvider
      | WebsocketProvider;

    // Connection event handlers for WebRTC
    // @ts-ignore minimal event API cross-provider
    provider.on("synced", () => {
      console.log("provider synced with document");
    });

    // y-websocket has no 'peers' event; guard by feature-detection
    // @ts-ignore
    provider.on?.("peers", (peers: any) => {
      const peerCount = Array.from(peers).length;
      console.log("webrtc peers:", peerCount);
      if (peerCount > 0) {
        setIsConnected(true);
        setConnectionError(null);
      } else {
        setIsConnected(false);
        setConnectionError("Waiting for other users to join...");
      }
    });

    // @ts-ignore minimal event API
    provider.on("status", (status: any) => {
      console.log("[mp] provider status:", status);
      const isUp = status?.status === "connected";
      setIsConnected(Boolean(isUp));
      if (isUp) {
        setConnectionError(null);
      } else if (!wsUrl) {
        setConnectionError("Waiting for other users to join...");
      }
    });

    const updateNodesFromY = (evt?: any) => {
      // Allow all node updates to process for immediate feedback
      const arr: Node[] = [];
      // @ts-ignore
      for (const [, v] of yNodes) arr.push(v);

      // Stable sort to avoid unnecessary reference changes
      const sorted = arr.slice().sort((a, b) => {
        const aId = a.id || "";
        const bId = b.id || "";
        return aId.localeCompare(bId);
      });

      const sig = JSON.stringify(
        sorted.map((n) => ({
          id: n.id,
          t: (n as any).type,
          d: (n as any).data,
          p: (n as any).position,
        }))
      );
      if (sig === lastNodesSigRef.current) {
        return;
      }
      lastNodesSigRef.current = sig;

      setNodes(sorted);
    };

    const updateEdgesFromY = (evt?: any) => {
      const arr: Edge[] = [];
      // @ts-ignore
      for (const [, v] of yEdges) arr.push(v);

      // Avoid sorting that changes refs - preserve original order when IDs are equal
      const sorted = arr.slice().sort((a, b) => {
        const aId = a.id || "";
        const bId = b.id || "";
        return aId.localeCompare(bId);
      });

      const sig = JSON.stringify(
        sorted.map((e) => ({
          id: e.id,
          s: (e as any).source,
          t: (e as any).target,
          ty: (e as any).type,
          sh: (e as any).sourceHandle,
          th: (e as any).targetHandle,
        }))
      );
      if (sig === lastEdgesSigRef.current) return;
      lastEdgesSigRef.current = sig;

      setEdges(sorted);
    };

    yNodes.observe(updateNodesFromY);
    yEdges.observe(updateEdgesFromY);
    const updateNodesFromText = (events?: any[]) => {
      if (Array.isArray(events)) {
        // If all events are from our local origin, ignore to avoid text echo
        const allLocal = events.every(
          (e) => e?.transaction?.origin === localOriginRef.current
        );
        if (allLocal && events.length > 0) return;
      }
      const yText = yTextMapRef.current;
      if (!yText) return;
      let changed = false;
      setNodes((nds) => {
        const next = (nds as any[]).map((n: any) => {
          const t = yText.get(n.id);
          if (!t) return n;
          const textVal = t.toString();
          if (n.type === "statement") {
            if (n.data?.statement === textVal) return n;
            changed = true;
            return { ...n, data: { ...n.data, statement: textVal } };
          }
          if (n.data?.content === textVal) return n;
          changed = true;
          return { ...n, data: { ...n.data, content: textVal } };
        }) as any;
        return changed ? next : nds;
      });
    };
    yTextMap.observeDeep(updateNodesFromText);

    // Initialize per-user undo manager and restrict to local origin
    const trackedOrigins = new Set<any>();
    if (localOrigin) trackedOrigins.add(localOrigin);
    // Also capture transactions without an explicit origin
    trackedOrigins.add(null as any);
    undoManagerRef.current = new Y.UndoManager([yNodes, yEdges], {
      trackedOrigins,
    });

    // Ensure existing Y.Text instances are added to the undo scope
    try {
      for (const [key, val] of yTextMap as any) {
        if (val instanceof Y.Text) {
          undoManagerRef.current.addToScope(val);
        }
      }
    } catch {}

    // Track future additions/updates of Y.Text in the map
    const onTextMapChange = (events: any) => {
      // events.changes.keys: Map<key, { action, oldValue }>
      // Collect new/current values from the map by keys that changed
      try {
        // @ts-ignore
        const changedKeys = Array.from(
          events.changes.keys.keys
            ? events.changes.keys.keys()
            : events.keys?.keys?.() || []
        );
        for (const k of changedKeys) {
          const t = yTextMap.get(k as any);
          if (t instanceof Y.Text) {
            undoManagerRef.current?.addToScope(t);
          }
        }
      } catch {}
    };
    yTextMap.observe(onTextMapChange);
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

      // @ts-ignore both providers expose destroy
      webrtcProviderRef.current?.destroy?.();
      ydocRef.current = null;
      webrtcProviderRef.current = null;
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
    <T extends { id: string }>(ymap: Y.Map<T>, arr: T[]) => {
      const sanitize = (item: any) => {
        if (item && typeof item === "object" && "data" in item) {
          const d = (item as any).data || {};
          if (d && typeof d === "object" && "editedBy" in d) {
            const { editedBy, ...rest } = d as any;
            return { ...(item as any), data: rest } as T;
          }
        }
        return item as T;
      };
      const nextIds = new Set(arr.map((i) => i.id));
      // Delete removed
      for (const key of Array.from(ymap.keys())) {
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        if (!nextIds.has(key)) ymap.delete(key);
      }
      // Upsert all
      for (const item of arr) {
        const existing = ymap.get(item.id);
        const sanitizedItem = sanitize(item);
        const sanitizedExisting = existing ? sanitize(existing) : undefined;
        const same =
          sanitizedExisting &&
          JSON.stringify(sanitizedExisting) === JSON.stringify(sanitizedItem);
        if (!same) ymap.set(item.id, sanitizedItem);
      }
    },
    []
  );

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    provider: webrtcProviderRef.current,
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
      undoManagerRef.current.undo();
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
      undoManagerRef.current.redo();
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
  };
};
