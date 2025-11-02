import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';

jest.mock('@xyflow/react', () => {
  const actual = jest.requireActual('@xyflow/react');
  return {
    ...actual,
    useStore: jest.fn(),
    useReactFlow: jest.fn(() => ({ getEdges: jest.fn(), getNodes: jest.fn() })),
    Position: { Top: 'top', Bottom: 'bottom' },
  };
});

jest.mock('../GraphContext', () => ({
  useGraphActions: () => ({
    updateNodeContent: jest.fn(),
    updateNodeHidden: jest.fn(),
    updateNodeFavor: jest.fn(),
    addPointBelow: jest.fn(),
    createInversePair: jest.fn(),
    deleteInversePair: jest.fn(),
    isConnectingFromNodeId: null,
    deleteNode: jest.fn(),
    startEditingNode: jest.fn(),
    stopEditingNode: jest.fn(),
    isLockedForMe: () => false,
    getLockOwner: () => null,
    setPairNodeHeight: jest.fn(),
    grabMode: false,
  })
}));

jest.mock('../common/NodeShell', () => ({
  NodeShell: ({ children }: any) => <div data-testid="nodeshell">{children}</div>,
}));

jest.mock('../common/useNodeChrome', () => ({
  useNodeChrome: () => ({
    editable: {
      isEditing: false,
      value: 'Hello',
      contentRef: { current: null },
      wrapperRef: { current: null },
      onClick: jest.fn(),
      onInput: jest.fn(),
      onPaste: jest.fn(),
      onKeyDown: jest.fn(),
      onBlur: jest.fn(),
      onFocus: jest.fn(),
      onContentMouseDown: jest.fn(),
      onContentMouseMove: jest.fn(),
      onContentMouseLeave: jest.fn(),
      onContentMouseUp: jest.fn(),
      isConnectMode: false,
    },
    hover: {
      hovered: false,
      onMouseEnter: jest.fn(),
      onMouseLeave: jest.fn(),
    },
    pill: {
      handleMouseEnter: jest.fn(),
      handleMouseLeave: jest.fn(),
      shouldShowPill: true,
      hideNow: jest.fn(),
      handleMouseLeavePill: jest.fn(),
    },
    connect: { onClick: jest.fn() },
    innerScaleStyle: {},
    isActive: false,
    cursorClass: '',
  }),
}));

jest.mock('../common/useFavorOpacity', () => ({
  useFavorOpacity: () => 1,
}));

jest.mock('../common/useContextMenuHandler', () => ({
  useContextMenuHandler: () => jest.fn(),
}));

jest.mock('../common/useForceHidePills', () => ({
  useForceHidePills: () => jest.fn(),
}));

jest.mock('../PerformanceContext', () => ({
  usePerformanceMode: () => ({ perfMode: false, setPerfMode: jest.fn() }),
}));

jest.mock('../common/FavorSelector', () => ({
  FavorSelector: () => <div data-testid="favor" />,
}));

jest.mock('../common/NodeActionPill', () => ({
  NodeActionPill: () => <div data-testid="pill" />,
}));

jest.mock('../common/LockIndicator', () => ({
  LockIndicator: () => <div data-testid="lock" />,
}));

jest.mock('../common/ContextMenu', () => ({
  ContextMenu: () => null,
}));

import { useStore } from '@xyflow/react';
import { PointNode } from '../PointNode';

describe('PointNode dragging UI behavior', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('shows favor and pill when not dragging', () => {
    (useStore as jest.Mock).mockImplementation((selector: any) => {
      const map = new Map();
      map.set('node-1', { id: 'node-1', dragging: false });
      return selector({ nodeInternals: map, nodes: [] });
    });

    const { rerender } = render(
      <PointNode
        data={{ content: 'C', createdAt: Date.now(), favor: 3, hidden: false }}
        id="node-1"
        selected={true}
      />
    );

    // Re-render to pass the initial just-selected suppression frame
    rerender(
      <PointNode
        data={{ content: 'C', createdAt: Date.now(), favor: 3, hidden: false }}
        id="node-1"
        selected={true}
      />
    );

    expect(screen.queryByTestId('favor')).toBeInTheDocument();
    expect(screen.queryByTestId('pill')).toBeInTheDocument();
  });

  it('hides favor and pill when dragging', () => {
    (useStore as jest.Mock).mockImplementation((selector: any) => {
      const map = new Map();
      map.set('node-1', { id: 'node-1', dragging: true });
      return selector({ nodeInternals: map, nodes: [] });
    });

    const { rerender } = render(
      <PointNode
        data={{ content: 'C', createdAt: Date.now(), favor: 3, hidden: false }}
        id="node-1"
        selected={true}
      />
    );
    // Extra render for parity with first test
    rerender(
      <PointNode
        data={{ content: 'C', createdAt: Date.now(), favor: 3, hidden: false }}
        id="node-1"
        selected={true}
      />
    );

    expect(screen.queryByTestId('favor')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pill')).not.toBeInTheDocument();
  });
});


