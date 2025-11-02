import { useCallback, useEffect, useRef, useState } from "react";
import { WebsocketProvider } from "y-websocket";
import { useTabIdentifier } from "./useTabIdentifier";
import { LOCK_TTL_MS, LOCK_RENEWAL_INTERVAL, ACTIVITY_CLEANUP_THRESHOLD, RECENT_ACTIVITY_THRESHOLD, resolveLockConflict, type LockInfo } from "./lockUtils";

type YProvider = WebsocketProvider | null;

export type EditorInfo = { name: string; color: string };
export type EditorsMap = Map<string, EditorInfo[]>; // nodeId -> editors
export type LockMap = Map<string, LockInfo>;

interface UseMultiplayerEditingProps {
  provider: YProvider;
  userId: string;
  username: string;
  userColor: string;
  canWrite?: boolean;
  broadcastLocks?: boolean;
}

export const useMultiplayerEditing = ({
  provider,
  userId,
  username,
  userColor,
  canWrite = true,
  broadcastLocks = true,
}: UseMultiplayerEditingProps) => {
  const [editors, setEditors] = useState<EditorsMap>(new Map());
  const [locks, setLocks] = useState<LockMap>(new Map());
  const localEditingRef = useRef<Set<string>>(new Set());
  const localLockedRef = useRef<Set<string>>(new Set());
  const activeNodeUsageRef = useRef<Map<string, number>>(new Map()); // Track last activity per node
  const lockRenewalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { sessionId, tabId } = useTabIdentifier();

  // Mark a node as actively used (for lock renewal purposes)
  const markNodeActive = useCallback((nodeId: string) => {
    activeNodeUsageRef.current.set(nodeId, Date.now());
  }, []);

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
      user: { id: userId, name: username, color: userColor, sessionId, tabId },
    });
  }, [provider, userId, username, userColor, canWrite, sessionId, tabId]);

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
              if (now - (lk.ts || 0) >= LOCK_TTL_MS) return;
              const session = lk.sessionId || u.sessionId;
              const lockTabId = lk.tabId || u.tabId;
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
                tabId: lockTabId,
              };
              const existing = lockRes.get(nodeId);
              if (!existing) {
                lockRes.set(nodeId, info);
              } else {
                const resolution = resolveLockConflict(existing, info, tabId, sessionId);
                if (resolution.shouldReplace) {
                  lockRes.set(nodeId, resolution.lockInfo);
                } else {
                  // Keep existing lock
                  lockRes.set(nodeId, existing);
                }
              }
            }
          );
        } else if (u && legacy?.nodeId && now - (legacy?.ts || 0) < LOCK_TTL_MS) {
          const session = legacy.sessionId || u.sessionId;
          const lockTabId = legacy.tabId || u.tabId;
          const uid = session ? `${u.id || u.name}:${session}` : u.id || u.name;
          const info: LockInfo = {
            nodeId: legacy.nodeId,
            byId: uid,
            name: u.name,
            color: u.color,
            kind: legacy.kind === "drag" ? "drag" : "edit",
            ts: legacy.ts || 0,
            sessionId: session,
            tabId: lockTabId,
          };
          const existing = lockRes.get(legacy.nodeId);
          if (!existing) {
            lockRes.set(legacy.nodeId, info);
          } else {
            const resolution = resolveLockConflict(existing, info, tabId, sessionId);
            if (resolution.shouldReplace) {
              lockRes.set(legacy.nodeId, resolution.lockInfo);
            } else {
              // Keep existing lock
              lockRes.set(legacy.nodeId, existing);
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
  }, [provider, sessionId, tabId]);

  const renewLocks = useCallback(() => {
    if (!provider || !canWrite || !broadcastLocks) return;
    const awareness = provider.awareness;
    const prev = awareness.getLocalState() || {};
    const now = Date.now();
    const prevLocks = (prev as any).locks || {};
    const nextLocks: Record<string, any> = { ...prevLocks };

    // Only renew locks for nodes that have been used recently
    const nodesToRenew: string[] = [];

    localLockedRef.current.forEach((nodeId) => {
      const lastUsed = activeNodeUsageRef.current.get(nodeId);
      if (lastUsed && now - lastUsed < RECENT_ACTIVITY_THRESHOLD) {
        nodesToRenew.push(nodeId);
      }
    });

    // Renew only recently used locks
    nodesToRenew.forEach((nodeId) => {
      const current = nextLocks[nodeId] || { kind: "drag", sessionId, tabId };
      nextLocks[nodeId] = { ...current, ts: now };
    });

    // Remove locks for nodes that haven't been used recently
    localLockedRef.current.forEach((nodeId) => {
      const lastUsed = activeNodeUsageRef.current.get(nodeId);
      if (!lastUsed || now - lastUsed >= RECENT_ACTIVITY_THRESHOLD) {
        delete nextLocks[nodeId];
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        localLockedRef.current.delete(nodeId);
      }
    });

    awareness.setLocalState({
      ...prev,
      locks: nextLocks,
    });
  }, [provider, canWrite, sessionId, tabId, broadcastLocks]);

  const startEditing = (nodeId: string) => {
    if (!provider || !canWrite) return;
    localEditingRef.current.add(nodeId);
    if (!broadcastLocks) return;
    const awareness = provider.awareness;
    const prev = awareness.getLocalState() || {};
    const now = Date.now();
    const prevLocks = (prev as any).locks || {};
    const nextLocks = {
      ...prevLocks,
      [nodeId]: { kind: "edit", ts: now, sessionId, tabId },
    };
    localLockedRef.current.add(nodeId);
    markNodeActive(nodeId); // Mark node as actively used
    awareness.setLocalState({
      ...prev,
      editing: { nodeId, ts: now, sessionId, tabId },
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
      // Clean up stale activity tracking for nodes that are no longer locked
      const now = Date.now();
      activeNodeUsageRef.current.forEach((lastUsed, nodeId) => {
        if (!localLockedRef.current.has(nodeId) && now - lastUsed > ACTIVITY_CLEANUP_THRESHOLD) {
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          activeNodeUsageRef.current.delete(nodeId);
        }
      });
    }, LOCK_RENEWAL_INTERVAL);
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

    if (!broadcastLocks) return;
    const awareness = provider.awareness;
    const prev = awareness.getLocalState() || {};
    const prevLocks = (prev as any).locks || {};
    const nextLocks = { ...prevLocks };
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    delete nextLocks[nodeId];
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    localLockedRef.current.delete(nodeId);
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    activeNodeUsageRef.current.delete(nodeId); // Clean up activity tracking
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
    if (!provider || !canWrite || !broadcastLocks) return;

    // Check if node is already locked by someone else (not our tabs) in the current awareness state
    const allStates = Array.from(provider.awareness.getStates().values());
    for (const state of allStates) {
      const locks = (state as any).locks || {};
      const stateUser = (state as any).user;
      if (locks[nodeId]) {
        const lockTabId = locks[nodeId].tabId || stateUser?.tabId;
        const lockSessionId = locks[nodeId].sessionId || stateUser?.sessionId;

        // Allow if it's from our own session (different tab of same user)
        if (lockSessionId !== sessionId) {
          // Node is locked by a different user, don't create another lock
          return;
        }
      }
    }

    const awareness = provider.awareness;
    const prev = awareness.getLocalState() || {};
    const prevLocks = (prev as any).locks || {};
    const nextLocks = {
      ...prevLocks,
      [nodeId]: { kind, ts: Date.now(), sessionId, tabId },
    };
    localLockedRef.current.add(nodeId);
    markNodeActive(nodeId); // Mark node as actively used
    awareness.setLocalState({
      ...prev,
      locks: nextLocks,
    });
  };

  const unlockNode = (nodeId: string) => {
    if (!provider || !canWrite || !broadcastLocks) return;
    const awareness = provider.awareness;
    const prev = awareness.getLocalState() || {};
    const prevLocks = (prev as any).locks || {};
    const nextLocks = { ...prevLocks };
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    delete nextLocks[nodeId];
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    localLockedRef.current.delete(nodeId);
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    activeNodeUsageRef.current.delete(nodeId); // Clean up activity tracking
    awareness.setLocalState({ ...prev, locks: nextLocks });
  };

  const isLockedForMe = (nodeId: string) => {
    const info = locks.get(nodeId);
    if (!info) return false;

    // Not locked if it's our own tab
    if (info.tabId === tabId) return false;

    // Not locked if it's from our own session (another tab of same user)
    if (info.sessionId === sessionId) return false;

    // Locked if it's from a different user
    if (info.sessionId) {
      return info.sessionId !== sessionId;
    }
    return info.byId !== userId;
  };

  const getLockOwner = (nodeId: string) => {
    const info = locks.get(nodeId);
    if (!info) return null;

    // Not locked if it's our own tab
    if (info.tabId === tabId) return null;

    // Not locked if it's from our own session (another tab of same user)
    if (info.sessionId === sessionId) return null;

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
    markNodeActive,
    locks, // Expose locks map so we can listen to changes
  };
};
