import React from 'react';
import { render, screen } from '@testing-library/react';
import { MultiplayerBoardContent } from '@/components/experiment/multiplayer/MultiplayerBoardContent';

jest.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: any) => <>{children}</>,
}));

let graphCanvasRenderCount = 0;
jest.mock('@/components/experiment/multiplayer/GraphCanvas', () => ({
  GraphCanvas: () => {
    graphCanvasRenderCount += 1;
    return null;
  },
}));

jest.mock('@/components/experiment/multiplayer/ToolsBar', () => ({
  ToolsBar: () => null,
}));

jest.mock('@/components/experiment/multiplayer/MultiplayerHeader', () => ({
  MultiplayerHeader: () => null,
}));

jest.mock('@/components/experiment/multiplayer/UndoHintOverlay', () => ({
  UndoHintOverlay: () => null,
}));

jest.mock('@/components/experiment/multiplayer/TypeSelectorDropdown', () => ({
  TypeSelectorDropdown: () => null,
}));

jest.mock('@/components/experiment/multiplayer/GraphUpdater', () => ({
  GraphUpdater: () => null,
}));

jest.mock('@/components/experiment/multiplayer/GraphContext', () => ({
  GraphProvider: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/components/experiment/multiplayer/BoardLoading', () => ({
  BoardLoading: () => <div data-testid="board-loading" />,
}));

jest.mock('@/hooks/experiment/multiplayer/useInitialGraph', () => ({
  useInitialGraph: () => ({ nodes: [], edges: [] }),
}));

const baseYjsReturn = {
  nodes: [],
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
  connectionState: 'connecting',
  hasSyncedOnce: false,
  isReady: false,
  isSaving: false,
  forceSave: jest.fn(),
  interruptSave: jest.fn(),
  nextSaveTime: null,
  resyncNow: jest.fn(),
  restartProviderWithNewToken: jest.fn(),
  undo: jest.fn(),
  redo: jest.fn(),
  stopCapturing: jest.fn(),
  canUndo: false,
  canRedo: false,
};

let mockReady = { isConnected: false, hasSyncedOnce: false, isReady: false };
jest.mock('@/hooks/experiment/multiplayer/useYjsMultiplayer', () => ({
  useYjsMultiplayer: () => ({
    ...baseYjsReturn,
    isConnected: mockReady.isConnected,
    connectionState: mockReady.isConnected ? 'connected' : 'connecting',
    hasSyncedOnce: mockReady.hasSyncedOnce,
    isReady: mockReady.isReady,
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

jest.mock('@/hooks/experiment/multiplayer/useMindchangeActions', () => ({
  useMindchangeActions: () => ({ setMindchange: jest.fn(), getMindchangeBreakdown: jest.fn() }),
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

describe('Board loading gating', () => {
  beforeEach(() => {
    graphCanvasRenderCount = 0;
  });

  it('renders BoardLoading until ready', () => {
    mockReady = { isConnected: false, hasSyncedOnce: false, isReady: false };
    render(
      <MultiplayerBoardContent
        authenticated={true}
        userId="u1"
        username="alice"
        userColor="#000"
        roomName="room"
        resolvedId="doc"
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

    expect(screen.getByTestId('board-loading')).toBeInTheDocument();
    expect(graphCanvasRenderCount).toBe(0);
  });

  it('renders board when ready', async () => {
    mockReady = { isConnected: true, hasSyncedOnce: true, isReady: true };

    render(
      <MultiplayerBoardContent
        authenticated={true}
        userId="u1"
        username="alice"
        userColor="#000"
        roomName="room"
        resolvedId="doc"
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

    expect(screen.queryByTestId('board-loading')).toBeNull();
    expect(graphCanvasRenderCount).toBe(1);
  });
});


