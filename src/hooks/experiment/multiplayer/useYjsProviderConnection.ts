import { useCallback, useMemo, useRef } from "react";
import * as Y from "yjs";
import { Node, Edge } from "@xyflow/react";
import { WebsocketProvider } from "y-websocket";
import { fetchYjsAuthToken, getRefreshDelayMs } from "./yjs/auth";
import { HydrationStatus } from "./useYjsDocumentHydration";
import { logger } from "@/lib/logger";
import { createConnectionGrace } from "./connectionGrace";

interface UseYjsProviderConnectionProps {
  roomName: string;
  wsUrl: string;
  ydocRef: React.MutableRefObject<Y.Doc | null>;
  yNodesMapRef: React.MutableRefObject<Y.Map<Node> | null>;
  yEdgesMapRef: React.MutableRefObject<Y.Map<Edge> | null>;
  yTextMapRef: React.MutableRefObject<Y.Map<Y.Text> | null>;
  shouldSeedOnConnectRef: React.MutableRefObject<boolean>;
  seededOnceRef: React.MutableRefObject<boolean>;
  didResyncOnConnectRef: React.MutableRefObject<boolean>;
  hydrationStatusRef: React.MutableRefObject<HydrationStatus>;
  // Invoked when the provider emits its first 'sync' event in this session
  onFirstSync?: () => void;
  initialNodes: Node[];
  initialEdges: Edge[];
  forceSaveRef: React.MutableRefObject<(() => Promise<void>) | null>;
  setIsConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
  setConnectionState: (
    state: "initializing" | "connecting" | "connected" | "failed"
  ) => void;
  onResyncFromServer: () => Promise<void>;
  docId: string;
  shareToken?: string | null;
}

interface ProviderConnectionApi {
  providerRef: React.MutableRefObject<WebsocketProvider | null>;
  initializeProvider: () => Promise<void>;
  restartProviderWithNewToken: () => Promise<void>;
  cleanup: () => void;
}

