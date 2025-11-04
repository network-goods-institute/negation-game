import React from 'react';
import { render, screen } from '@testing-library/react';
import { GraphProvider } from '@/components/experiment/multiplayer/GraphContext';
import { MarketHoverOverlay } from '@/components/experiment/multiplayer/MarketHoverOverlay';

jest.mock('@xyflow/react', () => {
  const node = { id: 'anchor:n1', position: { x: 100, y: 50 }, width: 200, height: 100 };
  return {
    __esModule: true,
    useViewport: () => ({ x: 0, y: 0, zoom: 1 }),
    useReactFlow: () => ({
      getNode: (id: string) => (id === 'anchor:n1' ? node : null),
    }),
  };
});

describe('MarketHoverOverlay normalized id handling', () => {
  it('renders when hovered id has anchor: prefix but prices are keyed by normalized id', () => {
    const prices = { n1: 1.2345 } as Record<string, number>;
    const totals = { n1: '0' } as Record<string, string>;
    const holdings = { n1: '0' } as Record<string, string>;

    render(
      <GraphProvider value={{ hoveredNodeId: 'anchor:n1' } as any}>
        <div style={{ position: 'relative', width: 800, height: 600 }}>
          <MarketHoverOverlay prices={prices} totals={totals} holdings={holdings} />
        </div>
      </GraphProvider>
    );

    expect(screen.getByText('Price:')).toBeInTheDocument();
    expect(screen.getByText('1.2345')).toBeInTheDocument();
  });
});

