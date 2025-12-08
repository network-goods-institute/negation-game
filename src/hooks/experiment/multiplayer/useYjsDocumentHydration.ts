import { MutableRefObject, useCallback } from "react";
import * as Y from "yjs";
import { Edge, Node } from "@xyflow/react";
import { logger } from "@/lib/logger";

interface UseYjsDocumentHydrationProps {
  persistId: string;
  ydocRef: React.MutableRefObject<Y.Doc | null>;
  yNodesMapRef: React.MutableRefObject<Y.Map<Node> | null>;
  yEdgesMapRef: React.MutableRefObject<Y.Map<Edge> | null>;
  serverVectorRef: React.MutableRefObject<Uint8Array | null>;
  shouldSeedOnConnectRef: React.MutableRefObject<boolean>;
  hydrationStatusRef: MutableRefObject<HydrationStatus>;
  shareToken?: string | null;
  setConnectionError: (error: string | null) => void;
  setConnectionState: (
    state: "initializing" | "connecting" | "connected" | "failed"
  ) => void;
}

export interface HydrationStatus {
  phase: "pending" | "completed";
  hasContent: boolean;
  mapCount: {
    nodes: number;
    edges: number;
  };
  observedNodeIds: string[];
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
  hydrationStatusRef,
  shareToken = null,
  setConnectionError,
  setConnectionState,
}: UseYjsDocumentHydrationProps) => {
  const withShare = useCallback(
    (url: string) => {
      if (!shareToken) return url;
      return url.includes("?")
        ? `${url}&share=${encodeURIComponent(shareToken)}`
        : `${url}?share=${encodeURIComponent(shareToken)}`;
    },
    [shareToken]
  );

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
        logger.error("[loadDiffFromServer] Error:", err);
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
    hydrationStatusRef.current = {
      phase: "pending",
      hasContent: false,
      mapCount: { nodes: yNodes.size, edges: yEdges.size },
      observedNodeIds: [],
    };
    let hadContent = yNodes.size > 0 || yEdges.size > 0;
    const observedDuringHydration = new Set<string>();

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
            withShare(
              `/api/experimental/rationales/${encodeURIComponent(
                persistId
              )}/state?sv=${encodeURIComponent(cachedSv)}`
            )
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
          withShare(
            `/api/experimental/rationales/${encodeURIComponent(
              persistId
            )}/state`
          )
        );

        if (res.status === 401) {
          setConnectionError("You need to be logged in to load this document");
          setConnectionState("failed");
          return;
        }

        if (!res.ok && res.status !== 304) {
          res = await fetch(
            withShare(
              `/api/experimental/rationales/${encodeURIComponent(
                persistId
              )}/state?t=${Date.now()}`
            ),
            { cache: "no-store" as RequestCache }
          );
        }

        if (res.ok) {
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("application/octet-stream")) {
            const buf = new Uint8Array(await res.arrayBuffer());
            if (buf.byteLength > 0) {
              Y.applyUpdate(doc, buf);
              doc
                .getMap<Node>("nodes")
                .forEach((_value, key) => observedDuringHydration.add(key));
              hadContent = true;
            }
          } else {
            const json = await res.json().catch(() => undefined);
            if (json?.snapshot) {
              try {
                Y.applyUpdate(doc, decodeBase64(json.snapshot));
                doc
                  .getMap<Node>("nodes")
                  .forEach((_value, key) => observedDuringHydration.add(key));
                hadContent = true;
              } catch (error) {
                logger.warn("[yjs] Failed to apply snapshot", error);
              }
            } else if (Array.isArray(json?.updates)) {
              for (const update of json.updates) {
                try {
                  Y.applyUpdate(doc, decodeBase64(update));
                  doc
                    .getMap<Node>("nodes")
                    .forEach((_value, key) => observedDuringHydration.add(key));
                  hadContent = true;
                } catch {}
              }
            }
          }
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load document";
      setConnectionError(message);
      setConnectionState("failed");
      hadContent = yNodes.size > 0 || yEdges.size > 0;
    }

    const nodesSize = yNodes.size;
    const edgesSize = yEdges.size;
    const mapHasContent = nodesSize > 0 || edgesSize > 0;
    const finalHasContent = hadContent || mapHasContent;
    const seededDuringHydration = new Set<string>();
    yNodes.forEach((_value, key) => seededDuringHydration.add(key));

    hydrationStatusRef.current = {
      phase: "completed",
      hasContent: finalHasContent,
      mapCount: {
        nodes: nodesSize,
        edges: edgesSize,
      },
      observedNodeIds: Array.from(
        new Set([...observedDuringHydration, ...seededDuringHydration])
      ).sort(),
    };

    shouldSeedOnConnectRef.current = !finalHasContent;

    if (finalHasContent) {
      serverVectorRef.current = Y.encodeStateVector(doc);
      updateLocalStateVector();
    } else {
      logger.debug("[hydrateFromServer] Document is empty, enabling seeding");
    }
  }, [
    loadDiffFromServer,
    persistId,
    serverVectorRef,
    setConnectionError,
    setConnectionState,
    shouldSeedOnConnectRef,
    hydrationStatusRef,
    updateLocalStateVector,
    withShare,
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
        withShare(
          `/api/experimental/rationales/${encodeURIComponent(
            persistId
          )}/state?sv=${encodeURIComponent(encoded)}&t=${Date.now()}`
        ),
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
  }, [persistId, serverVectorRef, updateLocalStateVector, withShare, ydocRef]);

  return {
    hydrateFromServer,
    resyncFromServer,
    updateLocalStateVector,
  };
};
