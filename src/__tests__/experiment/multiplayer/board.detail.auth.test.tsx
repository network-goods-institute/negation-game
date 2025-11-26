import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import MultiplayerBoardDetailPage from "@/app/experiment/rationale/multiplayer/[id]/page";
import { QueryClientProvider } from "@/components/providers/QueryClientProvider";

jest.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ ready: true, authenticated: false, user: null, login: jest.fn() }),
}));

jest.mock("@/components/auth/AuthGate", () => ({
  AuthGate: ({ onLogin }: any) => <div><div>Login Required</div><button onClick={onLogin}>Login</button></div>,
}));

jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "abc" }),
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));

jest.mock("@xyflow/react", () => ({
  ReactFlowProvider: ({ children }: any) => <>{children}</>,
}));

jest.mock("@/hooks/experiment/multiplayer/useInitialGraph", () => ({
  useInitialGraph: () => ({ nodes: [{ id: "n1", type: "point", position: { x: 0, y: 0 }, data: {} }], edges: [] }),
}));

jest.mock("@/hooks/experiment/multiplayer/useConnectionMode", () => ({
  useConnectionMode: () => ({
    connectMode: false,
    setConnectMode: jest.fn(),
    connectAnchorId: null,
    setConnectAnchorId: jest.fn(),
    connectAnchorRef: { current: null },
    connectCursor: null,
    setConnectCursor: jest.fn(),
    clearConnect: jest.fn(),
    cancelConnect: jest.fn(),
  }),
}));

jest.mock("@/hooks/experiment/multiplayer/useEdgeSelection", () => ({
  useEdgeSelection: () => ({
    hoveredEdgeId: null,
    setHoveredEdgeId: jest.fn(),
    selectedEdgeId: null,
    setSelectedEdgeId: jest.fn(),
    revealEdgeTemporarily: jest.fn(),
  }),
}));

jest.mock("@/hooks/experiment/multiplayer/useUserColor", () => ({
  useUserColor: () => "#000000",
}));

jest.mock("@/hooks/experiment/multiplayer/useAnonymousId", () => ({
  useAnonymousId: () => "anon-1234",
}));

jest.mock("@/hooks/experiment/multiplayer/useNodeHelpers", () => ({
  useNodeHelpers: () => ({
    getNodeCenter: () => ({ x: 0, y: 0 }),
    getEdgeMidpoint: () => ({ x: 0, y: 0 }),
  }),
}));

jest.mock("@/hooks/experiment/multiplayer/useEdgeTypeManager", () => ({
  useEdgeTypeManager: () => ({
    preferredEdgeTypeRef: { current: "support" },
    updateEdgeType: jest.fn(),
  }),
}));

jest.mock("@/hooks/experiment/multiplayer/useMultiplayerTitle", () => ({
  useMultiplayerTitle: () => ({
    dbTitle: "",
    ownerId: null,
    titleEditingUser: null,
    loadDbTitle: jest.fn(),
    handleTitleChange: jest.fn(),
    handleTitleEditingStart: jest.fn(),
    handleTitleEditingStop: jest.fn(),
    handleTitleSavingStart: jest.fn(),
    handleTitleSavingStop: jest.fn(),
    handleTitleCountdownStart: jest.fn(),
    handleTitleCountdownStop: jest.fn(),
  }),
}));

jest.mock("@/hooks/experiment/multiplayer/useNodeDragHandlers", () => ({
  useNodeDragHandlers: () => ({
    handleNodeDragStart: jest.fn(),
    handleNodeDragStop: jest.fn(),
  }),
}));

jest.mock("@/hooks/experiment/multiplayer/useMultiplayerCursors", () => ({
  useMultiplayerCursors: () => ({}),
}));

jest.mock("@/hooks/experiment/multiplayer/useMultiplayerEditing", () => ({
  useMultiplayerEditing: () => ({
    startEditing: jest.fn(),
    stopEditing: jest.fn(),
    getEditorsForNode: () => [],
    lockNode: jest.fn(),
    unlockNode: jest.fn(),
    isLockedForMe: () => false,
    getLockOwner: () => null,
    markNodeActive: jest.fn(),
    locks: new Map(),
  }),
}));

jest.mock("@/hooks/experiment/multiplayer/useWriteAccess", () => ({
  useWriteAccess: () => ({ canWrite: false }),
}));

jest.mock("@/hooks/experiment/multiplayer/useWritableSync", () => ({
  useWritableSync: () => true,
}));

