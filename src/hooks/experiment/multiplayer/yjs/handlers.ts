import * as Y from "yjs";
import { Edge, Node } from "@xyflow/react";
import { mergeNodesWithText } from "./text";

export const createScheduleSave = (
  ydocRef: React.MutableRefObject<Y.Doc | null>,
  serverVectorRef: React.MutableRefObject<Uint8Array | null>,
  setIsSaving: (v: boolean) => void,
  savingRef: React.MutableRefObject<boolean>,
  saveTimerRef: React.MutableRefObject<number | null>,
  persistId: string,
  setNextSaveTime?: React.Dispatch<React.SetStateAction<number | null>>,
  yMetaMapRef?: React.MutableRefObject<Y.Map<any> | null>,
  localOriginRef?: React.MutableRefObject<any>
) => {
  const performSave = async () => {
    if (!ydocRef.current || savingRef.current) return;
    try {
      savingRef.current = true;
      setIsSaving(true);
      // broadcast saving flag for other peers
      try {
        const m = yMetaMapRef?.current;
        if (m && ydocRef.current) {
          ydocRef.current.transact(() => {
            m.set("saving", true);
          }, localOriginRef?.current);
        }
      } catch {}
      const update = serverVectorRef.current
        ? Y.encodeStateAsUpdate(ydocRef.current, serverVectorRef.current)
        : Y.encodeStateAsUpdate(ydocRef.current);
      if (!update || !update.byteLength) {
        return;
      }
      await fetch(
        `/api/experimental/rationales/${encodeURIComponent(persistId)}/updates`,
        { method: "POST", body: update }
      );
      serverVectorRef.current = Y.encodeStateVector(ydocRef.current);
    } catch {
    } finally {
      savingRef.current = false;
      setIsSaving(false);
      setNextSaveTime?.(null);
      // clear shared schedule and saving flag
      try {
        const m = yMetaMapRef?.current;
        if (m && ydocRef.current) {
          ydocRef.current.transact(() => {
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            m.delete("nextSaveAt");
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            m.delete("saveId");
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            m.delete("saverId");
            m.set("saving", false);
          }, localOriginRef?.current);
        }
      } catch {}
    }
  };

  const claimAndPerformSave = async () => {
    const m = yMetaMapRef?.current;
    if (!m || !ydocRef.current) {
      return performSave();
    }
    const myId = Math.random().toString(36).slice(2);
    try {
      ydocRef.current.transact(() => {
        const isSaving = m.get("saving") === true;
        if (!isSaving) {
          m.set("saving", true);
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          m.delete("nextSaveAt");
          m.set("saverId", myId);
        }
      }, localOriginRef?.current);
    } catch {}
    try {
      const currentSaver = (yMetaMapRef?.current as any)?.get("saverId");
      if (currentSaver !== myId) return;
    } catch {}
    await performSave();
  };

  const scheduleSave = () => {
    // Throttle: only schedule if no timer is pending; do NOT reset on every change
    if (saveTimerRef.current || savingRef.current) return;
    const saveTime = Date.now() + 300000; // 5 minutes from now
    setNextSaveTime?.(saveTime);
    // share the scheduled save time with peers
    try {
      const m = yMetaMapRef?.current;
      if (m && ydocRef.current) {
        ydocRef.current.transact(() => {
          if (!m.has("nextSaveAt")) m.set("nextSaveAt", saveTime);
          if (!m.has("saveId"))
            m.set("saveId", Math.random().toString(36).slice(2));
        }, localOriginRef?.current);
      }
    } catch {}
    saveTimerRef.current = window.setTimeout(async () => {
      saveTimerRef.current = null;
      await claimAndPerformSave();
    }, 300000);
  };

  const forceSave = async () => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    await claimAndPerformSave();
  };

  const syncFromMeta = () => {
    const m = yMetaMapRef?.current;
    if (!m) return;
    try {
      const saving = m.get("saving") === true;
      setIsSaving(Boolean(saving));
      const ts = m.get("nextSaveAt");
      const nextTs = typeof ts === "number" ? ts : null;
      setNextSaveTime?.(nextTs);

      if (saving || !nextTs) {
        if (saveTimerRef.current) {
          window.clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        return;
      }
      const delay = Math.max(0, nextTs - Date.now());
      if (!saveTimerRef.current) {
        saveTimerRef.current = window.setTimeout(async () => {
          saveTimerRef.current = null;
          await claimAndPerformSave();
        }, delay);
      }
    } catch {}
  };

  return { scheduleSave, forceSave, syncFromMeta };
};

export const createUpdateNodesFromY = (
  yNodes: Y.Map<Node>,
  yTextMapRef: React.MutableRefObject<Y.Map<Y.Text> | null>,
  lastNodesSigRef: React.MutableRefObject<string>,
  setNodes: (updater: (nodes: Node[]) => Node[]) => void
) => {
  return () => {
    const arr: Node[] = [];
    for (const [, v] of yNodes as any) arr.push(v as Node);
    const sorted = arr
      .slice()
      .sort((a, b) => (a.id || "").localeCompare(b.id || ""));
    const sig = JSON.stringify(
      sorted.map((n: any) => ({ id: n.id, t: n.type, p: n.position }))
    );
    if (sig === lastNodesSigRef.current) return;
    lastNodesSigRef.current = sig;
    setNodes((prev) =>
      mergeNodesWithText(
        sorted as any,
        yTextMapRef.current as any,
        new Map((prev as any[]).map((p: any) => [p.id, p]))
      )
    );
  };
};

export const createUpdateEdgesFromY = (
  yEdges: Y.Map<Edge>,
  lastEdgesSigRef: React.MutableRefObject<string>,
  setEdges: (updater: (edges: Edge[]) => Edge[]) => void
) => {
  return () => {
    const arr: Edge[] = [];
    for (const [, v] of yEdges as any) arr.push(v as Edge);
    const sorted = arr
      .slice()
      .sort((a, b) => (a.id || "").localeCompare(b.id || ""));
    const sig = JSON.stringify(
      sorted.map((e: any) => ({
        id: e.id,
        s: e.source,
        t: e.target,
        ty: e.type,
        sh: e.sourceHandle,
        th: e.targetHandle,
      }))
    );
    if (sig === lastEdgesSigRef.current) return;
    lastEdgesSigRef.current = sig;
    setEdges(() => sorted);
  };
};

export const createUpdateNodesFromText = (
  yTextMapRef: React.MutableRefObject<Y.Map<Y.Text> | null>,
  localOriginRef: React.MutableRefObject<any>,
  setNodes: (updater: (nodes: Node[]) => Node[]) => void,
  isUndoRedoRef?: React.MutableRefObject<boolean>
) => {
  return (events?: any[]) => {
    if (Array.isArray(events)) {
      const allLocal = events.every(
        (e) => e?.transaction?.origin === localOriginRef.current
      );
      const isUndoRedo = isUndoRedoRef?.current || false;

      if (allLocal && events.length > 0 && !isUndoRedo) {
        return;
      }
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
};

export const createOnTextMapChange = (
  yTextMap: Y.Map<any>,
  undoManager: Y.UndoManager | null
) => {
  return (events: any) => {
    try {
      const changedKeys = Array.from(
        (events.changes?.keys && events.changes.keys.keys()) ||
          events.keys?.keys?.() ||
          []
      );
      for (const k of changedKeys) {
        const t = yTextMap.get(k as any);
        if (t instanceof (Y as any).Text) {
          undoManager?.addToScope(t);
        }
      }
    } catch {}
  };
};
