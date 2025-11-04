import React from 'react';
import { render } from '@testing-library/react';
import { GraphProvider } from '@/components/experiment/multiplayer/GraphContext';
import { GraphCanvas } from '@/components/experiment/multiplayer/GraphCanvas';

process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED = 'false';

let currentHoldings: any = null;

jest.mock('@xyflow/react', () => {
  return {
    __esModule: true,
    SelectionMode: { Partial: 'partial', Full: 'full' },
    Background: () => null,
    Controls: () => null,
    MiniMap: () => null,
    ReactFlow: (props: any) => {
      (globalThis as any).__rfProps = props;
      return React.createElement('div', { 'data-testid': 'rf' });
    },
    useReactFlow: () => ({
      getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
      setViewport: () => void 0,
      screenToFlowPosition: ({ x, y }: any) => ({ x, y }),
      getEdges: () => [],
      getNode: () => null,
      getNodes: () => [],
    }),
    useViewport: () => ({ x: 0, y: 0, zoom: 1 }),
  };
});

jest.mock('@/hooks/market/useUserHoldingsLite', () => ({
  useUserHoldingsLite: () => ({ data: currentHoldings }),
}));

const enrichSpy = jest.fn((n: any, p: any, h: any, t: any) => n);
jest.mock('@/utils/market/marketUtils', () => ({
  enrichWithMarketData: (n: any, p: any, h: any, t: any) => enrichSpy(n, p, h, t),
  getDocIdFromURL: () => 'doc-xyz',
}));

describe('GraphCanvas holdings recompute', () => {
  it('re-enriches nodes when holdings update', () => {
    const graphValue = {
      clearNodeSelection: () => {},
      setSelectedEdge: () => {},
      cancelConnect: () => {},
      connectMode: false,
    } as any;

    const nodes = [
      { id: 'n1', type: 'point', position: { x: 0, y: 0 }, data: {} },
    ] as any[];

    const { rerender } = render(
      <GraphProvider value={graphValue}>
        <GraphCanvas
          nodes={nodes}
          edges={[] as any}
          authenticated={true}
          onNodesChange={() => {}}
          onEdgesChange={() => {}}
          onConnect={() => {}}
          onNodeClick={() => {}}
          provider={null as any}
          cursors={new Map()}
          username="u"
          userColor="#000"
          grabMode={false}
          panOnDrag={[1]}
          panOnScroll={true}
          zoomOnScroll={false}
          selectMode={true}
          blurAllNodes={0}
        />
      </GraphProvider>
    );

    const callsBefore = enrichSpy.mock.calls.length;

    currentHoldings = { n1: '2.5' };

    rerender(
      <GraphProvider value={graphValue}>
        <GraphCanvas
          nodes={nodes}
          edges={[] as any}
          authenticated={true}
          onNodesChange={() => {}}
          onEdgesChange={() => {}}
          onConnect={() => {}}
          onNodeClick={() => {}}
          provider={null as any}
          cursors={new Map()}
          username="u"
          userColor="#000"
          grabMode={false}
          panOnDrag={[1]}
          panOnScroll={true}
          zoomOnScroll={false}
          selectMode={true}
          blurAllNodes={0}
        />
      </GraphProvider>
    );

    const callsAfter = enrichSpy.mock.calls.length;
    expect(callsAfter).toBe(callsBefore + nodes.length);

    const lastCall = enrichSpy.mock.calls[enrichSpy.mock.calls.length - 1];
    expect(lastCall[2]).toEqual({ n1: '2.5' });
  });
});
