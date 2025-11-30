import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';

jest.mock('@xyflow/react', () => {
  const actual = jest.requireActual('@xyflow/react');
  return {
    ...actual,
    useStore: jest.fn((selector: any) => selector({ nodeInternals: new Map([['node-1', { id: 'node-1', dragging: false }]]) })),
    useReactFlow: jest.fn(() => ({ getEdges: jest.fn(() => []), getNodes: jest.fn(() => []) })),
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
    globalMarketOverlays: false,
  })
}));

jest.mock('../common/NodeShell', () => ({
  NodeShell: ({ children }: any) => <div data-testid="nodeshell">{children}</div>,
}));

jest.mock('../common/useNodeChrome', () => ({
  useNodeChrome: () => ({
    editable: {
      isEditing: true,
      value: 'Editing',
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

jest.mock('../common/NodeWithMarket', () => ({
  InlineMarketDisplay: () => <div>inline-market</div>,
  useInlineMarketDisplay: jest.requireActual('../common/NodeWithMarket').useInlineMarketDisplay,
}));

jest.mock('../common/useFavorOpacity', () => ({
  useFavorOpacity: () => 1,
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

jest.mock('../common/MarketContextMenu', () => ({
  MarketContextMenu: () => null,
}));

jest.mock('../market/InlineBuyControls', () => ({
  InlineBuyControls: () => <button>Buy</button>,
}));

import { PointNode } from '../PointNode';

describe('PointNode hides market UI while editing', () => {
  const OLD_ENV = process.env as any;

  beforeEach(() => {
    jest.resetModules();
    (process as any).env = { ...OLD_ENV, NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED: 'true' };
  });

  afterEach(() => {
    cleanup();
  });

  afterAll(() => {
    (process as any).env = OLD_ENV;
  });

  it('does not render price history or Buy while editing', () => {
    render(
      <PointNode
        data={{ content: 'C', createdAt: Date.now(), favor: 3, hidden: false, market: { price: 0.5, mine: 0, total: 0 } } as any}
        id="node-1"
        selected={true}
      />
    );

    expect(screen.queryByText('inline-market')).toBeNull();
    expect(screen.queryByText('Buy')).toBeNull();
  });
});