jest.mock("@/hooks/experiment/multiplayer/useGraphOperations", () => ({
  useGraphOperations: () => ({
    updateNodeContent: jest.fn(),
    updateNodeHidden: jest.fn(),
    updateNodePosition: jest.fn(),
    updateNodeFavor: jest.fn(),
    addPointBelow: jest.fn(),
    inversePair: jest.fn(),
    deleteNode: jest.fn(),
    addObjectionForEdge: jest.fn(),
    updateEdgeType: jest.fn(),
    updateEdgeAnchorPosition: jest.fn(),
    ensureEdgeAnchor: jest.fn(),
    addNodeAtPosition: jest.fn(() => "new-node"),
    updateNodeType: jest.fn(),
    deleteInversePair: jest.fn(),
    duplicateNodeWithConnections: jest.fn(),
  }),
}));

jest.mock("@/hooks/experiment/multiplayer/useConnectionHandlers", () => ({
  useConnectionHandlers: () => ({
    beginConnectFromNode: jest.fn(),
    beginConnectFromEdge: jest.fn(),
    completeConnectToNode: jest.fn(),
    completeConnectToEdge: jest.fn(),
    cancelConnect: jest.fn(),
  }),
}));

jest.mock("@/hooks/experiment/multiplayer/usePairHeights", () => ({
  usePairHeights: () => ({
    pairNodeHeights: {},
    pairHeights: {},
    setPairNodeHeight: jest.fn(),
    commitGroupLayout: jest.fn(),
  }),
}));

jest.mock("@/hooks/experiment/multiplayer/useKeyboardShortcuts", () => ({
  useKeyboardShortcuts: () => {},
}));

jest.mock("@/hooks/experiment/multiplayer/useYjsMultiplayer", () => ({
  useYjsMultiplayer: () => ({
    nodes: [{ id: "n1" }],
    edges: [],
    setNodes: jest.fn(),
    setEdges: jest.fn(),
    provider: null,
    ydoc: null,
    yNodesMap: null,
    yEdgesMap: null,
    yTextMap: null,
    yMetaMap: null,
    syncYMapFromArray: jest.fn(),
    connectionError: null,
    isConnected: false,
    connectionState: "initializing",
    isSaving: false,
    forceSave: jest.fn(),
    interruptSave: jest.fn(),
    nextSaveTime: null,
    resyncNow: jest.fn(),
    undo: jest.fn(),
    redo: jest.fn(),
    stopCapturing: jest.fn(),
    canUndo: false,
    canRedo: false,
    restartProviderWithNewToken: jest.fn(),
  }),
}));

jest.mock("@/components/experiment/multiplayer/MultiplayerHeader", () => ({
  MultiplayerHeader: () => null,
}));

jest.mock("@/components/experiment/multiplayer/ToolsBar", () => ({
  ToolsBar: () => null,
}));

jest.mock("@/components/experiment/multiplayer/GraphCanvas", () => ({
  GraphCanvas: () => null,
}));

jest.mock("@/components/experiment/multiplayer/UndoHintOverlay", () => ({
  UndoHintOverlay: () => null,
}));

// Force production gating in this test so unauthenticated users see AuthGate
jest.mock("@/utils/hosts", () => ({
  isProductionHostname: () => true,
  isNonProdHostname: () => false,
  isProductionEnvironment: () => true,
  isProductionRequest: () => true,
}));

jest.mock("@/components/experiment/multiplayer/GraphContext", () => ({
  GraphProvider: ({ children }: any) => <>{children}</>,
}));

jest.mock("@/components/experiment/multiplayer/GraphUpdater", () => ({
  GraphUpdater: () => null,
}));

jest.mock("@/components/experiment/multiplayer/TypeSelectorDropdown", () => ({
  TypeSelectorDropdown: () => null,
}));

jest.mock("@/utils/hosts/syncPaths", () => ({
  buildRationaleDetailPath: (_: string, __: string, ___?: string) => "/experiment/rationale/multiplayer/abc",
}));

jest.mock("@/actions/experimental/rationales", () => ({
  recordOpen: jest.fn(async () => undefined),
}));

describe("Multiplayer board detail auth gating", () => {
  beforeAll(() => {
    // @ts-ignore
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ id: "abc", slug: null }),
      statusText: "OK",
    })) as any;
  });

  it("does not render login prompt when unauthenticated (read-only view allowed)", async () => {
    render(
      <QueryClientProvider>
        <MultiplayerBoardDetailPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Login Required/i)).not.toBeInTheDocument();
    });
  });
});
