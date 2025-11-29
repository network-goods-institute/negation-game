import React from 'react';
import { render } from '@testing-library/react';
import { MultiplayerBoardContent } from '@/components/experiment/multiplayer/MultiplayerBoardContent';

jest.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: any) => <>{children}</>,
}));

let lastGraphCanvasProps: any = null;
jest.mock('@/components/experiment/multiplayer/GraphCanvas', () => ({
  GraphCanvas: (props: any) => { lastGraphCanvasProps = props; return null; },
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

jest.mock('@/hooks/experiment/multiplayer/useYjsMultiplayer', () => ({
  useYjsMultiplayer: () => ({
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
    isConnected: true,
    connectionState: 'connected',
    hasSyncedOnce: true,
    isReady: true,
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
    connectMode: true,
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



jest.mock('@/hooks/experiment/multiplayer/useNodeDragHandlers', () => ({
  useNodeDragHandlers: () => ({ handleNodeDragStart: jest.fn(), handleNodeDragStop: jest.fn() }),
}));

jest.mock('@/hooks/experiment/multiplayer/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: () => {},
}));

describe('effective selectMode under connect mode', () => {
  it('disables selection when connectMode is true', () => {
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
        selectMode={true}
      />
    );

    expect(lastGraphCanvasProps).toBeTruthy();
    expect(lastGraphCanvasProps.selectMode).toBe(false);
  });
});
