import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { MultiplayerBoardContent } from '@/components/experiment/multiplayer/MultiplayerBoardContent';

jest.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/components/experiment/multiplayer/MultiplayerHeader', () => ({
  MultiplayerHeader: () => null,
}));

jest.mock('@/components/experiment/multiplayer/ToolsBar', () => ({
  ToolsBar: () => null,
}));

jest.mock('@/components/experiment/multiplayer/GraphCanvas', () => ({
  GraphCanvas: () => null,
}));

jest.mock('@/components/experiment/multiplayer/TypeSelectorDropdown', () => ({
  TypeSelectorDropdown: () => null,
}));

jest.mock('@/components/experiment/multiplayer/UndoHintOverlay', () => ({
  UndoHintOverlay: () => null,
}));

jest.mock('@/hooks/experiment/multiplayer/useInitialGraph', () => ({
  useInitialGraph: () => ({ nodes: [], edges: [] }),
}));

jest.mock('@/hooks/market/useMarket', () => ({
  useMarket: () => ({
    view: { data: { prices: null, totals: null, userHoldings: null }, refetch: jest.fn() },
    buyShares: { mutate: jest.fn() },
    buyAmount: { mutate: jest.fn() },
  }),
}));

const yMeta = (() => {
  const store = new Map<string, any>();
  return {
    store,
    get: (k: string) => store.get(k),
    set: jest.fn((k: string, v: any) => { store.set(k, v); }),
    delete: jest.fn(),
  } as any;
})();

const setEdgesMock = jest.fn((updater: any) => {
  const prev = [{ id: 'e1', type: 'support', source: 'a', target: 'b', data: {} }];
  const next = typeof updater === 'function' ? updater(prev) : updater;
  return next;
});

jest.mock('@/hooks/experiment/multiplayer/useYjsMultiplayer', () => ({
  useYjsMultiplayer: () => ({
    nodes: [{ id: 'a' }, { id: 'b' }],
    edges: [{ id: 'e1', type: 'support', source: 'a', target: 'b', data: {} }],
    setNodes: jest.fn(),
    setEdges: setEdgesMock,
    provider: null,
    ydoc: { transact: (fn: any) => fn() },
    yNodesMap: null,
    yEdgesMap: null,
    yTextMap: null,
    yMetaMap: yMeta,
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
    canUndo: false,
    canRedo: false,
  }),
}));

jest.mock('@/hooks/experiment/multiplayer/useWriteAccess', () => ({
  useWriteAccess: () => ({ canWrite: true }),
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
  }),
}));

jest.mock('@/hooks/experiment/multiplayer/useEdgeSelection', () => ({
  useEdgeSelection: () => ({
    hoveredEdgeId: null,
    setHoveredEdgeId: jest.fn(),
    selectedEdgeId: null,
    setSelectedEdgeId: jest.fn(),
  }),
}));

jest.mock('@/hooks/experiment/multiplayer/useNodeHelpers', () => ({
  useNodeHelpers: () => ({ getNodeCenter: () => ({ x: 0, y: 0 }), getEdgeMidpoint: () => ({ x: 0, y: 0 }) }),
}));

const updateEdgeTypeSpy = jest.fn();
jest.mock('@/hooks/experiment/multiplayer/useEdgeTypeManager', () => ({
  useEdgeTypeManager: () => ({ preferredEdgeTypeRef: { current: 'support' }, updateEdgeType: (id: string, t: any) => updateEdgeTypeSpy(id, t) }),
}));

jest.mock('@/hooks/experiment/multiplayer/useMultiplayerCursors', () => ({
  useMultiplayerCursors: () => new Map(),
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

jest.mock('@/hooks/experiment/multiplayer/useMindchangeActions', () => ({
  useMindchangeActions: () => ({ setMindchange: jest.fn(), getMindchangeBreakdown: jest.fn() }),
}));

jest.mock('@/hooks/experiment/multiplayer/useMultiplayerTitle', () => ({
  useMultiplayerTitle: () => ({
    dbTitle: '',
    titleEditingUser: null,
    handleTitleChange: jest.fn(),
    handleTitleEditingStart: jest.fn(),
    handleTitleEditingStop: jest.fn(),
    handleTitleSavingStart: jest.fn(),
    handleTitleSavingStop: jest.fn(),
    handleTitleCountdownStart: jest.fn(),
    handleTitleCountdownStop: jest.fn(),
  }),
}));

jest.mock('@/hooks/experiment/multiplayer/usePairHeights', () => ({
  usePairHeights: () => ({ pairHeights: {}, setPairNodeHeight: jest.fn(), commitGroupLayout: jest.fn() }),
}));

jest.mock('@/hooks/experiment/multiplayer/useNodeDragHandlers', () => ({
  useNodeDragHandlers: () => ({ handleNodeDragStart: jest.fn(), handleNodeDragStop: jest.fn() }),
}));

jest.mock('@/hooks/experiment/multiplayer/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: () => {},
}));

const mockGetMindchangeAverages = jest.fn(async () => ({
  e1: { forward: 20, backward: 5, forwardCount: 2, backwardCount: 1 },
}));

jest.mock('@/actions/experimental/mindchange', () => ({
  getMindchangeAveragesForEdges: (...args: any[]) => (mockGetMindchangeAverages as any)(...args),
  deleteMindchangeForEdge: jest.fn(async () => undefined),
}));

jest.mock('@/components/experiment/multiplayer/GraphUpdater', () => {
  const React = require('react');
  const { useGraphActions } = require('@/components/experiment/multiplayer/GraphContext');
  return {
    GraphUpdater: () => {
      const graph = useGraphActions();
      React.useEffect(() => {
        graph.updateEdgeType?.('e1', 'negation');
      }, [graph]);
      return null;
    },
  };
});

describe('edge type switch refreshes mindchange circles', () => {
  const OLD_ENV = process.env as any;
  beforeEach(() => {
    jest.resetModules();
    (process as any).env = { ...OLD_ENV, NEXT_PUBLIC_ENABLE_MINDCHANGE: 'true' };
  });
  afterAll(() => {
    (process as any).env = OLD_ENV;
  });
  it('fetches averages and updates yMetaMap on support->negation', async () => {
    render(
      <MultiplayerBoardContent
        authenticated={true}
        userId="u1"
        username="alice"
        userColor="#000"
        roomName="room"
        resolvedId="doc1"
        routeParams={{}}
        grabMode={false}
        setGrabMode={() => {}}
        perfBoost={false}
        setPerfBoost={() => {}}
        mindchangeSelectMode={false}
        setMindchangeSelectMode={() => {}}
        mindchangeEdgeId={null}
        setMindchangeEdgeId={() => {}}
        mindchangeNextDir={null}
        setMindchangeNextDir={() => {}}
        selectMode={true}
      />
    );

    await waitFor(() => {
      expect(updateEdgeTypeSpy).toHaveBeenCalledWith('e1', 'negation');
    });

    await waitFor(() => {
      expect(mockGetMindchangeAverages).toHaveBeenCalledWith('doc1', ['e1']);
      expect(yMeta.set).toHaveBeenCalledWith('mindchange:e1', expect.objectContaining({ forward: 20 }));
    });

    expect(setEdgesMock).toHaveBeenCalled();
  });
});
