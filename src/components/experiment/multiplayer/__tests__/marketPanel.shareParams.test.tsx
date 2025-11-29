import React from 'react';
import { render, waitFor } from '@testing-library/react';

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
    view: { data: { prices: {}, totals: {}, userHoldings: {} }, refetch: jest.fn() },
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

const setNodesMock = jest.fn((updater: any) => {
  const prev = [{ id: 'a', type: 'point', selected: false }];
  return typeof updater === 'function' ? updater(prev) : updater;
});

const setSelectedEdgeId = jest.fn();
const setNodesForEdge = jest.fn((updater: any) => {
  const prev = [{ id: 'a', type: 'point', selected: false }];
  return typeof updater === 'function' ? updater(prev) : updater;
});

let yjsState: {
  nodes: any[];
  edges: any[];
  setNodes: any;
} = {
  nodes: [{ id: 'a', type: 'point', selected: false }],
  edges: [{ id: 'e1', type: 'support', source: 'a', target: 'b', data: {} }],
  setNodes: setNodesMock,
};

jest.mock('@/hooks/experiment/multiplayer/useYjsMultiplayer', () => ({
  useYjsMultiplayer: () => ({
    nodes: yjsState.nodes,
    edges: yjsState.edges,
    setNodes: yjsState.setNodes,
    setEdges: jest.fn(),
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
    setSelectedEdgeId,
  }),
}));

jest.mock('@/hooks/experiment/multiplayer/useNodeHelpers', () => ({
  useNodeHelpers: () => ({ getNodeCenter: () => ({ x: 0, y: 0 }), getEdgeMidpoint: () => ({ x: 0, y: 0 }) }),
}));

jest.mock('@/hooks/experiment/multiplayer/useEdgeTypeManager', () => ({
  useEdgeTypeManager: () => ({ preferredEdgeTypeRef: { current: 'support' }, updateEdgeType: jest.fn() }),
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


jest.mock('@/hooks/experiment/multiplayer/useNodeDragHandlers', () => ({
  useNodeDragHandlers: () => ({ handleNodeDragStart: jest.fn(), handleNodeDragStop: jest.fn() }),
}));

jest.mock('@/hooks/experiment/multiplayer/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: () => {},
}));

jest.mock('@/components/experiment/multiplayer/GraphUpdater', () => ({
  GraphUpdater: () => null,
}));

const { MultiplayerBoardContent } = require('@/components/experiment/multiplayer/MultiplayerBoardContent');

describe('market panel share params', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    yjsState = {
      nodes: [{ id: 'a', type: 'point', selected: false }],
      edges: [{ id: 'e1', type: 'support', source: 'a', target: 'b', data: {} }],
      setNodes: setNodesMock,
    };
  });

  it('selects a node from URL param when it exists', async () => {
    Object.defineProperty(window, 'location', {
      value: new URL('http://localhost/?node=a'),
      writable: true,
    });

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
        selectMode={true}
      />
    );

    await waitFor(() => {
      expect(setNodesMock).toHaveBeenCalled();
    });

    const updateFn = setNodesMock.mock.calls[0][0];
    const updated = updateFn([{ id: 'a', type: 'point', selected: false }]);
    expect(updated.find((n: any) => n.id === 'a')?.selected).toBe(true);
    expect(setSelectedEdgeId).toHaveBeenCalledWith(null);
  });

  it('ignores node param when not in graph', async () => {
    Object.defineProperty(window, 'location', {
      value: new URL('http://localhost/?node=missing'),
      writable: true,
    });

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
        selectMode={true}
      />
    );

    await waitFor(() => {
      expect(setNodesMock).toHaveBeenCalled();
    });

    const updateFn = setNodesMock.mock.calls[0][0];
    const updated = updateFn([{ id: 'a', type: 'point', selected: false }]);
    expect(updated.every((n: any) => !n.selected)).toBe(true);
  });

  it('selects an edge from URL param when it exists', async () => {
    Object.defineProperty(window, 'location', {
      value: new URL('http://localhost/?edge=e1'),
      writable: true,
    });
    yjsState = {
      nodes: [{ id: 'a', type: 'point', selected: true }],
      edges: [{ id: 'e1', type: 'support', source: 'a', target: 'b', data: {} }],
      setNodes: setNodesForEdge,
    };

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
        selectMode={true}
      />
    );

    await waitFor(() => {
      expect(setSelectedEdgeId).toHaveBeenCalledWith('e1');
      expect(setNodesForEdge).toHaveBeenCalled();
    });
  });
});
