import { act, renderHook } from "@testing-library/react";
import { MutableRefObject } from "react";
import * as Y from "yjs";
import type { Edge, Node } from "@xyflow/react";
import {
  HydrationStatus,
  useYjsDocumentHydration,
} from "../../useYjsDocumentHydration";

const createHydrationHarness = () => {
  const doc = new Y.Doc();
  const yNodes = doc.getMap<Node>("nodes");
  const yEdges = doc.getMap<Edge>("edges");

  const ydocRef: MutableRefObject<Y.Doc | null> = { current: doc };
  const yNodesMapRef: MutableRefObject<Y.Map<Node> | null> = {
    current: yNodes,
  };
  const yEdgesMapRef: MutableRefObject<Y.Map<Edge> | null> = {
    current: yEdges,
  };
  const serverVectorRef: MutableRefObject<Uint8Array | null> = {
    current: null,
  };
  const shouldSeedOnConnectRef: MutableRefObject<boolean> = {
    current: false,
  };
  const hydrationStatusRef: MutableRefObject<HydrationStatus> = {
    current: {
      phase: "pending",
      hasContent: false,
      mapCount: { nodes: 0, edges: 0 },
      observedNodeIds: [],
    },
  };

  const setConnectionError = jest.fn();
  const setConnectionState = jest.fn();

  return {
    doc,
    yNodes,
    yEdges,
    ydocRef,
    yNodesMapRef,
    yEdgesMapRef,
    serverVectorRef,
    shouldSeedOnConnectRef,
    hydrationStatusRef,
    setConnectionError,
    setConnectionState,
  };
};

describe("useYjsDocumentHydration seeding decisions", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("keeps seeding disabled when document already has content", async () => {
    const harness = createHydrationHarness();
    harness.yNodes.set("existing", {
      id: "existing",
      type: "title",
      data: { content: "Saved" },
      position: { x: 0, y: 0 },
    });

    const { result } = renderHook(() =>
      useYjsDocumentHydration({
        persistId: "doc-1",
        ydocRef: harness.ydocRef,
        yNodesMapRef: harness.yNodesMapRef,
        yEdgesMapRef: harness.yEdgesMapRef,
        serverVectorRef: harness.serverVectorRef,
        shouldSeedOnConnectRef: harness.shouldSeedOnConnectRef,
        hydrationStatusRef: harness.hydrationStatusRef,
        setConnectionError: harness.setConnectionError,
        setConnectionState: harness.setConnectionState,
      })
    );

    await act(async () => {
      await result.current.hydrateFromServer();
    });

    expect(harness.shouldSeedOnConnectRef.current).toBe(false);
    expect(harness.hydrationStatusRef.current).toEqual({
      phase: "completed",
      hasContent: true,
      mapCount: {
        nodes: 1,
        edges: 0,
      },
      observedNodeIds: ["existing"],
    });
  });

  it("disables seeding when server hydration provides content", async () => {
    const harness = createHydrationHarness();

    const originalFetch = globalThis.fetch;
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      if (typeof input === "string" && input.includes("/state?sv=")) {
        return new Response(new ArrayBuffer(0), { status: 204 });
      }
      harness.yNodes.set("server-node", {
        id: "server-node",
        type: "title",
        data: { content: "Server" },
        position: { x: 0, y: 0 },
      });
      return new Response(null, { status: 204 });
    });
    (globalThis as any).fetch = fetchMock;

    const { result } = renderHook(() =>
      useYjsDocumentHydration({
        persistId: "doc-2",
        ydocRef: harness.ydocRef,
        yNodesMapRef: harness.yNodesMapRef,
        yEdgesMapRef: harness.yEdgesMapRef,
        serverVectorRef: harness.serverVectorRef,
        shouldSeedOnConnectRef: harness.shouldSeedOnConnectRef,
        hydrationStatusRef: harness.hydrationStatusRef,
        setConnectionError: harness.setConnectionError,
        setConnectionState: harness.setConnectionState,
      })
    );

    await act(async () => {
      await result.current.hydrateFromServer();
    });

    expect(harness.shouldSeedOnConnectRef.current).toBe(false);
    expect(harness.hydrationStatusRef.current).toEqual({
      phase: "completed",
      hasContent: true,
      mapCount: {
        nodes: 1,
        edges: 0,
      },
      observedNodeIds: ["server-node"],
    });
    (globalThis as any).fetch = originalFetch;
  });

  it("enables seeding only after confirming no server content exists", async () => {
    const harness = createHydrationHarness();

    const originalFetch = globalThis.fetch;
    const fetchMock = jest.fn().mockImplementation(async (input: RequestInfo | URL) => {
      if (typeof input === "string" && input.includes("/state?sv=")) {
        return new Response(new ArrayBuffer(0), { status: 204 });
      }
      return new Response(new ArrayBuffer(0), {
        status: 204,
        headers: { "content-type": "application/octet-stream" },
      });
    });
    (globalThis as any).fetch = fetchMock;

    const { result } = renderHook(() =>
      useYjsDocumentHydration({
        persistId: "doc-3",
        ydocRef: harness.ydocRef,
        yNodesMapRef: harness.yNodesMapRef,
        yEdgesMapRef: harness.yEdgesMapRef,
        serverVectorRef: harness.serverVectorRef,
        shouldSeedOnConnectRef: harness.shouldSeedOnConnectRef,
        hydrationStatusRef: harness.hydrationStatusRef,
        setConnectionError: harness.setConnectionError,
        setConnectionState: harness.setConnectionState,
      })
    );

    await act(async () => {
      await result.current.hydrateFromServer();
    });

    expect(harness.shouldSeedOnConnectRef.current).toBe(true);
    expect(harness.hydrationStatusRef.current).toEqual({
      phase: "completed",
      hasContent: false,
      mapCount: {
        nodes: 0,
        edges: 0,
      },
      observedNodeIds: [],
    });
    (globalThis as any).fetch = originalFetch;
  });
});


