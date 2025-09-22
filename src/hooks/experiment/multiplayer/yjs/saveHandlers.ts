import {
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import * as Y from "yjs";

/**
 * Creates a distributed save coordination system for Yjs documents.
 * Handles throttling, conflict resolution, and error recovery across multiple clients.
 *
 * Key features:
 * - 5-minute throttling to batch changes
 * - Distributed coordination via Yjs metadata
 * - Recovery from stuck saving states
 * - Conflict prevention between clients
 */
export const createScheduleSave = (
  ydocRef: MutableRefObject<Y.Doc | null>,
  serverVectorRef: MutableRefObject<Uint8Array | null>,
  setIsSaving: (v: boolean) => void,
  savingRef: MutableRefObject<boolean>,
  saveTimerRef: MutableRefObject<number | null>,
  persistId: string,
  setNextSaveTime?: Dispatch<SetStateAction<number | null>>,
  yMetaMapRef?: MutableRefObject<Y.Map<unknown> | null>,
  localOriginRef?: MutableRefObject<unknown>
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
              body: new Blob([update as unknown as BlobPart]),
              signal: controller.signal,
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
      const currentSaver = yMetaMapRef?.current?.get("saverId");
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
      if (saving && typeof since === "number" && Date.now() - since > 120000) {
        // Recover from a stuck saving flag (e.g., saver disconnected)
        try {
          if (ydocRef.current) {
            // Use a special origin to prevent observer re-triggering
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
            }, "sync-recovery");
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
        }, "sync-recovery");
      }
    } catch (e) {
      console.error("[save] Error interrupting save:", e);
    }
  };

  // Cleanup-safe version that doesn't call state setters or Yjs transactions
  const interruptSaveForCleanup = () => {
    try {
      // Clear local state (ref only, no setState calls)
      savingRef.current = false;

      // Clear any timers
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      // DON'T clear meta state during cleanup to avoid triggering Yjs observers
      // The component is unmounting anyway, so these will be cleaned up naturally
    } catch (e) {
      console.error("[save] Error interrupting save during cleanup:", e);
    }
  };

  return {
    scheduleSave,
    forceSave,
    syncFromMeta,
    interruptSave,
    interruptSaveForCleanup,
  };
};
