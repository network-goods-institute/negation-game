import { useCallback } from "react";
import * as Y from "yjs";
import { Edge, Node } from "@xyflow/react";

interface UseYjsDocumentHydrationProps {
  persistId: string;
  ydocRef: React.MutableRefObject<Y.Doc | null>;
  yNodesMapRef: React.MutableRefObject<Y.Map<Node> | null>;
  yEdgesMapRef: React.MutableRefObject<Y.Map<Edge> | null>;
  serverVectorRef: React.MutableRefObject<Uint8Array | null>;
  shouldSeedOnConnectRef: React.MutableRefObject<boolean>;
  setConnectionError: (error: string | null) => void;
  setConnectionState: (
    state: "initializing" | "connecting" | "connected" | "failed"
  ) => void;
}

const LOCAL_STORAGE_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

const encodeStateVector = (sv: Uint8Array) =>
  typeof Buffer !== "undefined"
    ? Buffer.from(sv).toString("base64")
    : btoa(String.fromCharCode(...Array.from(sv)));

const decodeBase64 = (value: string) =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

export const useYjsDocumentHydration = ({
  persistId,
  ydocRef,
  yNodesMapRef,
  yEdgesMapRef,
  serverVectorRef,
  shouldSeedOnConnectRef,
  setConnectionError,
  setConnectionState,
}: UseYjsDocumentHydrationProps) => {
  const updateLocalStateVector = useCallback(() => {
    try {
      if (typeof window === "undefined" || !serverVectorRef.current) return;
      const encoded = encodeStateVector(serverVectorRef.current);
      window.localStorage.setItem(`yjs:sv:${persistId}`, encoded);
      window.localStorage.setItem(`yjs:sv:${persistId}:ts`, String(Date.now()));
    } catch {}
  }, [persistId, serverVectorRef]);

  const loadDiffFromServer = useCallback(
    async (doc: Y.Doc, url: string): Promise<boolean> => {
      try {
        const res = await fetch(url);
        if (res.status === 204) {
          const hasContent =
            doc.getMap<Node>("nodes").size > 0 ||
            doc.getMap<Edge>("edges").size > 0;
          return hasContent;
        }
        if (
          res.ok &&
          (res.headers.get("content-type") || "").includes(
            "application/octet-stream"
          )
        ) {
          const buf = new Uint8Array(await res.arrayBuffer());
          if (buf.byteLength > 0) {
            Y.applyUpdate(doc, buf);
            return true;
          }
        }
      } catch (err) {
        console.error("[loadDiffFromServer] Error:", err);
      }
      return false;
    },
    []
  );

  const hydrateFromServer = useCallback(async () => {
    const doc = ydocRef.current;
    const yNodes = yNodesMapRef.current;
    const yEdges = yEdgesMapRef.current;
    if (!doc || !yNodes || !yEdges) {
      return;
    }

    const isBrowser = typeof window !== "undefined";
    let hadContent = yNodes.size > 0 || yEdges.size > 0;

    try {
      if (isBrowser && !hadContent) {
        const cachedSv = window.localStorage.getItem(`yjs:sv:${persistId}`);
        const cachedTs = window.localStorage.getItem(`yjs:sv:${persistId}:ts`);
        const ts = cachedTs ? Number(cachedTs) : 0;
        const fresh = Boolean(
          cachedSv && ts && Date.now() - ts < LOCAL_STORAGE_TTL_MS
        );

        if (cachedSv && fresh) {
          hadContent = await loadDiffFromServer(
            doc,
            `/api/experimental/rationales/${encodeURIComponent(persistId)}/state?sv=${encodeURIComponent(cachedSv)}`
          );
        } else if (cachedSv && !fresh) {
          try {
            window.localStorage.removeItem(`yjs:sv:${persistId}`);
            window.localStorage.removeItem(`yjs:sv:${persistId}:ts`);
          } catch {}
        }
      }

      if (!hadContent) {
        let res = await fetch(
          `/api/experimental/rationales/${encodeURIComponent(persistId)}/state`
        );

        if (res.status === 401) {
          setConnectionError("You need to be logged in to load this document");
          setConnectionState("failed");
          return;
        }

        if (!res.ok && res.status !== 304) {
          res = await fetch(
            `/api/experimental/rationales/${encodeURIComponent(persistId)}/state?t=${Date.now()}`,
            { cache: "no-store" as RequestCache }
          );
        }

        if (res.ok) {
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("application/octet-stream")) {
            const buf = new Uint8Array(await res.arrayBuffer());
            if (buf.byteLength > 0) {
              Y.applyUpdate(doc, buf);
              hadContent = yNodes.size > 0 || yEdges.size > 0;
            }
          } else {
            const json = await res.json().catch(() => undefined);
            if (json?.snapshot) {
              try {
                Y.applyUpdate(doc, decodeBase64(json.snapshot));
                hadContent = yNodes.size > 0 || yEdges.size > 0;
              } catch (error) {
                console.warn("[yjs] Failed to apply snapshot", error);
              }
            } else if (Array.isArray(json?.updates)) {
              for (const update of json.updates) {
                try {
                  Y.applyUpdate(doc, decodeBase64(update));
                  hadContent = true;
                } catch {}
              }
            }
          }
        }
      }

      const actuallyHasContent = yNodes.size > 0 || yEdges.size > 0;

      if (actuallyHasContent) {
        serverVectorRef.current = Y.encodeStateVector(doc);
        updateLocalStateVector();
      } else {
        console.log("[hydrateFromServer] Document is empty, enabling seeding");
        shouldSeedOnConnectRef.current = true;

        // If provider is already connected, trigger seeding immediately
        // since the sync event may have already occurred
        setTimeout(() => {
          if (
            shouldSeedOnConnectRef.current &&
            yNodes.size === 0 &&
            yEdges.size === 0
          ) {
            const event = new CustomEvent("yjs-immediate-seed");
            if (typeof window !== "undefined") {
              window.dispatchEvent(event);
            }
          }
        }, 100);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load document";
      setConnectionError(message);
      setConnectionState("failed");
    }
  }, [
    loadDiffFromServer,
    persistId,
    serverVectorRef,
    setConnectionError,
    setConnectionState,
    shouldSeedOnConnectRef,
    updateLocalStateVector,
    yEdgesMapRef,
    yNodesMapRef,
    ydocRef,
  ]);

  const resyncFromServer = useCallback(async () => {
    const doc = ydocRef.current;
    if (!doc) return;

    try {
      const sv = Y.encodeStateVector(doc);
      const encoded = encodeStateVector(sv);
      const res = await fetch(
        `/api/experimental/rationales/${encodeURIComponent(persistId)}/state?sv=${encodeURIComponent(encoded)}&t=${Date.now()}`,
        { cache: "no-store" as RequestCache }
      );

      if (res.status === 204) return;

      if (
        res.ok &&
        (res.headers.get("content-type") || "").includes(
          "application/octet-stream"
        )
      ) {
        const buf = new Uint8Array(await res.arrayBuffer());
        if (buf.byteLength > 0) {
          Y.applyUpdate(doc, buf);
          serverVectorRef.current = Y.encodeStateVector(doc);
          updateLocalStateVector();
        }
      }
    } catch {}
  }, [persistId, serverVectorRef, updateLocalStateVector, ydocRef]);

  return {
    hydrateFromServer,
    resyncFromServer,
    updateLocalStateVector,
  };
};
