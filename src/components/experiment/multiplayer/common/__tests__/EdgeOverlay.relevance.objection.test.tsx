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

describe('EdgeOverlay relevance UI for objection when mindchange is disabled', () => {
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
    edgeId: 'e-obj-1',
    edgeType: 'objection',
    onMouseEnter: () => { },
    onMouseLeave: () => { },
    onAddObjection: () => { },
  } as any;

  it('renders star relevance and updates on click', () => {
    const onUpdateRelevance = jest.fn();
    render(
      <GraphProvider value={{ overlayActiveEdgeId: null } as any}>
        <EdgeOverlay
          {...baseProps}
          relevance={2}
          onUpdateRelevance={onUpdateRelevance}
        />
      </GraphProvider>
    );

    expect(screen.getByText('Relevance:')).toBeInTheDocument();
    // find five stars
    const stars = screen.getAllByText('★');
    expect(stars.length).toBe(5);

    // Click the 4th star
    fireEvent.click(stars[3]);
    expect(onUpdateRelevance).toHaveBeenCalledWith(4);
  });
});


