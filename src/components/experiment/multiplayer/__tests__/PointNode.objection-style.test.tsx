import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';

jest.mock('@xyflow/react', () => {
  const actual = jest.requireActual('@xyflow/react');
  return {
    ...actual,
    useStore: jest.fn(),
    useReactFlow: jest.fn(() => ({ getEdges: jest.fn(() => []), getNodes: jest.fn(() => []), getNode: jest.fn() })),
    useViewport: jest.fn(() => ({ x: 0, y: 0, zoom: 1 })),
    Position: { Top: 'top', Bottom: 'bottom' },
  };
});

jest.mock('../GraphContext', () => ({
  useGraphActions: () => ({
    updateNodeContent: jest.fn(),
    updateNodeHidden: jest.fn(),
    updateNodeFavor: jest.fn(),
    addPointBelow: jest.fn(),
    isConnectingFromNodeId: null,
    deleteNode: jest.fn(),
    startEditingNode: jest.fn(),
    stopEditingNode: jest.fn(),
    isLockedForMe: () => false,
    getLockOwner: () => null,
    setPairNodeHeight: jest.fn(),
    grabMode: false,
    currentUserId: 'user-1',
  })
}));

jest.mock('../common/NodeShell', () => ({
  NodeShell: ({ children, wrapperClassName }: any) => (
    <div data-testid="nodeshell" data-wrapper-class={wrapperClassName}>
      {children}
    </div>
  ),
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

jest.mock('../common/useForceHidePills', () => ({
  useForceHidePills: () => jest.fn(),
}));

jest.mock('../PerformanceContext', () => ({
  usePerformanceMode: () => ({ perfMode: false, setPerfMode: jest.fn() }),
}));

jest.mock('../common/NodeActionPill', () => ({
  NodeActionPill: () => <div data-testid="pill" />,
}));

jest.mock('../common/LockIndicator', () => ({
  LockIndicator: () => <div data-testid="lock" />,
}));

jest.mock('../common/NodeVoting', () => ({
  NodeVoting: ({ variant }: any) => <div data-testid="node-voting" data-variant={variant} />,
}));

import { useStore } from '@xyflow/react';
import { PointNode } from '../PointNode';

describe('PointNode objection styling', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV, NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED: 'false' };
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('uses objection styling when connected to an objection edge', () => {
    (useStore as jest.Mock).mockImplementation((selector: any) => {
      const map = new Map([['node-1', { id: 'node-1', dragging: false }]]);
      return selector({
        nodeInternals: map,
        nodes: [],
        edges: [{ id: 'edge-1', type: 'objection', source: 'node-1', target: 'anchor-1' }],
      });
    });

    render(
      <PointNode
        data={{ content: 'C', createdAt: Date.now(), hidden: false }}
        id="node-1"
        selected={true}
      />
    );

    const shell = screen.getByTestId('nodeshell');
    expect(shell.getAttribute('data-wrapper-class')).toContain('bg-amber-100');
    expect(screen.getByTestId('node-voting')).toHaveAttribute('data-variant', 'orange');
  });

  it('keeps default styling when a negation edge is connected', () => {
    (useStore as jest.Mock).mockImplementation((selector: any) => {
      const map = new Map([['node-1', { id: 'node-1', dragging: false }]]);
      return selector({
        nodeInternals: map,
        nodes: [],
        edges: [
          { id: 'edge-1', type: 'objection', source: 'node-1', target: 'anchor-1' },
          { id: 'edge-2', type: 'negation', source: 'node-1', target: 'node-2' },
        ],
      });
    });

    render(
      <PointNode
        data={{ content: 'C', createdAt: Date.now(), hidden: false }}
        id="node-1"
        selected={true}
      />
    );

    const shell = screen.getByTestId('nodeshell');
    expect(shell.getAttribute('data-wrapper-class')).toContain('bg-white');
    expect(screen.getByTestId('node-voting')).toHaveAttribute('data-variant', 'blue');
  });

  it('keeps default styling when negation is incoming only', () => {
    (useStore as jest.Mock).mockImplementation((selector: any) => {
      const map = new Map([['node-1', { id: 'node-1', dragging: false }]]);
      return selector({
        nodeInternals: map,
        nodes: [],
        edges: [
          { id: 'edge-1', type: 'objection', source: 'node-1', target: 'anchor-1' },
          { id: 'edge-2', type: 'negation', source: 'node-2', target: 'node-1' },
        ],
      });
    });

    render(
      <PointNode
        data={{ content: 'C', createdAt: Date.now(), hidden: false }}
        id="node-1"
        selected={true}
      />
    );

    const shell = screen.getByTestId('nodeshell');
    expect(shell.getAttribute('data-wrapper-class')).toContain('bg-white');
    expect(screen.getByTestId('node-voting')).toHaveAttribute('data-variant', 'blue');
  });

  it('uses default styling when no objection edges connect', () => {
    (useStore as jest.Mock).mockImplementation((selector: any) => {
      const map = new Map([['node-1', { id: 'node-1', dragging: false }]]);
      return selector({ nodeInternals: map, nodes: [], edges: [] });
    });

    render(
      <PointNode
        data={{ content: 'C', createdAt: Date.now(), hidden: false }}
        id="node-1"
        selected={true}
      />
    );

    const shell = screen.getByTestId('nodeshell');
    expect(shell.getAttribute('data-wrapper-class')).toContain('bg-white');
    expect(screen.getByTestId('node-voting')).toHaveAttribute('data-variant', 'blue');
  });
});
