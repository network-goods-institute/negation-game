import { useEffect, useRef, useCallback, useState } from "react";
import { Node, Edge, useNodesState, useEdgesState } from "@xyflow/react";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { WebsocketProvider } from "y-websocket";

interface UseYjsMultiplayerProps {
  roomName: string;
  initialNodes: Node[];
  initialEdges: Edge[];
  enabled?: boolean;
}

export const useYjsMultiplayer = ({
  roomName,
  initialNodes,
  initialEdges,
  enabled = true,
}: UseYjsMultiplayerProps) => {
  const [nodes, setNodes, rawOnNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, rawOnEdgesChange] = useEdgesState(initialEdges);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const ydocRef = useRef<Y.Doc | null>(null);
  const webrtcProviderRef = useRef<WebrtcProvider | WebsocketProvider | null>(
    null
  );
  const yNodesMapRef = useRef<Y.Map<Node> | null>(null);
  const yEdgesMapRef = useRef<Y.Map<Edge> | null>(null);

  // Initialize Yjs doc/provider once on mount (only if enabled)
  useEffect(() => {
    if (!enabled) {
      setConnectionError("Initializing...");
      setIsConnected(false);
      return;
    }
    const doc = new Y.Doc();

    const wsUrl = process.env.NEXT_PUBLIC_YJS_WS_URL;
    console.log("[mp] initializing provider", {
      wsUrl: Boolean(wsUrl),
      roomName,
    });
    const provider = wsUrl
      ? new WebsocketProvider(wsUrl, roomName, doc)
      : new WebrtcProvider(roomName, doc);
    ydocRef.current = doc;
    webrtcProviderRef.current = provider as unknown as
      | WebrtcProvider
      | WebsocketProvider;

    // Start disconnected, wait for actual peers
    setIsConnected(false);
    setConnectionError("Waiting for other users to join...");

    // Connection event handlers for WebRTC
    // @ts-ignore minimal event API cross-provider
    provider.on("synced", () => {
      console.log("provider synced with document");
    });

    // y-websocket has no 'peers' event; guard by feature-detection
    // @ts-ignore
    provider.on?.("peers", (peers: any) => {
      const peerCount = Array.from(peers).length;
      console.log("webrtc peers:", peerCount);
      if (peerCount > 0) {
        setIsConnected(true);
        setConnectionError(null);
      } else {
        setIsConnected(false);
        setConnectionError("Waiting for other users to join...");
      }
    });

    // @ts-ignore minimal event API
    provider.on("status", (status: any) => {
      console.log("[mp] provider status:", status);
      const isUp = status?.status === "connected";
      setIsConnected(Boolean(isUp));
      if (isUp) {
        setConnectionError(null);
      } else if (!wsUrl) {
        setConnectionError("Waiting for other users to join...");
      }
    });

    // Graph Y.Maps
    const yNodes = doc.getMap<Node>("nodes");
    const yEdges = doc.getMap<Edge>("edges");
    yNodesMapRef.current = yNodes;
    yEdgesMapRef.current = yEdges;

    // Seed initial data if empty
    if (yNodes.size === 0 && yEdges.size === 0) {
      doc.transact(() => {
        for (const n of initialNodes) yNodes.set(n.id, n);
        for (const e of initialEdges) yEdges.set(e.id, e);
      }, "seed");
    }

    const updateNodesFromY = () => {
      const arr: Node[] = [];
      // @ts-ignore
      for (const [, v] of yNodes) arr.push(v);
      // Try to keep deterministic order by id if present
      // @ts-ignore
      const sorted = arr.sort((a, b) => (a.id || "").localeCompare(b.id || ""));
      setNodes(sorted);
    };

    const updateEdgesFromY = () => {
      const arr: Edge[] = [];
      // @ts-ignore
      for (const [, v] of yEdges) arr.push(v);
      // @ts-ignore
      const sorted = arr.sort((a, b) => (a.id || "").localeCompare(b.id || ""));
      setEdges(sorted);
    };

    yNodes.observe(updateNodesFromY);
    yEdges.observe(updateEdgesFromY);

    // Initial sync to local state
    updateNodesFromY();
    updateEdgesFromY();

    return () => {
      yNodes.unobserve(updateNodesFromY);
      yEdges.unobserve(updateEdgesFromY);
      // @ts-ignore both providers expose destroy
      webrtcProviderRef.current?.destroy?.();
      ydocRef.current = null;
      webrtcProviderRef.current = null;
    };
  }, [roomName, setNodes, setEdges, initialNodes, initialEdges, enabled]);

  const syncYMapFromArray = useCallback(
    <T extends { id: string }>(ymap: Y.Map<T>, arr: T[]) => {
      const nextIds = new Set(arr.map((i) => i.id));
      // Delete removed
      for (const key of Array.from(ymap.keys())) {
        if (!nextIds.has(key)) ymap.delete(key);
      }
      // Upsert all
      for (const item of arr) {
        ymap.set(item.id, item);
      }
    },
    []
  );

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    provider: webrtcProviderRef.current,
    ydoc: ydocRef.current,
    yNodesMap: yNodesMapRef.current,
    yEdgesMap: yEdgesMapRef.current,
    syncYMapFromArray,
    connectionError,
    isConnected,
  };
};
