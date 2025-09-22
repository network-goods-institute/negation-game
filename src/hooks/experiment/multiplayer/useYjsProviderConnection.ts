import { useCallback, useMemo, useRef } from "react";
import * as Y from "yjs";
import { Node, Edge } from "@xyflow/react";
import { WebsocketProvider } from "y-websocket";
import { fetchYjsAuthToken, getRefreshDelayMs } from "./yjs/auth";

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
  initialNodes: Node[];
  initialEdges: Edge[];
  forceSaveRef: React.MutableRefObject<(() => Promise<void>) | null>;
  setIsConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
  setConnectionState: (
    state: "initializing" | "connecting" | "connected" | "failed"
  ) => void;
  onResyncFromServer: () => Promise<void>;
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
  initialNodes,
  initialEdges,
  forceSaveRef,
  setIsConnected,
  setConnectionError,
  setConnectionState,
  onResyncFromServer,
}: UseYjsProviderConnectionProps): ProviderConnectionApi => {
  const providerRef = useRef<WebsocketProvider | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const isRefreshingTokenRef = useRef(false);
  const restartProviderWithNewTokenRef = useRef<(() => Promise<void>) | null>(
    null
  );

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const seedDocument = useCallback(() => {
    console.log("[YJS Provider] seedDocument called");
    const doc = ydocRef.current;
    const yNodes = yNodesMapRef.current;
    const yEdges = yEdgesMapRef.current;
    const yText = yTextMapRef.current;

    console.log("[YJS Provider] seedDocument - state check:", {
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
      console.log(
        "[YJS Provider] seedDocument - missing required objects, aborting"
      );
      return;
    }
    if (yNodes.size > 0 || yEdges.size > 0) {
      console.log(
        "[YJS Provider] seedDocument - document already has data, skipping seed"
      );
      return;
    }

    console.log(
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

    console.log(
      "[YJS Provider] seedDocument - transaction complete, post-seed state:",
      {
        yNodesSize: yNodes.size,
        yEdgesSize: yEdges.size,
        yTextSize: yText.size,
      }
    );

    try {
      forceSaveRef.current?.();
      console.log(
        "[YJS Provider] seedDocument - force save called successfully"
      );
    } catch (error) {
      console.warn("[YJS Provider] seedDocument - force save failed:", error);
    }
    seededOnceRef.current = true;
    console.log(
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
        restartProviderWithNewTokenRef.current?.().catch(() => undefined);
      }, delay);
    },
    [clearRefreshTimer]
  );

  const attachProviderListeners = useCallback(
    (provider: WebsocketProvider) => {
      console.log(
        "[YJS Provider] attachProviderListeners - attaching event listeners"
      );

      provider.on("sync", () => {
        console.log("[YJS Provider] sync event received", {
          didResyncOnConnect: didResyncOnConnectRef.current,
          shouldSeedOnConnect: shouldSeedOnConnectRef.current,
          seededOnce: seededOnceRef.current,
        });

        if (!didResyncOnConnectRef.current) {
          console.log(
            "[YJS Provider] sync - first sync, calling onResyncFromServer"
          );
          didResyncOnConnectRef.current = true;
          void onResyncFromServer();
        }

        if (shouldSeedOnConnectRef.current) {
          console.log(
            "[YJS Provider] sync - shouldSeedOnConnect is true, calling seedDocument"
          );
          shouldSeedOnConnectRef.current = false;
          seedDocument();
        } else {
          console.log(
            "[YJS Provider] sync - shouldSeedOnConnect is false, skipping seed"
          );
        }
      });

      provider.on("status", (status: { status: string }) => {
        const connected = status?.status === "connected";
        console.log("[YJS Provider] status event received:", {
          status: status?.status,
          connected,
          wsUrl: provider.url,
          roomname: provider.roomname,
        });

        setIsConnected(connected);
        if (connected) {
          console.log(
            "[YJS Provider] status - connected, clearing error and setting state to connected"
          );
          setConnectionError(null);
          setConnectionState("connected");
        } else {
          console.log(
            "[YJS Provider] status - not connected, setting state to connecting"
          );
          setConnectionState("connecting");
        }
      });

      provider.on("connection-close", () => {
        console.log("[YJS Provider] connection-close event received", {
          isRefreshingToken: isRefreshingTokenRef.current,
        });
        setConnectionState("connecting");
        setConnectionError("Reconnecting to server...");
        if (!isRefreshingTokenRef.current) {
          console.log(
            "[YJS Provider] connection-close - starting token refresh"
          );
          isRefreshingTokenRef.current = true;
          restartProviderWithNewTokenRef.current?.().finally(() => {
            console.log(
              "[YJS Provider] connection-close - token refresh complete"
            );
            isRefreshingTokenRef.current = false;
          });
        } else {
          console.log(
            "[YJS Provider] connection-close - token refresh already in progress, skipping"
          );
        }
      });

      provider.on("connection-error", () => {
        console.error("[YJS Provider] connection-error event received");
        setConnectionState("failed");
        setConnectionError("WebSocket connection failed");
      });
    },
    [
      didResyncOnConnectRef,
      onResyncFromServer,
      seedDocument,
      seededOnceRef,
      setConnectionError,
      setConnectionState,
      setIsConnected,
      shouldSeedOnConnectRef,
    ]
  );

  const destroyProvider = useCallback(() => {
    clearRefreshTimer();
    try {
      providerRef.current?.destroy?.();
    } catch {}
    providerRef.current = null;
  }, [clearRefreshTimer]);

  const createProvider = useCallback(async () => {
    console.log("[YJS Provider] createProvider called", {
      hasDoc: !!ydocRef.current,
      wsUrl,
      roomName,
    });

    const doc = ydocRef.current;
    if (!doc) {
      console.error("[YJS Provider] createProvider - no document available");
      return null;
    }
    if (!wsUrl) {
      console.error(
        "[YJS Provider] createProvider - WebSocket URL not configured"
      );
      setConnectionError("WebSocket URL not configured");
      setConnectionState("failed");
      return null;
    }

    console.log("[YJS Provider] createProvider - fetching auth token");
    try {
      const { token, expiresAt } = await fetchYjsAuthToken();
      console.log("[YJS Provider] createProvider - auth token received", {
        tokenLength: token?.length || 0,
        expiresAt: new Date(expiresAt).toISOString(),
      });

      console.log("[YJS Provider] createProvider - creating WebsocketProvider");
      const provider = new WebsocketProvider(wsUrl, roomName, doc, {
        WebSocketPolyfill: class extends WebSocket {
          constructor(url: string, protocols?: string | string[]) {
            const withAuth = `${url}?auth=${encodeURIComponent(token)}`;
            console.log(
              "[YJS Provider] WebSocket connecting to:",
              withAuth.replace(/auth=[^&]+/, "auth=***")
            );
            super(withAuth, protocols);
          }
        } as unknown as typeof WebSocket,
      });

      console.log(
        "[YJS Provider] createProvider - provider created, setting up"
      );
      providerRef.current = provider;
      didResyncOnConnectRef.current = false;
      attachProviderListeners(provider);
      scheduleRefresh(expiresAt);

      console.log("[YJS Provider] createProvider - setup complete");
      return provider;
    } catch (error) {
      console.error(
        "[YJS Provider] createProvider - failed to fetch auth token:",
        error
      );
      throw error;
    }
  }, [
    attachProviderListeners,
    didResyncOnConnectRef,
    roomName,
    scheduleRefresh,
    setConnectionError,
    setConnectionState,
    wsUrl,
    ydocRef,
  ]);

  const restartProviderWithNewToken = useCallback(async () => {
    console.log("[YJS Provider] restartProviderWithNewToken called");
    try {
      console.log(
        "[YJS Provider] restartProviderWithNewToken - destroying existing provider"
      );
      destroyProvider();

      console.log(
        "[YJS Provider] restartProviderWithNewToken - creating new provider"
      );
      const provider = await createProvider();
      if (!provider) {
        console.error(
          "[YJS Provider] restartProviderWithNewToken - createProvider returned null"
        );
        return;
      }

      console.log(
        "[YJS Provider] restartProviderWithNewToken - connecting new provider"
      );
      provider.connect();
      console.log(
        "[YJS Provider] restartProviderWithNewToken - restart complete"
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Authentication failed";
      console.error(
        "[YJS Provider] restartProviderWithNewToken - error occurred:",
        {
          error,
          message,
        }
      );
      setConnectionError(message);
      setConnectionState("failed");
    }
  }, [createProvider, destroyProvider, setConnectionError, setConnectionState]);

  restartProviderWithNewTokenRef.current = restartProviderWithNewToken;

  const initializeProvider = useCallback(async () => {
    console.log("[YJS Provider] initializeProvider called", {
      seededOnce: seededOnceRef.current,
      shouldSeedOnConnect: shouldSeedOnConnectRef.current,
      didResyncOnConnect: didResyncOnConnectRef.current,
    });

    try {
      setConnectionState("initializing");
      console.log(
        "[YJS Provider] initializeProvider - state set to initializing"
      );

      const provider = await createProvider();
      if (!provider) {
        console.error(
          "[YJS Provider] initializeProvider - createProvider returned null"
        );
        return;
      }

      console.log(
        "[YJS Provider] initializeProvider - provider created, calling connect()"
      );
      provider.connect();

      // Listen for immediate seeding requests from hydration
      const handleImmediateSeeding = () => {
        console.log("[YJS Provider] immediate seeding event received", {
          seededOnce: seededOnceRef.current,
          shouldSeedOnConnect: shouldSeedOnConnectRef.current,
        });
        if (!seededOnceRef.current && shouldSeedOnConnectRef.current) {
          console.log("[YJS Provider] executing immediate seeding");
          seedDocument();
          shouldSeedOnConnectRef.current = false;
        }
      };

      if (typeof window !== "undefined") {
        window.addEventListener("yjs-immediate-seed", handleImmediateSeeding);

        console.log(
          "[YJS Provider] initializeProvider - setting up fallback seeding timeout (1200ms)"
        );
        window.setTimeout(() => {
          console.log(
            "[YJS Provider] initializeProvider - fallback timeout reached",
            {
              seededOnce: seededOnceRef.current,
              shouldSeedOnConnect: shouldSeedOnConnectRef.current,
            }
          );

          if (!seededOnceRef.current && shouldSeedOnConnectRef.current) {
            console.log(
              "[YJS Provider] initializeProvider - fallback seeding triggered"
            );
            seedDocument();
            shouldSeedOnConnectRef.current = false;
          } else {
            console.log(
              "[YJS Provider] initializeProvider - fallback seeding skipped (already seeded or shouldn't seed)"
            );
          }
        }, 1200);
      } else {
        console.log(
          "[YJS Provider] initializeProvider - window not available, skipping fallback timeout"
        );
      }

      console.log(
        "[YJS Provider] initializeProvider - initialization complete"
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Authentication failed";
      console.error("[YJS Provider] initializeProvider - error occurred:", {
        error,
        message,
      });
      setConnectionError(message);
      setConnectionState("failed");
    }
  }, [
    createProvider,
    didResyncOnConnectRef,
    seedDocument,
    seededOnceRef,
    setConnectionError,
    setConnectionState,
    shouldSeedOnConnectRef,
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
