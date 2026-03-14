import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { GraphProvider } from '../GraphContext';
import { StatementReadabilityOverlay } from '../StatementReadabilityOverlay';

const mockUseViewport = jest.fn();

jest.mock('@xyflow/react', () => ({
  useViewport: () => mockUseViewport(),
}));

describe('StatementReadabilityOverlay', () => {
  const statementNodes = [
    {
      id: 'statement-1',
      type: 'statement',
      position: { x: 100, y: 120 },
      width: 240,
      height: 72,
      data: { statement: 'Should people work four days a week?' },
    },
  ] as any;

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('shows a readable statement label when zoomed out', () => {
    mockUseViewport.mockReturnValue({ x: 0, y: 0, zoom: 0.35 });

    render(
      <GraphProvider value={{ hoveredNodeId: null } as any}>
        <div style={{ position: 'relative', width: 800, height: 600 }}>
          <StatementReadabilityOverlay nodes={statementNodes} />
        </div>
      </GraphProvider>
    );

    expect(screen.getByText('Should people work four days a week?')).toBeTruthy();
  });

  it('does not show the overlay at normal zoom', () => {
    mockUseViewport.mockReturnValue({ x: 0, y: 0, zoom: 1 });

    render(
      <div style={{ position: 'relative', width: 800, height: 600 }}>
        <StatementReadabilityOverlay nodes={statementNodes} />
      </div>
    );

    expect(screen.queryByText('Should people work four days a week?')).toBeNull();
  });

  it('hides the overlay while the statement is hovered', () => {
    mockUseViewport.mockReturnValue({ x: 0, y: 0, zoom: 0.35 });

    render(
      <GraphProvider value={{ hoveredNodeId: 'statement-1' } as any}>
        <div style={{ position: 'relative', width: 800, height: 600 }}>
          <StatementReadabilityOverlay nodes={statementNodes} />
        </div>
      </GraphProvider>
    );

    expect(screen.queryByText('Should people work four days a week?')).toBeNull();
  });
});
