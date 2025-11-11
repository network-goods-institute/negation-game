import React from 'react';
import { render, screen } from '@testing-library/react';
import { MultiplayerBoardContent } from '@/components/experiment/multiplayer/MultiplayerBoardContent';

jest.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/components/experiment/multiplayer/GraphCanvas', () => ({
  GraphCanvas: () => null,
}));

jest.mock('@/components/experiment/multiplayer/ToolsBar', () => ({
  ToolsBar: () => null,
}));

let lastHeaderProps: any = null;
jest.mock('@/components/experiment/multiplayer/MultiplayerHeader', () => ({
  MultiplayerHeader: (props: any) => { lastHeaderProps = props; return <div />; },
}));

jest.mock('@/components/experiment/multiplayer/UndoHintOverlay', () => ({
  UndoHintOverlay: () => null,
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

describe('read-only grace on brief disconnects', () => {
  beforeEach(() => {
    lastHeaderProps = null;
  });

  it('keeps header connected and board editable during grace when isConnected=false but connectedWithGrace=true', () => {
    jest.doMock('@/hooks/experiment/multiplayer/useYjsMultiplayer', () => ({
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
        isConnected: false,
        connectedWithGrace: true,
        connectionState: 'connecting',
        hasSyncedOnce: true,
        isReady: true,
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
      }),
    }));
    // Re-import after mocking
    const { MultiplayerBoardContent: Component } = require('@/components/experiment/multiplayer/MultiplayerBoardContent');

    render(
      <Component
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

    expect(lastHeaderProps).toBeTruthy();
    // Header should be told it's connected during grace
    expect(lastHeaderProps.isConnected).toBe(true);
    // And not in proxyMode (editable)
    expect(lastHeaderProps.proxyMode).toBe(false);
  });
});


