import React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { QueryClientProvider } from '@/components/providers/QueryClientProvider';
import { GraphProvider } from '@/components/experiment/multiplayer/GraphContext';
import { EdgeOverlay } from '@/components/experiment/multiplayer/common/EdgeOverlay';

jest.mock('@xyflow/react', () => ({
  EdgeLabelRenderer: ({ children }: any) => <>{children}</>,
  useStore: (selector: any) => selector({ transform: [0, 0, 1], nodeInternals: new Map() }),
  useReactFlow: () => ({
    getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
    setViewport: jest.fn(),
  }),
}));

const noop = () => {};

const renderOverlay = (edgeType: 'support' | 'negation', overlayActiveEdgeId: string | null) => {
  return render(
    <QueryClientProvider>
      <GraphProvider value={{
        currentUserId: 'u1',
        updateNodeContent: () => {},
        addObjectionForEdge: () => {},
        hoveredEdgeId: null,
        setHoveredEdge: () => {},
        selectedEdgeId: null,
        setSelectedEdge: () => {},
        overlayActiveEdgeId,
        setOverlayActiveEdge: () => {},
        updateEdgeAnchorPosition: () => {},
        connectMode: false,
        grabMode: false,
      } as any}>
        <EdgeOverlay
          cx={100}
          cy={100}
          isHovered={false}
          selected={false}
          edgeId="e1"
          edgeType={edgeType}
          onMouseEnter={noop}
          onMouseLeave={noop}
          onAddObjection={noop}
          onToggleEdgeType={noop}
        />
      </GraphProvider>
    </QueryClientProvider>
  );
};

describe('EdgeOverlay visibility across edge type switch', () => {
  afterEach(() => cleanup());

  it('stays visible when switching support -> negation', () => {
    const { container } = renderOverlay('support', 'e1');
    const anchor = screen.getByTestId('edge-overlay-anchor');
    fireEvent.mouseEnter(anchor);
    expect(screen.getByRole('button', { name: 'Mitigate' })).toBeInTheDocument();
    cleanup();
    renderOverlay('negation', 'e1');
    const anchor2 = screen.getByTestId('edge-overlay-anchor');
    fireEvent.mouseEnter(anchor2);
    expect(screen.getByRole('button', { name: 'Mitigate' })).toBeInTheDocument();
  });

  it('stays visible when switching negation -> support', () => {
    renderOverlay('negation', 'e1');
    const anchor = screen.getByTestId('edge-overlay-anchor');
    fireEvent.mouseEnter(anchor);
    expect(screen.getByRole('button', { name: 'Mitigate' })).toBeInTheDocument();
    cleanup();
    renderOverlay('support', 'e1');
    const anchor2 = screen.getByTestId('edge-overlay-anchor');
    fireEvent.mouseEnter(anchor2);
    expect(screen.getByRole('button', { name: 'Mitigate' })).toBeInTheDocument();
  });
});
