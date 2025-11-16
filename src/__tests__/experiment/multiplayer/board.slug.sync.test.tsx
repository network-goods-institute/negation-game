import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@/components/providers/QueryClientProvider';

const makeYMapStub = () => {
  const listeners = new Set<() => void>();
  const map = new Map<string, any>();
  return {
    get: (k: string) => map.get(k),
    set: (k: string, v: any) => { map.set(k, v); listeners.forEach((fn) => fn()); },
    observe: (fn: () => void) => { listeners.add(fn); },
    unobserve: (fn: () => void) => {
      const next = Array.from(listeners).filter((l) => l !== fn);
      listeners.clear();
      for (const l of next) listeners.add(l);
    },
  } as any;
};

jest.mock('@privy-io/react-auth', () => ({
  usePrivy: () => ({ ready: true, authenticated: true, user: { id: 'u1' }, login: jest.fn() }),
}));

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'm-123' }),
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));

jest.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/hooks/experiment/multiplayer/useInitialGraph', () => ({
  useInitialGraph: () => ({ nodes: [{ id: 'n1', type: 'point', position: { x: 0, y: 0 }, data: {} }], edges: [] }),
}));

jest.mock('@/hooks/experiment/multiplayer/useConnectionMode', () => ({
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

jest.mock('@/hooks/experiment/multiplayer/useEdgeSelection', () => ({
  useEdgeSelection: () => ({
    hoveredEdgeId: null,
    setHoveredEdgeId: jest.fn(),
    selectedEdgeId: null,
    setSelectedEdgeId: jest.fn(),
    revealEdgeTemporarily: jest.fn(),
  }),
}));

jest.mock('@/hooks/experiment/multiplayer/useUserColor', () => ({
  useUserColor: () => '#000000',
}));

jest.mock('@/hooks/experiment/multiplayer/useAnonymousId', () => ({
  useAnonymousId: () => 'anon-1234',
}));

jest.mock('@/hooks/experiment/multiplayer/useNodeHelpers', () => ({
  useNodeHelpers: () => ({ getNodeCenter: () => ({ x: 0, y: 0 }), getEdgeMidpoint: () => ({ x: 0, y: 0 }) }),
}));

jest.mock('@/hooks/experiment/multiplayer/useEdgeTypeManager', () => ({
  useEdgeTypeManager: () => ({ preferredEdgeTypeRef: { current: 'support' }, updateEdgeType: jest.fn() }),
}));

jest.mock('@/hooks/experiment/multiplayer/useMultiplayerTitle', () => ({
  useMultiplayerTitle: () => ({
    dbTitle: '',
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

jest.mock('@/hooks/experiment/multiplayer/useNodeDragHandlers', () => ({
  useNodeDragHandlers: () => ({ handleNodeDragStart: jest.fn(), handleNodeDragStop: jest.fn() }),
}));

jest.mock('@/hooks/experiment/multiplayer/useMultiplayerCursors', () => ({
  useMultiplayerCursors: () => ({}),
}));

jest.mock('@/hooks/experiment/multiplayer/useMultiplayerEditing', () => ({
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

jest.mock('@/hooks/experiment/multiplayer/useWriteAccess', () => ({
  useWriteAccess: () => ({ canWrite: true }),
}));

jest.mock('@/hooks/experiment/multiplayer/useWritableSync', () => ({
  useWritableSync: () => true,
}));

jest.mock('@/hooks/experiment/multiplayer/useGraphOperations', () => ({
  useGraphOperations: () => ({
    updateNodeContent: jest.fn(),
    updateNodeHidden: jest.fn(),
    updateNodePosition: jest.fn(),
    updateNodeFavor: jest.fn(),
    addPointBelow: jest.fn(),
    preferredEdgeType: 'support',
    createInversePair: jest.fn(),
    deleteNode: jest.fn(),
    startEditingNode: jest.fn(),
    stopEditingNode: jest.fn(),
    getEditorsForNode: () => [],
    isLockedForMe: () => false,
    getLockOwner: () => null,
    isAnyNodeEditing: false,
    clearNodeSelection: jest.fn(),
    beginConnectFromNode: jest.fn(),
    beginConnectFromEdge: jest.fn(),
    completeConnectToNode: jest.fn(),
    completeConnectToEdge: jest.fn(),
    cancelConnect: jest.fn(),
    addObjectionForEdge: jest.fn(),
    updateEdgeRelevance: jest.fn(),
    updateEdgeType: jest.fn(),
    updateEdgeAnchorPosition: jest.fn(),
    ensureEdgeAnchor: jest.fn(),
    addNodeAtPosition: jest.fn(() => 'new-node'),
    updateNodeType: jest.fn(),
    deleteInversePair: jest.fn(),
    duplicateNodeWithConnections: jest.fn(),
    setPairNodeHeight: jest.fn(),
    pairHeights: {},
  }),
}));

jest.mock('@/hooks/experiment/multiplayer/useConnectionHandlers', () => ({
  useConnectionHandlers: () => ({
    beginConnectFromNode: jest.fn(),
    beginConnectFromEdge: jest.fn(),
    completeConnectToNode: jest.fn(),
    completeConnectToEdge: jest.fn(),
    cancelConnect: jest.fn(),
  }),
}));

jest.mock('@/components/experiment/multiplayer/GraphContext', () => ({
  GraphProvider: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/components/experiment/multiplayer/GraphUpdater', () => ({
  GraphUpdater: () => null,
}));

jest.mock('@/components/experiment/multiplayer/TypeSelectorDropdown', () => ({
  TypeSelectorDropdown: () => null,
}));

jest.mock('@/components/experiment/multiplayer/ToolsBar', () => ({
  ToolsBar: () => null,
}));

jest.mock('@/components/experiment/multiplayer/GraphCanvas', () => ({
  GraphCanvas: () => null,
}));

jest.mock('@/components/experiment/multiplayer/MultiplayerHeader', () => ({
  MultiplayerHeader: () => null,
}));

describe('URL updates when slug changes via peers', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: 'm-123', slug: null }), statusText: 'OK' })) as any;
  });

  it('rewrites URL when yMetaMap slug changes', async () => {
    const yMap = makeYMapStub();
    jest.doMock('@/hooks/experiment/multiplayer/useYjsMultiplayer', () => ({
      useYjsMultiplayer: () => ({
        nodes: [{ id: 'n1' }],
        edges: [],
        setNodes: jest.fn(),
        setEdges: jest.fn(),
        provider: null,
        ydoc: { transact: (fn: Function) => fn() },
        yNodesMap: null,
        yEdgesMap: null,
        yTextMap: null,
        yMetaMap: yMap,
        syncYMapFromArray: jest.fn(),
        connectionError: null,
        isConnected: true,
        connectionState: 'connected',
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

    const spy = jest.spyOn(window.history, 'replaceState');

    const Page = require('@/app/experiment/rationale/multiplayer/[id]/page').default;

    render(
      <QueryClientProvider>
        <Page />
      </QueryClientProvider>
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    yMap.set('slug', 'peer-slug');

    await waitFor(() => {
      expect(window.history.replaceState).toHaveBeenCalled();
      const last = spy.mock.calls.at(-1) as any[];
      expect(last?.[2]).toContain('peer-slug');
    });
  });
});
