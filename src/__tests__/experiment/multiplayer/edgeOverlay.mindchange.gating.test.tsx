import React from 'react';
import { render, screen } from '@testing-library/react';
import { EdgeOverlay } from '@/components/experiment/multiplayer/common/EdgeOverlay';
import { ReactFlowProvider } from '@xyflow/react';

const baseProps = {
  cx: 0,
  cy: 0,
  isHovered: true,
  selected: true,
  edgeId: 'e1',
  onMouseEnter: () => {},
  onMouseLeave: () => {},
  onAddObjection: () => {},
  onToggleEdgeType: () => {},
} as const;

describe('EdgeOverlay mindchange gating', () => {
  const wrap = (ui: React.ReactNode) => render(<ReactFlowProvider>{ui}</ReactFlowProvider>);

  it('does not render Mindchange button for support', () => {
    wrap(<EdgeOverlay {...baseProps} edgeType="support" />);
    expect(screen.queryByText('Mindchange')).toBeNull();
  });

  it('does not render Mindchange button for option', () => {
    wrap(<EdgeOverlay {...baseProps} edgeType="option" />);
    expect(screen.queryByText('Mindchange')).toBeNull();
  });

  it('renders Mindchange button for negation', () => {
    wrap(<EdgeOverlay {...baseProps} edgeType="negation" />);
    expect(screen.getByText('Mindchange')).toBeInTheDocument();
  });

  it('renders Mindchange button for objection', () => {
    wrap(<EdgeOverlay {...baseProps} edgeType="objection" />);
    expect(screen.getByText('Mindchange')).toBeInTheDocument();
  });
});
