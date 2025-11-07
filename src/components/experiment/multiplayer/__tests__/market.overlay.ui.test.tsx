import React from 'react';
import { render, screen } from '@testing-library/react';
import { NodePriceOverlay } from '@/components/experiment/multiplayer/NodePriceOverlay';
import { MiniHoverStats } from '@/components/experiment/multiplayer/MiniHoverStats';
import { GraphProvider } from '@/components/experiment/multiplayer/GraphContext';

jest.mock('@xyflow/react', () => ({
  useViewport: () => ({ x: 0, y: 0, zoom: 0.5 }),
  useReactFlow: () => ({
    getNode: (id: string) => ({ id, position: { x: 100, y: 100 }, width: 120, height: 60 }),
  }),
}));

describe('NodePriceOverlay', () => {
  it('shows labels when zoomed out', () => {
    const nodes = [{ id: 'n1', position: { x: 0, y: 0 }, width: 100, height: 50 } as any];
    const prices = { n1: 0.5 } as Record<string, number>;
    render(<div style={{ position: 'relative', width: 400, height: 300 }}><NodePriceOverlay nodes={nodes as any} prices={prices} /></div>);
    expect(screen.getByText(/50\.0%/)).toBeTruthy();
  });
});

describe('Hover mini stats', () => {
  it('does not render legacy tooltip (tooltips removed)', () => {
    const { container } = render(
      <GraphProvider value={{ hoveredNodeId: 'n1' } as any}>
        <div style={{ position: 'relative', width: 400, height: 300 }}>
          <MiniHoverStats docId={null} />
        </div>
      </GraphProvider>
    );
    expect(container.querySelector('.bg-white\\/95')).toBeNull();
  });
});

