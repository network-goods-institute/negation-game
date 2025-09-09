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
            m.set("savingSince", Date.now());
          }, localOriginRef?.current);
        }
      } catch {}
      const update = serverVectorRef.current
        ? Y.encodeStateAsUpdate(ydocRef.current, serverVectorRef.current)
        : Y.encodeStateAsUpdate(ydocRef.current);
      if (!update || !update.byteLength) {
        console.log("[save] No changes to save");
      } else {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        
        try {
          const res = await fetch(
            `/api/experimental/rationales/${encodeURIComponent(persistId)}/updates`,
            { 
              method: "POST", 
              body: update,
              signal: controller.signal
            }
          );
        } finally {
          clearTimeout(timeoutId);
        }
      }
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
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            m.delete("savingSince");
          }, "cleanup-save");
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
      const since = m.get("savingSince");
      if (saving && typeof since === 'number' && Date.now() - since > 120000) {
        // Recover from a stuck saving flag (e.g., saver disconnected)
        try {
          if (ydocRef.current) {
            ydocRef.current.transact(() => {
              m.set("saving", false);
              // eslint-disable-next-line drizzle/enforce-delete-with-where
              m.delete("nextSaveAt");
              // eslint-disable-next-line drizzle/enforce-delete-with-where
              m.delete("saveId");
              // eslint-disable-next-line drizzle/enforce-delete-with-where
              m.delete("saverId");
              // eslint-disable-next-line drizzle/enforce-delete-with-where
              m.delete("savingSince");
            }, localOriginRef?.current);
          }
        } catch {}
      }
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

  const interruptSave = () => {
    try {
      // Clear local state
      savingRef.current = false;
      setIsSaving(false);
      setNextSaveTime?.(null);
      
      // Clear any timers
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      
      // Clear meta state
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
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          m.delete("savingSince");
        }, "interrupt-save");
      }
    } catch (e) {
      console.error("[save] Error interrupting save:", e);
    }
  };

  return { scheduleSave, forceSave, syncFromMeta, interruptSave };
};

export const createUpdateNodesFromY = (
  yNodes: Y.Map<Node>,
  yTextMapRef: React.MutableRefObject<Y.Map<Y.Text> | null>,
  lastNodesSigRef: React.MutableRefObject<string>,
  setNodes: (updater: (nodes: Node[]) => Node[]) => void,
  localOriginRef?: React.MutableRefObject<any>
) => {
  const lastIds = new Set<string>();
  return (_evt?: any, txn?: any) => {
    try {
      if (txn && localOriginRef && txn.origin === localOriginRef.current) {
        // Ignore local-origin Yjs node map updates; local state already applied
        // This prevents double-application of local changes
        return;
      }
    } catch {}
    try {} catch {}
    const arr: Node[] = [];
    const toMigrate: Node[] = [];
    for (const [, raw] of yNodes as any) {
      const n = raw as Node;
      // Live migration: convert legacy question nodes to statement
      if ((n as any).type === "question") {
        const migrated = { ...n, type: "statement" } as Node;
        toMigrate.push(migrated);
        arr.push(migrated);
      } else {
        arr.push(n);
      }
    }
    if (toMigrate.length > 0) {
      try {
        const doc: Y.Doc | undefined = (yNodes as any).doc;
        if (doc) {
          doc.transact(() => {
            for (const mig of toMigrate) (yNodes as any).set(mig.id, mig);
          }, localOriginRef?.current ?? "migration:nodes");
        } else {
          for (const mig of toMigrate) (yNodes as any).set(mig.id, mig);
        }
      } catch {}
    }
    const visibleArr = arr;
    try {
      const currIds = new Set(visibleArr.map((n: any) => n.id));
      const added: string[] = [];
      const removed: string[] = [];
      currIds.forEach((id) => { if (!lastIds.has(id)) added.push(id); });
      lastIds.forEach((id) => { if (!currIds.has(id)) removed.push(id); });
      if (added.length || removed.length) {}
      // Update lastIds snapshot
      (function syncIds(){ lastIds.clear(); currIds.forEach((id) => lastIds.add(id)); })();
    } catch {}

    const sorted = visibleArr
      .slice()
      .sort((a, b) => (a.id || "").localeCompare(b.id || ""));
    // Include non-textual data in signature so data changes (e.g., hidden)
    // trigger updates across peers. We intentionally exclude content/statement
    // because those are synced via Y.Text.
    const sig = JSON.stringify(
      sorted.map((n: any) => {
        const data = (n && n.data) || {};
        const { content, statement, ...rest } = data as any;
        const w = (n as any).width ?? (n as any).style?.width ?? null;
        const h = (n as any).height ?? (n as any).style?.height ?? null;
        return { id: n.id, t: n.type, p: n.position, w, h, d: rest } as any;
      })
    );
    if (sig === lastNodesSigRef.current) {
      console.log("UPDATE NODES FROM Y - No signature change, skipping setNodes");
      return;
    }
    console.log("UPDATE NODES FROM Y - Signature changed, updating nodes");
    lastNodesSigRef.current = sig;
    setNodes((prev) =>
      mergeNodesWithText(
        sorted as any,
        yTextMapRef.current as any,
        new Map((prev as any[]).map((p: any) => [p.id, p]))
      )
    );
    try {} catch {}
  };
};

export const createUpdateEdgesFromY = (
  yEdges: Y.Map<Edge>,
  lastEdgesSigRef: React.MutableRefObject<string>,
  setEdges: (updater: (edges: Edge[]) => Edge[]) => void,
  localOriginRef?: React.MutableRefObject<any>
) => {
  return () => {
    try {} catch {}
    const arr: Edge[] = [];
    const toMigrate: Edge[] = [];
    for (const [, raw] of yEdges as any) {
      const e = raw as Edge;
      // Live migration: convert legacy question edges to option
      if ((e as any).type === "question") {
        const migrated = { ...e, type: "option" } as Edge;
        toMigrate.push(migrated);
        arr.push(migrated);
      } else {
        arr.push(e);
      }
    }
    if (toMigrate.length > 0) {
      try {
        const doc: Y.Doc | undefined = (yEdges as any).doc;
        if (doc) {
          doc.transact(() => {
            for (const mig of toMigrate) (yEdges as any).set(mig.id, mig);
          }, localOriginRef?.current ?? "migration:edges");
        } else {
          for (const mig of toMigrate) (yEdges as any).set(mig.id, mig);
        }
      } catch {}
    }
    // Hide edges marked as removed due to dismissed group
    const visibleEdges = arr;
    const sorted = visibleEdges
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
        d: e.data || {},
      }))
    );
    if (sig === lastEdgesSigRef.current) return;
    lastEdgesSigRef.current = sig;
    setEdges(() => sorted);
    try {} catch {}
  };
};

export const createUpdateNodesFromText = (
  yTextMapRef: React.MutableRefObject<Y.Map<Y.Text> | null>,
  localOriginRef: React.MutableRefObject<any>,
  setNodes: (updater: (nodes: Node[]) => Node[]) => void,
  isUndoRedoRef?: React.MutableRefObject<boolean>
) => {
  return (events?: any[]) => {
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