export const useYjsProviderConnection = ({
  roomName,
  wsUrl,
  ydocRef,
  yNodesMapRef,
  yEdgesMapRef,
  yTextMapRef,
  shouldSeedOnConnectRef,
  seededOnceRef,
  didResyncOnConnectRef,
  hydrationStatusRef,
  onFirstSync,
  initialNodes,
  initialEdges,
  forceSaveRef,
  setIsConnected,
  setConnectionError,
  setConnectionState,
  onResyncFromServer,
  docId,
  shareToken,
}: UseYjsProviderConnectionProps): ProviderConnectionApi => {
  const providerRef = useRef<WebsocketProvider | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const fallbackSeedingTimerRef = useRef<number | null>(null);
  const isRefreshingTokenRef = useRef(false);
  const suppressNextResyncRef = useRef(false);
  const restartProviderWithNewTokenRef = useRef<(() => Promise<void>) | null>(
    null
  );
  const connectionGraceRef = useRef<ReturnType<
    typeof createConnectionGrace
  > | null>(null);
  const graceMs = useMemo(() => {
    const env = Number(process.env.NEXT_PUBLIC_MP_DISCONNECT_GRACE_MS || "");
    return Number.isFinite(env) && env > 0 ? env : 1200;
  }, []);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const clearFallbackSeedingTimer = useCallback(() => {
    if (
      fallbackSeedingTimerRef.current !== null &&
      typeof window !== "undefined"
    ) {
      window.clearTimeout(fallbackSeedingTimerRef.current);
      fallbackSeedingTimerRef.current = null;
    }
  }, []);

  const seedDocument = useCallback(() => {
    logger.log("[YJS Provider] seedDocument called");
    const doc = ydocRef.current;
    const yNodes = yNodesMapRef.current;
    const yEdges = yEdgesMapRef.current;
    const yText = yTextMapRef.current;

    logger.log("[YJS Provider] seedDocument - state check:", {
      hasDoc: !!doc,
      hasYNodes: !!yNodes,
      hasYEdges: !!yEdges,
      hasYText: !!yText,
      yNodesSize: yNodes?.size || 0,
      yEdgesSize: yEdges?.size || 0,
      initialNodesCount: initialNodes.length,
      initialEdgesCount: initialEdges.length,
      seededOnce: seededOnceRef.current,
    });

    if (!doc || !yNodes || !yEdges || !yText) {
      logger.log(
        "[YJS Provider] seedDocument - missing required objects, aborting"
      );
      return;
    }
    if (yNodes.size > 0 || yEdges.size > 0) {
      logger.log(
        "[YJS Provider] seedDocument - document already has data, skipping seed"
      );
      return;
    }

    logger.log(
      "[YJS Provider] seedDocument - proceeding with seeding transaction"
    );
    doc.transact(() => {
      initialNodes.forEach((node) => yNodes.set(node.id, node));
      initialEdges.forEach((edge) => yEdges.set(edge.id, edge));
      initialNodes.forEach((node) => {
        const id = node.id;
        if (!yText.get(id)) {
          const text = new Y.Text();
          const data =
            typeof node.data === "object" && node.data !== null
              ? (node.data as Record<string, unknown>)
              : undefined;
          const rawContent =
            node.type === "statement"
              ? (data?.statement as string | undefined)
              : (data?.content as string | undefined);
          const initialContent =
            typeof rawContent === "string" ? rawContent : "";
          if (initialContent) {
            text.insert(0, initialContent);
          }
          yText.set(id, text);
        }
      });
    }, "seed");

    logger.log(
      "[YJS Provider] seedDocument - transaction complete, post-seed state:",
      {
        yNodesSize: yNodes.size,
        yEdgesSize: yEdges.size,
        yTextSize: yText.size,
      }
    );

    try {
      forceSaveRef.current?.();
      logger.log(
        "[YJS Provider] seedDocument - force save called successfully"
      );
    } catch (error) {
      logger.warn("[YJS Provider] seedDocument - force save failed:", error);
    }
    seededOnceRef.current = true;
    logger.log(
      "[YJS Provider] seedDocument - seeding complete, seededOnce set to true"
    );
  }, [
    forceSaveRef,
    initialEdges,
    initialNodes,
    seededOnceRef,
    yEdgesMapRef,
    yNodesMapRef,
    yTextMapRef,
    ydocRef,
  ]);

  const scheduleRefresh = useCallback(
    (expiresAt: number) => {
      clearRefreshTimer();
      if (typeof window === "undefined") return;
      const delay = getRefreshDelayMs(expiresAt);
      refreshTimerRef.current = window.setTimeout(() => {
        suppressNextResyncRef.current = true;
        isRefreshingTokenRef.current = true;
        restartProviderWithNewTokenRef
          .current?.()
          .catch(() => undefined)
          .finally(() => {
            isRefreshingTokenRef.current = false;
          });
      }, delay);
    },
    [clearRefreshTimer]
  );

  const canSeed = useCallback(() => {
    const hydrationStatus = hydrationStatusRef.current;
    return (
      shouldSeedOnConnectRef.current &&
      !seededOnceRef.current &&
      hydrationStatus.phase === "completed" &&
      hydrationStatus.hasContent === false
    );
  }, [hydrationStatusRef, seededOnceRef, shouldSeedOnConnectRef]);

  const attachProviderListeners = useCallback(
    (provider: WebsocketProvider) => {
      logger.log(
        "[YJS Provider] attachProviderListeners - attaching event listeners"
      );

      provider.on("sync", () => {
        logger.log("[YJS Provider] sync event received", {
          didResyncOnConnect: didResyncOnConnectRef.current,
          shouldSeedOnConnect: shouldSeedOnConnectRef.current,
          seededOnce: seededOnceRef.current,
        });

        try {
          onFirstSync?.();
        } catch {}

        if (suppressNextResyncRef.current) {
          didResyncOnConnectRef.current = true;
          suppressNextResyncRef.current = false;
          logger.log(
            "[YJS Provider] sync - suppressed HTTP resync on token refresh"
          );
        } else if (!didResyncOnConnectRef.current) {
          logger.log(
            "[YJS Provider] sync - first sync, calling onResyncFromServer"
          );
          didResyncOnConnectRef.current = true;
          void onResyncFromServer();
        }

        if (canSeed()) {
          logger.log(
            "[YJS Provider] sync - shouldSeedOnConnect is true, calling seedDocument"
          );
          shouldSeedOnConnectRef.current = false;
          seedDocument();
        } else {
          logger.log(
            "[YJS Provider] sync - shouldSeedOnConnect is false, skipping seed"
          );
        }
      });

      if (!connectionGraceRef.current) {
        connectionGraceRef.current = createConnectionGrace(
          graceMs,
          setIsConnected
        );
      }
      provider.on("status", (status: { status: string }) => {
        const connected = status?.status === "connected";
        logger.log("[YJS Provider] status event received:", {
          status: status?.status,
          connected,
          wsUrl: provider.url,
          roomname: provider.roomname,
        });

        connectionGraceRef.current?.onStatus(connected);
        if (connected) {
          logger.log(
            "[YJS Provider] status - connected, clearing error and setting state to connected"
          );
          setConnectionError(null);
          setConnectionState("connected");
        } else {
          logger.log(
            "[YJS Provider] status - not connected, setting state to connecting"
          );
          setConnectionState("connecting");
        }
      });

      provider.on("connection-close", () => {
        logger.log("[YJS Provider] connection-close event received", {
          isRefreshingToken: isRefreshingTokenRef.current,
        });
        setConnectionState("connecting");
        setConnectionError("Reconnecting to server...");
        if (!isRefreshingTokenRef.current) {
          logger.log(
            "[YJS Provider] connection-close - starting token refresh"
          );
          isRefreshingTokenRef.current = true;
          restartProviderWithNewTokenRef.current?.().finally(() => {
            logger.log(
              "[YJS Provider] connection-close - token refresh complete"
            );
            isRefreshingTokenRef.current = false;
          });
        } else {
          logger.log(
            "[YJS Provider] connection-close - token refresh already in progress, skipping"
          );
        }
      });

      provider.on("connection-error", () => {
        logger.error("[YJS Provider] connection-error event received");
        try {
          connectionGraceRef.current?.forceDisconnectNow();
        } catch {}
        setConnectionState("failed");
        setConnectionError("WebSocket connection failed");
      });
    },
    [
      canSeed,
      didResyncOnConnectRef,
      onFirstSync,
      onResyncFromServer,
      seedDocument,
      seededOnceRef,
      setConnectionError,
      setConnectionState,
      setIsConnected,
      shouldSeedOnConnectRef,
      graceMs,
    ]
  );

  const destroyProvider = useCallback(() => {
    clearRefreshTimer();
    clearFallbackSeedingTimer();
    try {
      providerRef.current?.destroy?.();
    } catch {}
    providerRef.current = null;
    try {
      connectionGraceRef.current?.dispose();
    } catch {}
  }, [clearFallbackSeedingTimer, clearRefreshTimer]);

  const createProvider = useCallback(async () => {
    logger.log("[YJS Provider] createProvider called", {
      hasDoc: !!ydocRef.current,
      wsUrl,
      roomName,
    });

    const doc = ydocRef.current;
    if (!doc) {
      logger.warn(
        "[YJS Provider] createProvider - no document available (component may be unmounted or not ready)"
      );
      return null;
    }
    if (!wsUrl) {
      logger.error(
        "[YJS Provider] createProvider - WebSocket URL not configured"
      );
      setConnectionError("WebSocket URL not configured");
      setConnectionState("failed");
      return null;
    }

    logger.log("[YJS Provider] createProvider - fetching auth token");
    try {
      const { token, expiresAt } = await fetchYjsAuthToken({
        docId,
        shareToken,
      });
      logger.log("[YJS Provider] createProvider - auth token received", {
        tokenLength: token?.length || 0,
        expiresAt: new Date(expiresAt).toISOString(),
      });

      logger.log("[YJS Provider] createProvider - creating WebsocketProvider");
      const provider = new WebsocketProvider(wsUrl, roomName, doc, {
        WebSocketPolyfill: class extends WebSocket {
          constructor(url: string, protocols?: string | string[]) {
            const withAuth = `${url}?auth=${encodeURIComponent(token)}`;
            logger.log(
              "[YJS Provider] WebSocket connecting to:",
              withAuth.replace(/auth=[^&]+/, "auth=***")
            );
            super(withAuth, protocols);
          }
        } as unknown as typeof WebSocket,
      });

      logger.log(
        "[YJS Provider] createProvider - provider created, setting up"
      );
      providerRef.current = provider;
      didResyncOnConnectRef.current = false;
      attachProviderListeners(provider);
      scheduleRefresh(expiresAt);

      logger.log("[YJS Provider] createProvider - setup complete");
      return provider;
    } catch (error) {
      logger.error(
        "[YJS Provider] createProvider - failed to fetch auth token:",
        error
      );
      throw error;
    }
  }, [
    attachProviderListeners,
    didResyncOnConnectRef,
    docId,
    roomName,
    scheduleRefresh,
    setConnectionError,
    setConnectionState,
    shareToken,
    wsUrl,
    ydocRef,
  ]);

  const restartProviderWithNewToken = useCallback(async () => {
    logger.log("[YJS Provider] restartProviderWithNewToken called");
    try {
      if (!ydocRef.current) {
        logger.log(
          "[YJS Provider] restartProviderWithNewToken - document not ready, skipping restart"
        );
        return;
      }

      suppressNextResyncRef.current = true;
      isRefreshingTokenRef.current = true;
      logger.log(
        "[YJS Provider] restartProviderWithNewToken - destroying existing provider"
      );
      destroyProvider();

      logger.log(
        "[YJS Provider] restartProviderWithNewToken - creating new provider"
      );
      const provider = await createProvider();
      if (!provider) {
        logger.error(
          "[YJS Provider] restartProviderWithNewToken - createProvider returned null"
        );
        return;
      }

      logger.log(
        "[YJS Provider] restartProviderWithNewToken - connecting new provider"
      );
      provider.connect();
      logger.log(
        "[YJS Provider] restartProviderWithNewToken - restart complete"
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Authentication failed";
      logger.error(
        "[YJS Provider] restartProviderWithNewToken - error occurred:",
        {
          error,
          message,
        }
      );
      setConnectionError(message);
      setConnectionState("failed");
    } finally {
      isRefreshingTokenRef.current = false;
    }
  }, [createProvider, destroyProvider, setConnectionError, setConnectionState, ydocRef]);

  restartProviderWithNewTokenRef.current = restartProviderWithNewToken;

  const initializeProvider = useCallback(async () => {
    logger.log("[YJS Provider] initializeProvider called", {
      seededOnce: seededOnceRef.current,
      shouldSeedOnConnect: shouldSeedOnConnectRef.current,
      didResyncOnConnect: didResyncOnConnectRef.current,
    });

    // Guard: if doc doesn't exist yet, bail early
    if (!ydocRef.current) {
      logger.log(
        "[YJS Provider] initializeProvider - document not ready yet, skipping initialization"
      );
      return;
    }

    try {
      setConnectionState("initializing");
      logger.log(
        "[YJS Provider] initializeProvider - state set to initializing"
      );

      const provider = await createProvider();
      if (!provider) {
        logger.error(
          "[YJS Provider] initializeProvider - createProvider returned null"
        );
        return;
      }

      logger.log(
        "[YJS Provider] initializeProvider - provider created, calling connect()"
      );
      provider.connect();

      if (typeof window !== "undefined") {
        clearFallbackSeedingTimer();
        logger.log(
          "[YJS Provider] initializeProvider - setting up fallback seeding timeout (5000ms)"
        );
        fallbackSeedingTimerRef.current = window.setTimeout(() => {
          logger.log(
            "[YJS Provider] initializeProvider - fallback timeout reached",
            {
              seededOnce: seededOnceRef.current,
              shouldSeedOnConnect: shouldSeedOnConnectRef.current,
              hydrationPhase: hydrationStatusRef.current.phase,
              hydrationHasContent: hydrationStatusRef.current.hasContent,
            }
          );

          if (canSeed()) {
            logger.log(
              "[YJS Provider] initializeProvider - fallback seeding triggered"
            );
            seedDocument();
            shouldSeedOnConnectRef.current = false;
          } else {
            logger.log(
              "[YJS Provider] initializeProvider - fallback seeding skipped (already seeded or shouldn't seed)"
            );
          }
        }, 5000);
      } else {
        logger.log(
          "[YJS Provider] initializeProvider - window not available, skipping fallback timeout"
        );
      }

      logger.log("[YJS Provider] initializeProvider - initialization complete");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Authentication failed";
      logger.error("[YJS Provider] initializeProvider - error occurred:", {
        error,
        message,
      });
      setConnectionError(message);
      setConnectionState("failed");
    }
  }, [
    createProvider,
    canSeed,
    clearFallbackSeedingTimer,
    didResyncOnConnectRef,
    seedDocument,
    seededOnceRef,
    setConnectionError,
    setConnectionState,
    shouldSeedOnConnectRef,
    hydrationStatusRef,
    ydocRef,
  ]);

  return useMemo(
    () => ({
      providerRef,
      initializeProvider,
      restartProviderWithNewToken,
      cleanup: destroyProvider,
    }),
    [destroyProvider, initializeProvider, restartProviderWithNewToken]
  );
};
