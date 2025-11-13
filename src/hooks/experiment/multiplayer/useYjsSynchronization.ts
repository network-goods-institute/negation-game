import {
  useCallback,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import * as Y from "yjs";
import { Edge, Node } from "@xyflow/react";
import { createUpdateNodesFromY } from "./yjs/nodeSync";
import { createUpdateEdgesFromY } from "./yjs/edgeSync";
import {
  createOnTextMapChange,
  createUpdateNodesFromText,
} from "./yjs/textSync";
import { createScheduleSave } from "./yjs/saveHandlers";
import { isMindchangeEnabledClient } from "@/utils/featureFlags";import { logger } from "@/lib/logger";

interface UseYjsSynchronizationProps {
  ydocRef: MutableRefObject<Y.Doc | null>;
  yNodesMapRef: MutableRefObject<Y.Map<Node> | null>;
  yEdgesMapRef: MutableRefObject<Y.Map<Edge> | null>;
  yTextMapRef: MutableRefObject<Y.Map<Y.Text> | null>;
  yMetaMapRef: MutableRefObject<Y.Map<unknown> | null>;
  serverVectorRef: MutableRefObject<Uint8Array | null>;
  saveTimerRef: MutableRefObject<number | null>;
  savingRef: MutableRefObject<boolean>;
  localOriginRef: MutableRefObject<unknown>;
  isUndoRedoRef: MutableRefObject<boolean>;
  persistId: string;
  setNodes: (updater: (nodes: Node[]) => Node[]) => void;
  setEdges: (updater: (edges: Edge[]) => Edge[]) => void;
  setIsSaving: (saving: boolean) => void;
  setNextSaveTime: Dispatch<SetStateAction<number | null>>;
  undoManagerRef: MutableRefObject<Y.UndoManager | null>;
  updateLocalStateVector: () => void;
  isLockedForMe?: (nodeId: string) => boolean;
  onSaveComplete?: () => void;
  onRemoteNodesAdded?: (ids: string[]) => void;
}

export interface SynchronizationHandlers {
  setupObservers: () => (() => void) | undefined;
  getForceSave: () => (() => Promise<void>) | null;
  getScheduleSave: () => (() => void) | null;
  getInterruptSave: () => (() => void) | null;
  getInterruptSaveForCleanup: () => (() => void) | null;
}

/**
 * Wires Yjs CRDTs to React state and orchestrates distributed saves.
 */
export const useYjsSynchronization = ({
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
  allowPersistence = true,
}: UseYjsSynchronizationProps & { currentUserId?: string; allowPersistence?: boolean }): SynchronizationHandlers => {
  const lastNodesSignatureRef = useRef<string>("");
  const lastEdgesSignatureRef = useRef<string>("");
  const forceSaveRef = useRef<(() => Promise<void>) | null>(null);
  const scheduleSaveRef = useRef<(() => void) | null>(null);
  const interruptSaveRef = useRef<(() => void) | null>(null);
  const interruptSaveForCleanupRef = useRef<(() => void) | null>(null);

  const setupObservers = useCallback(() => {
    const doc = ydocRef.current;
    const yNodes = yNodesMapRef.current;
    const yEdges = yEdgesMapRef.current;
    const yTextMap = yTextMapRef.current;
    const yMetaMap = yMetaMapRef.current;

    if (!doc || !yNodes || !yEdges || !yTextMap || !yMetaMap) {
      return undefined;
    }

    const {
      scheduleSave: scheduleSaveReal,
      forceSave: forceSaveReal,
      syncFromMeta,
      interruptSave: interruptSaveReal,
      interruptSaveForCleanup: interruptSaveForCleanupReal,
    } = createScheduleSave(
      ydocRef,
      serverVectorRef,
      setIsSaving,
      savingRef,
      saveTimerRef,
      persistId,
      setNextSaveTime,
      yMetaMapRef,
      localOriginRef,
      onSaveComplete
    );

    if (allowPersistence) {
      forceSaveRef.current = forceSaveReal;
      scheduleSaveRef.current = scheduleSaveReal;
      interruptSaveRef.current = interruptSaveReal;
      interruptSaveForCleanupRef.current = interruptSaveForCleanupReal;
    } else {
      // No-op persistence handlers for read-only mode
      forceSaveRef.current = async () => Promise.resolve();
      scheduleSaveRef.current = () => {};
      interruptSaveRef.current = () => {};
      interruptSaveForCleanupRef.current = () => {};
    }

    const onDocUpdate = (_update: Uint8Array, origin: unknown) => {
      if (origin === localOriginRef.current) {
        // This is a local change - schedule a save if allowed
        if (allowPersistence) {
          try {
            scheduleSaveRef.current?.();
          } catch {}
        }
        return;
      }
      if (serverVectorRef.current) {
        updateLocalStateVector();
      }
    };
    doc.on("update", onDocUpdate);

    const updateNodesFromY = createUpdateNodesFromY(
      yNodes,
      yTextMapRef,
      lastNodesSignatureRef,
      setNodes,
      localOriginRef,
      isUndoRedoRef,
      isLockedForMe,
      onRemoteNodesAdded
    );

    const updateEdgesFromY = createUpdateEdgesFromY(
      yEdges,
      lastEdgesSignatureRef,
      setEdges,
      localOriginRef,
      isUndoRedoRef
    );

    const updateNodesFromText = createUpdateNodesFromText(
      yTextMapRef,
      localOriginRef,
      setNodes,
      isUndoRedoRef
    );

    const onTextMapChange = createOnTextMapChange(yTextMap, undoManagerRef);

    yNodes.observe(updateNodesFromY);
    yEdges.observe(updateEdgesFromY);
    yTextMap.observeDeep(updateNodesFromText);
    yTextMap.observe(onTextMapChange);

    const onMetaChange = (
      _event: Y.YMapEvent<unknown>,
      transaction: Y.Transaction
    ) => {
      // Ignore changes made by syncFromMeta itself to prevent infinite loops
      if (transaction.origin === "sync-recovery") return;
      try {
        syncFromMeta();
      } catch {}
    };
    try {
      syncFromMeta();
    } catch {}
    yMetaMap.observe(onMetaChange);

    const onMetaMindchange = (event: Y.YMapEvent<unknown>) => {
      try {
        const changedKeys = Array.from(event.keysChanged || []);
        const mcKeys = changedKeys.filter(
          (k) =>
            typeof k === "string" && (k as string).startsWith("mindchange:")
        ) as string[];
        if (mcKeys.length === 0) return;
        const updates: Array<{ edgeId: string; payload: any }> = [];
        for (const key of mcKeys) {
          const payload = (yMetaMap as any).get(key);
          const edgeId = key.slice("mindchange:".length);
          if (edgeId && payload) updates.push({ edgeId, payload });
        }
        if (updates.length === 0) return;
        try { logger.log('[Mindchange:Sync] averages keys changed', mcKeys); } catch {}
        setEdges((prev) => {
          let changed = false;
          const map = new Map(prev.map((e) => [e.id, e]));
          for (const { edgeId, payload } of updates) {
            const e = map.get(edgeId);
            if (!e) continue;
            const prevData = (e as any).data || {};
            const type = String((e as any).type || '');
            const allow = type === 'negation' || type === 'objection';
            if (!allow) {
              if (prevData.mindchange) {
                const cleaned = { ...prevData } as any;
                delete (cleaned as any).mindchange;
                map.set(edgeId, { ...e, data: cleaned } as any);
                changed = true;
              }
              continue;
            }
            const nextData = {
              ...prevData,
              mindchange: {
                forward: {
                  average: Number(payload.forward || 0),
                  count: Number(payload.forwardCount || 0),
                },
                backward: {
                  average: Number(payload.backward || 0),
                  count: Number(payload.backwardCount || 0),
                },
                ...(prevData.mindchange?.userValue
                  ? { userValue: prevData.mindchange.userValue }
                  : {}),
              },
            };
            if (
              JSON.stringify(prevData.mindchange) !==
              JSON.stringify(nextData.mindchange)
            ) {
              map.set(edgeId, { ...e, data: nextData } as any);
              changed = true;
              try { logger.log('[Mindchange:Sync] applied averages', { edgeId, payload }); } catch {}
            }
          }
          return changed ? Array.from(map.values()) : prev;
        });
      } catch {}
    };
    yMetaMap.observe(onMetaMindchange);

    const onMetaMindchangeUser = (event: Y.YMapEvent<unknown>) => {
      try {
        const changedKeys = Array.from(event.keysChanged || []);
        const keys = changedKeys.filter(
          (k) => typeof k === "string" && (k as string).startsWith("mindchange:user:")
        ) as string[];
        if (keys.length === 0) return;
        for (const key of keys) {
          const tail = key.slice("mindchange:user:".length);
          const parts = tail.split(":");
          if (parts.length < 2) continue;
          const uid = parts[0];
          const edgeId = parts.slice(1).join(":");
          const isMine = Boolean(currentUserId && uid === currentUserId);
          const payload = (yMetaMap as any).get(key) || null;
          const f = payload && typeof payload.forward === "number" ? Number(payload.forward) : payload === null ? 0 : undefined;
          const b = payload && typeof payload.backward === "number" ? Number(payload.backward) : payload === null ? 0 : undefined;
          try { logger.log('[Mindchange:Sync] user snapshot changed', { key, isMine, f, b }); } catch {}
          // Always update local edges with userValue when it's mine
          if (isMine) {
            try {
              setEdges((prev) => prev.map((e) => {
                if ((e as any).id !== edgeId) return e;
                const type = String((e as any).type || '');
                const allow = type === 'negation' || type === 'objection';
                if (!allow) return e;
                const prevData = (e as any).data || {};
                const prevMC = prevData.mindchange || {};
                const nextUser = {
                  ...(typeof f === 'number' ? { forward: f } : {}),
                  ...(typeof b === 'number' ? { backward: b } : {}),
                } as any;
                const nextMC = { ...prevMC, userValue: { ...(prevMC.userValue || {}), ...nextUser } };
                return { ...(e as any), data: { ...prevData, mindchange: nextMC } } as any;
              }));
            } catch {}
          }
          // Only push to server during undo/redo flows to avoid loops
          if (!isUndoRedoRef.current) continue;
        if (!isMindchangeEnabledClient()) continue;
          // Import lazily to avoid SSR issues
          try {
            const actions = require("@/actions/experimental/mindchange");
            const setMindchange = actions?.setMindchange as (
              docId: string,
              edgeId: string,
              forward?: number,
              backward?: number,
              edgeType?: 'negation' | 'objection' | 'support',
              clientUserId?: string
            ) => Promise<any>;
            if (typeof setMindchange === "function") {
              // Determine current edge type from Yjs map (fallback to 'support')
              let et: 'negation' | 'objection' | 'support' = 'negation';
              try {
                const e = yEdgesMapRef.current?.get(edgeId as any) as any;
                if (e && (e.type === 'negation' || e.type === 'objection' || e.type === 'support')) et = e.type;
              } catch {}
              setMindchange(persistId, edgeId, f, b, et, currentUserId)
                .then((res: any) => {
                  if (res?.ok) {
                    try {
                      (ydocRef.current as any)?.transact?.(() => {
                        (yMetaMap as any).set(`mindchange:${edgeId}`, res.averages);
                      }, "runtime");
                    } catch {}
                  }
                })
                .catch(() => undefined);
            }
          } catch {}
        }
      } catch {}
    };
    yMetaMap.observe(onMetaMindchangeUser);

    // Seed userValue for current user from meta on setup
    try {
      if (currentUserId) {
        const keys = Array.from(((yMetaMap as unknown as any).keys?.() || []) as Iterable<string>);
        const myUserKeys = (keys as string[]).filter((k) => typeof k === 'string' && k.startsWith(`mindchange:user:${currentUserId}:`));
        if (myUserKeys.length > 0) {
          setEdges((prev) => {
            const map = new Map(prev.map((e) => [e.id, e]));
            let changed = false;
            for (const key of myUserKeys) {
              const payload = (yMetaMap as any).get(key) || null;
              const edgeId = key.slice(`mindchange:user:${currentUserId}:`.length);
              const e = map.get(edgeId);
              if (!e) continue;
              const type = String((e as any).type || '');
              const allow = type === 'negation' || type === 'objection';
              if (!allow) continue;
              const prevData = (e as any).data || {};
              const prevMC = prevData.mindchange || {};
              const nextUser = {
                ...(payload && typeof payload.forward === 'number' ? { forward: Number(payload.forward) } : {}),
                ...(payload && typeof payload.backward === 'number' ? { backward: Number(payload.backward) } : {}),
              } as any;
              const nextMC = { ...prevMC, userValue: { ...(prevMC.userValue || {}), ...nextUser } };
              const nextE = { ...(e as any), data: { ...prevData, mindchange: nextMC } } as any;
              map.set(edgeId, nextE);
              changed = true;
            }
            return changed ? Array.from(map.values()) : prev;
          });
        }
      }
    } catch {}

    // Seed edge mindchange from existing meta entries on first setup
    try {
      const keys = Array.from(
        ((yMetaMap as unknown as any).keys?.() || []) as Iterable<string>
      );
      const mcKeys = (keys as string[]).filter(
        (k) => typeof k === "string" && k.startsWith("mindchange:")
      );
      if (mcKeys.length > 0) {
        const updates: Array<{ edgeId: string; payload: any }> = [];
        for (const key of mcKeys) {
          const payload = (yMetaMap as any).get(key);
          const edgeId = key.slice("mindchange:".length);
          if (edgeId && payload) updates.push({ edgeId, payload });
        }
        if (updates.length > 0) {
          setEdges((prev) => {
            let changed = false;
            const map = new Map(prev.map((e) => [e.id, e]));
            for (const { edgeId, payload } of updates) {
              const e = map.get(edgeId);
              if (!e) continue;
              const type = String((e as any).type || '');
              const allow = type === 'negation' || type === 'objection';
              if (!allow) continue;
              const prevData = (e as any).data || {};
              const nextData = {
                ...prevData,
                mindchange: {
                  forward: {
                    average: Number(payload.forward || 0),
                    count: Number(payload.forwardCount || 0),
                  },
                  backward: {
                    average: Number(payload.backward || 0),
                    count: Number(payload.backwardCount || 0),
                  },
                  ...(prevData.mindchange?.userValue
                    ? { userValue: prevData.mindchange.userValue }
                    : {}),
                },
              };
              if (
                JSON.stringify(prevData.mindchange) !==
                JSON.stringify(nextData.mindchange)
              ) {
                map.set(edgeId, { ...e, data: nextData } as any);
                changed = true;
              }
            }
            return changed ? Array.from(map.values()) : prev;
          });
        }
      }
    } catch {}

    updateNodesFromY({} as Y.YMapEvent<Node>, {} as Y.Transaction);
    updateEdgesFromY({} as Y.YMapEvent<Edge>, {} as Y.Transaction);

    return () => {
      doc.off("update", onDocUpdate);
      yNodes.unobserve(updateNodesFromY);
      yEdges.unobserve(updateEdgesFromY);
      yTextMap.unobserveDeep(updateNodesFromText);
      yTextMap.unobserve(onTextMapChange);
      yMetaMap.unobserve(onMetaChange);
      yMetaMap.unobserve(onMetaMindchange);
      yMetaMap.unobserve(onMetaMindchangeUser);
    };
  }, [
    persistId,
    isUndoRedoRef,
    localOriginRef,
    savingRef,
    saveTimerRef,
    setEdges,
    setIsSaving,
    setNextSaveTime,
    setNodes,
    serverVectorRef,
    undoManagerRef,
    updateLocalStateVector,
    yMetaMapRef,
    yEdgesMapRef,
    yNodesMapRef,
    yTextMapRef,
    ydocRef,
    isLockedForMe,
    onSaveComplete,
    onRemoteNodesAdded,
    currentUserId,
    allowPersistence,
  ]);

  const getForceSave = useCallback(() => forceSaveRef.current, []);
  const getScheduleSave = useCallback(() => scheduleSaveRef.current, []);
  const getInterruptSave = useCallback(() => interruptSaveRef.current, []);
  const getInterruptSaveForCleanup = useCallback(
    () => interruptSaveForCleanupRef.current,
    []
  );

  return {
    setupObservers,
    getForceSave,
    getScheduleSave,
    getInterruptSave,
    getInterruptSaveForCleanup,
  };
};
