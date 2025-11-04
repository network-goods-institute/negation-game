import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarketContextMenu } from '@/components/experiment/multiplayer/common/MarketContextMenu';

describe('MarketContextMenu feature flag gating', () => {
  const baseProps = {
    open: true,
    x: 100,
    y: 100,
    onClose: jest.fn(),
    kind: 'node' as const,
    entityId: 'p-a',
  };

  it('renders legacy delete-only menu when flag is off', () => {
    process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED = 'false';
    const onDelete = jest.fn();
    render(<MarketContextMenu {...baseProps} onDelete={onDelete} />);
    expect(screen.queryByText('Quick Actions')).toBeNull();
    expect(screen.getByText('Actions')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalled();
  });

  it('renders trading UI when flag is on', () => {
    process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED = 'true';
    render(<MarketContextMenu {...baseProps} />);
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });
});

