import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EdgeOverlay } from '../EdgeOverlay';
import { GraphProvider } from '@/components/experiment/multiplayer/GraphContext';

jest.mock('@xyflow/react', () => ({
  EdgeLabelRenderer: ({ children }: any) => <>{children}</>,
  useStore: (selector: any) => selector({ transform: [0, 0, 1], nodeInternals: new Map() }),
  useReactFlow: () => ({
    getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
    setViewport: jest.fn(),
  }),
}));

describe('EdgeOverlay relevance UI when mindchange is disabled', () => {
  const OLD_ENV = process.env as any;
  beforeEach(() => {
    jest.resetModules();
    (process as any).env = { ...OLD_ENV, NEXT_PUBLIC_ENABLE_MINDCHANGE: 'false' };
  });
  afterAll(() => {
    (process as any).env = OLD_ENV;
  });

  const baseProps = {
    cx: 100,
    cy: 100,
    isHovered: true,
    selected: true,
    edgeId: 'e-1',
    edgeType: 'negation',
    onMouseEnter: () => { },
    onMouseLeave: () => { },
    onAddObjection: () => { },
  } as any;

  it('renders plus/minus relevance buttons and triggers update', () => {
    const onUpdateRelevance = jest.fn();
    render(
      <GraphProvider value={{ overlayActiveEdgeId: null } as any}>
        <EdgeOverlay
          {...baseProps}
          relevance={4}
          onUpdateRelevance={onUpdateRelevance}
        />
      </GraphProvider>
    );

    // Expect five clickable buttons with +/- marks
    const buttons = screen.getAllByRole('button');
    // One of the buttons is Mitigate; ensure there are more than 1
    expect(buttons.length).toBeGreaterThan(1);

    // Click the third relevance button
    // Filter by those whose textContent includes '-' for negation
    const relButtons = buttons.filter((b) => (b.textContent || '').includes('-'));
    expect(relButtons.length).toBe(5);
    fireEvent.click(relButtons[2]);

    expect(onUpdateRelevance).toHaveBeenCalledWith(3);
  });
});


