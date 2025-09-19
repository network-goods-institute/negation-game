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
  setConnectionState: (state: "initializing" | "connecting" | "connected" | "failed") => void;
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
  const restartProviderWithNewTokenRef = useRef<(() => Promise<void>) | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const seedDocument = useCallback(() => {
    const doc = ydocRef.current;
    const yNodes = yNodesMapRef.current;
    const yEdges = yEdgesMapRef.current;
    const yText = yTextMapRef.current;

    if (!doc || !yNodes || !yEdges || !yText) return;
    if (yNodes.size > 0 || yEdges.size > 0) return;

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
          const initialContent = typeof rawContent === "string" ? rawContent : "";
          if (initialContent) {
            text.insert(0, initialContent);
          }
          yText.set(id, text);
        }
      });
    }, "seed");

    try {
      forceSaveRef.current?.();
    } catch {}
    seededOnceRef.current = true;
  }, [forceSaveRef, initialEdges, initialNodes, seededOnceRef, yEdgesMapRef, yNodesMapRef, yTextMapRef, ydocRef]);

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
      provider.on("sync", () => {
        if (!didResyncOnConnectRef.current) {
          didResyncOnConnectRef.current = true;
          void onResyncFromServer();
        }

        if (shouldSeedOnConnectRef.current) {
          shouldSeedOnConnectRef.current = false;
          seedDocument();
        }
      });

      provider.on("status", (status: { status: string }) => {
        const connected = status?.status === "connected";
        setIsConnected(connected);
        if (connected) {
          setConnectionError(null);
          setConnectionState("connected");
        } else {
          setConnectionState("connecting");
        }
      });

      provider.on("connection-close", () => {
        setConnectionState("connecting");
        setConnectionError("Reconnecting to server...");
        if (!isRefreshingTokenRef.current) {
          isRefreshingTokenRef.current = true;
          restartProviderWithNewTokenRef
            .current?.()
            .finally(() => {
              isRefreshingTokenRef.current = false;
            });
        }
      });

      provider.on("connection-error", () => {
        setConnectionState("failed");
        setConnectionError("WebSocket connection failed");
      });
    },
    [
      didResyncOnConnectRef,
      onResyncFromServer,
      seedDocument,
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

  const createProvider = useCallback(
    async () => {
      const doc = ydocRef.current;
      if (!doc) return null;
      if (!wsUrl) {
        setConnectionError("WebSocket URL not configured");
        setConnectionState("failed");
        return null;
      }

      const { token, expiresAt } = await fetchYjsAuthToken();

      const provider = new WebsocketProvider(wsUrl, roomName, doc, {
        WebSocketPolyfill: class extends WebSocket {
          constructor(url: string, protocols?: string | string[]) {
            const withAuth = `${url}?auth=${encodeURIComponent(token)}`;
            super(withAuth, protocols);
          }
        } as unknown as typeof WebSocket,
      });

      providerRef.current = provider;
      didResyncOnConnectRef.current = false;
      attachProviderListeners(provider);
      scheduleRefresh(expiresAt);
      return provider;
    },
    [
      attachProviderListeners,
      didResyncOnConnectRef,
      roomName,
      scheduleRefresh,
      setConnectionError,
      setConnectionState,
      wsUrl,
      ydocRef,
    ]
  );

  const restartProviderWithNewToken = useCallback(async () => {
    try {
      destroyProvider();
      const provider = await createProvider();
      if (!provider) return;
      provider.connect();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Authentication failed";
      setConnectionError(message);
      setConnectionState("failed");
    }
  }, [createProvider, destroyProvider, setConnectionError, setConnectionState]);

  restartProviderWithNewTokenRef.current = restartProviderWithNewToken;

  const initializeProvider = useCallback(async () => {
    try {
      const provider = await createProvider();
      if (!provider) return;
      provider.connect();

      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          if (!seededOnceRef.current && shouldSeedOnConnectRef.current) {
            seedDocument();
            shouldSeedOnConnectRef.current = false;
          }
        }, 1200);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Authentication failed";
      setConnectionError(message);
      setConnectionState("failed");
    }
  }, [
    createProvider,
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






