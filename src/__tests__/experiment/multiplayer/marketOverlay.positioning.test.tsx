import React from 'react';
import { render } from '@testing-library/react';
import { NodePriceOverlay } from '@/components/experiment/multiplayer/NodePriceOverlay';
import { MarketHoverOverlay } from '@/components/experiment/multiplayer/MarketHoverOverlay';
import { GraphProvider } from '@/components/experiment/multiplayer/GraphContext';

jest.mock('@xyflow/react', () => {
  const viewport = { x: 10, y: 20, zoom: 2 };
  const node = { id: 'n1', position: { x: 100, y: 50 }, width: 200, height: 100 };
  return {
    __esModule: true,
    useViewport: () => viewport,
    useReactFlow: () => ({
      getNode: (id: string) => (id === 'n1' ? node : null),
      getNodes: () => [node],
    }),
  };
});

describe('market overlays positioning', () => {
  it('projects NodePriceOverlay positions using viewport transform', () => {
    const nodes = [
      { id: 'n1', position: { x: 100, y: 50 }, width: 200, height: 100 },
    ];
    const prices = { n1: 1.23 } as Record<string, number>;
    const { getByText } = render(
      <div style={{ position: 'relative', width: 1000, height: 800 }}>
        <NodePriceOverlay nodes={nodes as any} prices={prices} zoomThreshold={10} />
      </div>
    );
    const label = getByText('Price: 1.23') as HTMLElement;
    const centerX = 100 + 200 / 2;
    const centerY = 50 + 100 / 2;
    const expectedLeft = `${centerX * 2 + 10}px`;
    const expectedTop = `${centerY * 2 + 20}px`;
    expect(label.style.left).toBe(expectedLeft);
    expect(label.style.top).toBe(expectedTop);
  });

  it('projects MarketHoverOverlay tooltip using viewport transform', () => {
    const value: any = { hoveredNodeId: 'n1' };
    const prices = { n1: 10 } as Record<string, number>;
    const totals = { n1: '0' } as Record<string, string>;
    const holdings = { n1: '0' } as Record<string, string>;
    const { getByText } = render(
      <GraphProvider value={value}>
        <div style={{ position: 'relative', width: 1000, height: 800 }}>
          <MarketHoverOverlay prices={prices} totals={totals} holdings={holdings} />
        </div>
      </GraphProvider>
    );
    const tip = getByText('Price:').parentElement as HTMLElement;
    const centerX = 100 + 200 / 2;
    const centerY = 50 + 100 / 2;
    const nodeTop = centerY - 100 / 2;
    const expectedLeft = `${centerX * 2 + 10}px`;
    const expectedTop = `${nodeTop * 2 + 20 - 16}px`;
    expect(tip.style.left).toBe(expectedLeft);
    expect(tip.style.top).toBe(expectedTop);
  });
});
