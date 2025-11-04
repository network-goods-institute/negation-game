import React from 'react';
import { render, screen } from '@testing-library/react';
import { NodePriceOverlay } from '@/components/experiment/multiplayer/NodePriceOverlay';
import { MarketHoverOverlay } from '@/components/experiment/multiplayer/MarketHoverOverlay';
import { GraphProvider } from '@/components/experiment/multiplayer/GraphContext';

jest.mock('@xyflow/react', () => ({
  useViewport: () => ({ x: 0, y: 0, zoom: 0.8 }),
  useReactFlow: () => ({
    getNode: (id: string) => ({ id, position: { x: 100, y: 100 }, width: 120, height: 60 }),
  }),
}));

describe('NodePriceOverlay', () => {
  it('shows labels when zoomed out', () => {
    const nodes = [{ id: 'n1', position: { x: 0, y: 0 }, width: 100, height: 50 } as any];
    const prices = { n1: 0.5 } as Record<string, number>;
    render(<div style={{ position: 'relative', width: 400, height: 300 }}><NodePriceOverlay nodes={nodes as any} prices={prices} /></div>);
    expect(screen.getByText(/Price:/)).toBeTruthy();
    expect(screen.getByText(/0\.50/)).toBeTruthy();
  });
});

describe('MarketHoverOverlay', () => {
  it('renders hover info for hovered node', () => {
    const prices = { n1: 0.42 } as Record<string, number>;
    const totals = { n1: String(2n * (10n ** 18n)) } as Record<string, string>;
    const holdings = { n1: String(1n * (10n ** 18n)) } as Record<string, string>;
    render(
      <GraphProvider value={{ hoveredNodeId: 'n1' } as any}>
        <div style={{ position: 'relative', width: 400, height: 300 }}>
          <MarketHoverOverlay prices={prices} totals={totals} holdings={holdings} />
        </div>
      </GraphProvider>
    );
    expect(screen.getByText(/Price:/)).toBeTruthy();
    expect(screen.getByText(/0.4200/)).toBeTruthy();
    expect(screen.getByText(/Total shares:/)).toBeTruthy();
    expect(screen.getByText(/2.0000/)).toBeTruthy();
    expect(screen.getByText(/Your shares:/)).toBeTruthy();
    expect(screen.getByText(/1.0000/)).toBeTruthy();
  });
});

