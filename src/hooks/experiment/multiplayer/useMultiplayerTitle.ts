import { useState, useEffect, useCallback } from "react";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

interface UseMultiplayerTitleProps {
  routeParams: { id: string } | null;
  yMetaMap: Y.Map<any> | null;
  ydoc: Y.Doc | null;
  provider: WebsocketProvider | null;
  localOrigin: object;
}

/**
 * Manages title state for multiplayer boards including:
 * - Loading title from database
 * - Syncing title changes via Yjs
 * - Tracking which users are editing the title (awareness)
 *
 * @param routeParams - Route parameters containing the board ID
 * @param yMetaMap - Yjs map for storing metadata like title
 * @param ydoc - Yjs document instance
 * @param provider - WebSocket provider for real-time sync
 * @param localOrigin - Local origin object for Yjs transactions
 * @returns Title state and control functions
 */
export const useMultiplayerTitle = ({
  routeParams,
  yMetaMap,
  ydoc,
  provider,
  localOrigin,
}: UseMultiplayerTitleProps) => {
  const [dbTitle, setDbTitle] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [titleEditingUser, setTitleEditingUser] = useState<{
    name: string;
    color: string;
  } | null>(null);

  const loadDbTitle = useCallback(async () => {
    if (!routeParams?.id) return;
    try {
      const rid =
        typeof routeParams.id === "string"
          ? routeParams.id
          : String(routeParams.id);
      const res = await fetch(
        `/api/experimental/rationales/${encodeURIComponent(rid)}`
      );
      if (res.ok) {
        const data = await res.json();
        setDbTitle(data.title || null);
        setOwnerId(data.ownerId || null);
      }
    } catch (e) {
      console.error("[title] Failed to load DB title:", e);
    }
  }, [routeParams?.id]);

  useEffect(() => {
    loadDbTitle();
  }, [loadDbTitle]);

  const loadDbTitleWithSync = useCallback(async () => {
    if (!routeParams?.id) return;
    try {
      const rid =
        typeof routeParams.id === "string"
          ? routeParams.id
          : String(routeParams.id);
      const res = await fetch(
        `/api/experimental/rationales/${encodeURIComponent(rid)}`
      );
      if (res.ok) {
        const data = await res.json();
        const normalizedTitle = data.title || null;
        setDbTitle(normalizedTitle);
        setOwnerId(data.ownerId || null);
        try {
          if (ydoc && yMetaMap && typeof normalizedTitle === "string") {
            const current = yMetaMap.get("title") as string | undefined;
            if (current !== normalizedTitle) {
              ydoc.transact(() => {
                yMetaMap.set("title", normalizedTitle);
              }, localOrigin);
            }
          }
        } catch {}
      }
    } catch (e) {
      console.error("[title] Failed to load DB title:", e);
    }
  }, [routeParams?.id]);

  useEffect(() => {
    if (yMetaMap && ydoc) {
      loadDbTitleWithSync();
    }
  }, [yMetaMap, ydoc, loadDbTitleWithSync]);

  // Title editing awareness
  useEffect(() => {
    if (!provider?.awareness) return;

    const awareness = provider.awareness;

    const handleAwarenessChange = () => {
      const states = Array.from(awareness.getStates().entries());
      const titleEditor = states.find(
        ([clientId, state]: [number, any]) =>
          clientId !== awareness.clientID &&
          (state.editingTitle || state.countdownTitle || state.savingTitle)
      );

      if (titleEditor) {
        const [, state] = titleEditor;
        setTitleEditingUser({
          name: state.user?.name || "Someone",
          color: state.user?.color || "#666",
        });
      } else {
        setTitleEditingUser(null);
      }
    };

    awareness.on("change", handleAwarenessChange);
    return () => {
      awareness.off("change", handleAwarenessChange);
    };
  }, [provider?.awareness]);

  const handleTitleEditingStart = useCallback(() => {
    if (provider?.awareness) {
      provider.awareness.setLocalStateField("editingTitle", true);
    }
  }, [provider?.awareness]);

  const handleTitleEditingStop = useCallback(() => {
    if (provider?.awareness) {
      provider.awareness.setLocalStateField("editingTitle", false);
    }
  }, [provider?.awareness]);

  const handleTitleSavingStart = useCallback(() => {
    if (provider?.awareness) {
      provider.awareness.setLocalStateField("savingTitle", true);
    }
  }, [provider?.awareness]);

  const handleTitleSavingStop = useCallback(() => {
    if (provider?.awareness) {
      provider.awareness.setLocalStateField("savingTitle", false);
    }
  }, [provider?.awareness]);

  const handleTitleCountdownStart = useCallback(() => {
    if (provider?.awareness) {
      provider.awareness.setLocalStateField("countdownTitle", true);
    }
  }, [provider?.awareness]);

  const handleTitleCountdownStop = useCallback(() => {
    if (provider?.awareness) {
      provider.awareness.setLocalStateField("countdownTitle", false);
    }
  }, [provider?.awareness]);

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setDbTitle(newTitle);
      try {
        if (ydoc && yMetaMap && typeof newTitle === "string") {
          const current = yMetaMap.get("title") as string | undefined;
          if (current !== newTitle) {
            ydoc.transact(() => {
              yMetaMap.set("title", newTitle);
            }, localOrigin);
          }
        }
      } catch {}
    },
    [ydoc, yMetaMap, localOrigin]
  );

  useEffect(() => {
    if (!yMetaMap) return;
    const handleMetaChange = () => {
      try {
        const t = yMetaMap.get("title") as string | null;
        if (typeof t === "string") {
          setDbTitle((prev) => (prev !== t ? t : prev));
        }
      } catch {}
    };
    try {
      yMetaMap.observe(handleMetaChange as any);
    } catch {}
    return () => {
      try {
        yMetaMap.unobserve(handleMetaChange as any);
      } catch {}
    };
  }, [yMetaMap]);

  return {
    dbTitle,
    ownerId,
    titleEditingUser,
    loadDbTitle,
    handleTitleChange,
    handleTitleEditingStart,
    handleTitleEditingStop,
    handleTitleSavingStart,
    handleTitleSavingStop,
    handleTitleCountdownStart,
    handleTitleCountdownStop,
  };
};
