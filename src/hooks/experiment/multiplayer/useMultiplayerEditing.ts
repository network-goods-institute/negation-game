import { useEffect, useRef, useState } from "react";
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
      user: { id: userId, name: username, color: userColor },
    });
  }, [provider, userId, username, userColor, canWrite]);

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
            const uid = u.id || u.name;
            const prev = result.get(nodeId) || [];
            if (!prev.some((e) => (e as any).id === uid || e.name === u.name)) {
              (prev as any).push({ name: u.name, color: u.color, id: uid });
              result.set(nodeId, prev as any);
            }
          }
        }
        // capture locks with TTL
        const lock = state?.lock;
        const now = Date.now();
        if (u && lock?.nodeId && now - (lock?.ts || 0) < 3000) {
          const uid = u.id || u.name;
          const info: LockInfo = {
            nodeId: lock.nodeId,
            byId: uid,
            name: u.name,
            color: u.color,
            kind: lock.kind === "drag" ? "drag" : "edit",
            ts: lock.ts || 0,
          };
          const existing = lockRes.get(lock.nodeId);
          if (!existing || info.ts > existing.ts)
            lockRes.set(lock.nodeId, info);
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
  }, [provider]);

  const startEditing = (nodeId: string) => {
    if (!provider || !canWrite) return;
    localEditingRef.current.add(nodeId);
    const awareness = provider.awareness;
    const prev = awareness.getLocalState() || {};
    awareness.setLocalState({
      ...prev,
      editing: { nodeId, ts: Date.now() },
      lock: { nodeId, kind: "edit", ts: Date.now() },
    });
  };

  const stopEditing = (nodeId: string) => {
    if (!provider || !canWrite) return;
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    localEditingRef.current.delete(nodeId);
    const awareness = provider.awareness;
    const prev = awareness.getLocalState() || {};
    if (prev?.editing?.nodeId === nodeId) {
      const { editing, lock, ...rest } = prev as any;
      awareness.setLocalState({ ...rest });
    }
  };

  const getEditorsForNode = (nodeId: string): EditorInfo[] => {
    return editors.get(nodeId) || [];
  };

  const lockNode = (nodeId: string, kind: "edit" | "drag") => {
    if (!provider || !canWrite) return;
    const awareness = provider.awareness;
    const prev = awareness.getLocalState() || {};
    awareness.setLocalState({
      ...prev,
      lock: { nodeId, kind, ts: Date.now() },
    });
  };

  const unlockNode = (nodeId: string) => {
    if (!provider || !canWrite) return;
    const awareness = provider.awareness;
    const prev = awareness.getLocalState() || {};
    if (prev?.lock?.nodeId === nodeId) {
      const { lock, ...rest } = prev as any;
      awareness.setLocalState({ ...rest });
    }
  };

  const isLockedForMe = (nodeId: string) => {
    const info = locks.get(nodeId);
    if (!info) return false;
    return info.byId !== userId;
  };

  const getLockOwner = (nodeId: string) => {
    const info = locks.get(nodeId);
    if (!info || info.byId === userId) return null;
    return { name: info.name, color: info.color, kind: info.kind } as const;
  };

  return {
    editors,
    startEditing,
    stopEditing,
    getEditorsForNode,
    lockNode,
    unlockNode,
    isLockedForMe,
    getLockOwner,
  };
};

