import { useCallback, useEffect, useRef, useState } from "react";
import { WebsocketProvider } from "y-websocket";

type YProvider = WebsocketProvider | null;

export type EditorInfo = { name: string; color: string };

export type EditorsMap = Map<string, EditorInfo[]>; // nodeId -> editors
type LockInfo = {
  nodeId: string;
  byId: string;
  name: string;
  color: string;
  kind: "edit" | "drag";
  ts: number;
  sessionId?: string;
};
export type LockMap = Map<string, LockInfo>;

interface UseMultiplayerEditingProps {
  provider: YProvider;
  userId: string;
  username: string;
  userColor: string;
  canWrite?: boolean;
}

export const useMultiplayerEditing = ({
  provider,
  userId,
  username,
  userColor,
  canWrite = true,
}: UseMultiplayerEditingProps) => {
  const [editors, setEditors] = useState<EditorsMap>(new Map());
  const [locks, setLocks] = useState<LockMap>(new Map());
  const localEditingRef = useRef<Set<string>>(new Set());
  const localLockedRef = useRef<Set<string>>(new Set());
  const sessionIdRef = useRef<string>("");
  const lockRenewalTimerRef = useRef<NodeJS.Timeout | null>(null);

  if (!sessionIdRef.current) {
    sessionIdRef.current =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `session-${Math.random().toString(36).slice(2)}`;
  }
  const sessionId = sessionIdRef.current;

  useEffect(() => {
    if (!provider || !username) return;
    const awareness = provider.awareness;
    const prev = awareness.getLocalState() || {};

    if (!canWrite) {
      // In proxy mode, don't set user awareness to hide from others
      return;
    }

    awareness.setLocalState({
      ...prev,
      user: { id: userId, name: username, color: userColor, sessionId },
    });
  }, [provider, userId, username, userColor, canWrite, sessionId]);

  useEffect(() => {
    if (!provider) return;
    const awareness = provider.awareness;

    const rebuild = () => {
      const states = awareness.getStates();
      const result: EditorsMap = new Map();
      const lockRes: LockMap = new Map();
      // Deduplicate by user.id per node
      states.forEach((state: any) => {
        const u = state?.user;
        if (state?.editing && u) {
          const nodeId: string | undefined = state.editing.nodeId;
          if (nodeId) {
            const session = state.editing.sessionId || u.sessionId;
            const uid = session
              ? `${u.id || u.name}:${session}`
              : u.id || u.name;
            const prev = result.get(nodeId) || [];
            if (!prev.some((e) => (e as any).id === uid || e.name === u.name)) {
              (prev as any).push({ name: u.name, color: u.color, id: uid });
              result.set(nodeId, prev as any);
            }
          }
        }
        // capture locks with TTL (multi-lock aware; legacy compatibility)
        const now = Date.now();
        const legacy = state?.lock;
        const multiLocks =
          state?.locks && typeof state.locks === "object"
            ? state.locks
            : undefined;
        if (u && multiLocks) {
          Object.entries(multiLocks as Record<string, any>).forEach(
            ([nodeId, lk]) => {
              if (!lk || !nodeId) return;
              if (now - (lk.ts || 0) >= 9000) return;
              const session = lk.sessionId || u.sessionId;
              const uid = session
                ? `${u.id || u.name}:${session}`
                : u.id || u.name;
              const info: LockInfo = {
                nodeId,
                byId: uid,
                name: u.name,
                color: u.color,
                kind: lk.kind === "drag" ? "drag" : "edit",
                ts: lk.ts || 0,
                sessionId: session,
              };
              const existing = lockRes.get(nodeId);
              if (!existing) {
                lockRes.set(nodeId, info);
              } else {
                const existingIsLocal = existing.sessionId === sessionId;
                const incomingIsLocal = info.sessionId === sessionId;
                if (existingIsLocal && !incomingIsLocal) {
                  lockRes.set(nodeId, info);
                } else if (!existingIsLocal && incomingIsLocal) {
                  // keep existing remote lock over local
                } else if (info.ts > existing.ts) {
                  lockRes.set(nodeId, info);
                }
              }
            }
          );
        } else if (u && legacy?.nodeId && now - (legacy?.ts || 0) < 9000) {
          const session = legacy.sessionId || u.sessionId;
          const uid = session ? `${u.id || u.name}:${session}` : u.id || u.name;
          const info: LockInfo = {
            nodeId: legacy.nodeId,
            byId: uid,
            name: u.name,
            color: u.color,
            kind: legacy.kind === "drag" ? "drag" : "edit",
            ts: legacy.ts || 0,
            sessionId: session,
          };
          const existing = lockRes.get(legacy.nodeId);
          if (!existing) {
            lockRes.set(legacy.nodeId, info);
          } else {
            const existingIsLocal = existing.sessionId === sessionId;
            const incomingIsLocal = info.sessionId === sessionId;
            if (existingIsLocal && !incomingIsLocal) {
              lockRes.set(legacy.nodeId, info);
            } else if (!existingIsLocal && incomingIsLocal) {
              // keep existing remote lock over local
            } else if (info.ts > existing.ts) {
              lockRes.set(legacy.nodeId, info);
            }
          }
        }
      });
      // strip hidden ids
      const cleaned: EditorsMap = new Map();
      result.forEach((arr, nodeId) => {
        cleaned.set(
          nodeId,
          arr.map((e: any) => ({ name: e.name, color: e.color }))
        );
      });
      setEditors(cleaned);
      setLocks(lockRes);
    };

    rebuild();
    awareness.on("change", rebuild);
    awareness.on?.("update", rebuild);
    return () => {
      awareness.off("change", rebuild);
      awareness.off?.("update", rebuild);
    };
  }, [provider, sessionId]);

  const renewLocks = useCallback(() => {
    if (!provider || !canWrite) return;
    const awareness = provider.awareness;
    const prev = awareness.getLocalState() || {};
    const now = Date.now();
    const prevLocks = (prev as any).locks || {};
    const nextLocks: Record<string, any> = { ...prevLocks };
    localLockedRef.current.forEach((nodeId) => {
      const current = nextLocks[nodeId] || { kind: "drag", sessionId };
      nextLocks[nodeId] = { ...current, ts: now };
    });
    awareness.setLocalState({
      ...prev,
      locks: nextLocks,
    });
  }, [provider, canWrite, sessionId]);

  const startEditing = (nodeId: string) => {
    if (!provider || !canWrite) return;
    localEditingRef.current.add(nodeId);
    const awareness = provider.awareness;
    const prev = awareness.getLocalState() || {};
    const now = Date.now();
    const prevLocks = (prev as any).locks || {};
    const nextLocks = {
      ...prevLocks,
      [nodeId]: { kind: "edit", ts: now, sessionId },
    };
    localLockedRef.current.add(nodeId);
    awareness.setLocalState({
      ...prev,
      editing: { nodeId, ts: now, sessionId },
      locks: nextLocks,
    });

    if (lockRenewalTimerRef.current) {
      clearInterval(lockRenewalTimerRef.current);
    }
    lockRenewalTimerRef.current = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (localEditingRef.current.size > 0 || localLockedRef.current.size > 0) {
        renewLocks();
      }
    }, 3000);
  };

  const stopEditing = (nodeId: string) => {
    if (!provider || !canWrite) return;
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    localEditingRef.current.delete(nodeId);

    if (
      localEditingRef.current.size === 0 &&
      localLockedRef.current.size === 0 &&
      lockRenewalTimerRef.current
    ) {
      clearInterval(lockRenewalTimerRef.current);
      lockRenewalTimerRef.current = null;
    }

    const awareness = provider.awareness;
    const prev = awareness.getLocalState() || {};
    const prevLocks = (prev as any).locks || {};
    const nextLocks = { ...prevLocks };
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    delete nextLocks[nodeId];
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    localLockedRef.current.delete(nodeId);
    const { editing, lock, ...rest } = prev as any;
    const nextState: any = { ...rest, locks: nextLocks };
    if (editing?.nodeId === nodeId) {
      // remove editing marker when stopping this node
      // leave locks for other nodes intact
    } else if (editing) {
      nextState.editing = editing;
    }
    awareness.setLocalState(nextState);
  };

  const getEditorsForNode = (nodeId: string): EditorInfo[] => {
    return editors.get(nodeId) || [];
  };

  const lockNode = (nodeId: string, kind: "edit" | "drag") => {
    if (!provider || !canWrite) return;
    const awareness = provider.awareness;
    const prev = awareness.getLocalState() || {};
    const prevLocks = (prev as any).locks || {};
    const nextLocks = {
      ...prevLocks,
      [nodeId]: { kind, ts: Date.now(), sessionId },
    };
    localLockedRef.current.add(nodeId);
    awareness.setLocalState({
      ...prev,
      locks: nextLocks,
    });
  };

  const unlockNode = (nodeId: string) => {
    if (!provider || !canWrite) return;
    const awareness = provider.awareness;
    const prev = awareness.getLocalState() || {};
    const prevLocks = (prev as any).locks || {};
    const nextLocks = { ...prevLocks };
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    delete nextLocks[nodeId];
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    localLockedRef.current.delete(nodeId);
    awareness.setLocalState({ ...prev, locks: nextLocks });
  };

  const isLockedForMe = (nodeId: string) => {
    const info = locks.get(nodeId);
    if (!info) return false;
    if (info.sessionId) {
      return info.sessionId !== sessionId;
    }
    return info.byId !== userId;
  };

  const getLockOwner = (nodeId: string) => {
    const info = locks.get(nodeId);
    if (!info) return null;
    if (info.sessionId && info.sessionId === sessionId) return null;
    if (!info.sessionId && info.byId === userId) return null;
    return { name: info.name, color: info.color, kind: info.kind } as const;
  };

  useEffect(() => {
    return () => {
      if (lockRenewalTimerRef.current) {
        clearInterval(lockRenewalTimerRef.current);
      }
    };
  }, []);

  return {
    editors,
    startEditing,
    stopEditing,
    getEditorsForNode,
    lockNode,
    unlockNode,
    isLockedForMe,
    getLockOwner,
    locks, // Expose locks map so we can listen to changes
  };
};
