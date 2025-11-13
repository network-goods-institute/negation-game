import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MultiplayerHeader } from '@/components/experiment/multiplayer/MultiplayerHeader';
import { TooltipProvider } from '@/components/ui/tooltip';

function createProviderWithPending(values: number[] = []) {
  const states = new Map<any, any>(
    values.map((v, i) => [String(i + 1), { marketPending: v, user: { name: `U${i + 1}` } }])
  );
  const awareness = {
    getStates: () => states,
    on: jest.fn(),
    off: jest.fn(),
    getLocalState: jest.fn(() => ({ user: { name: 'You' } })),
    setLocalStateField: jest.fn(),
  };
  return { awareness } as any;
}

describe('MultiplayerHeader pending trades indicator', () => {
  test('renders pending trades indicator showing zero', async () => {
    render(
      <TooltipProvider>
        <MultiplayerHeader
          username="me"
          userColor="#000"
          provider={createProviderWithPending([])}
          isConnected
          connectionError={null}
          isSaving={false}
        />
      </TooltipProvider>
    );

    // Should show the indicator even when count is 0
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('trades')).toBeInTheDocument();
  });

  test('shows aggregated pending trades from awareness states', async () => {
    render(
      <TooltipProvider>
        <MultiplayerHeader
          username="me"
          userColor="#000"
          provider={createProviderWithPending([2, 1])}
          isConnected
          connectionError={null}
          isSaving={false}
        />
      </TooltipProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('trades')).toBeInTheDocument();
    });
  });

  test('shows singular "trade" text when only one pending', async () => {
    render(
      <TooltipProvider>
        <MultiplayerHeader
          username="me"
          userColor="#000"
          provider={createProviderWithPending([1])}
          isConnected
          connectionError={null}
          isSaving={false}
        />
      </TooltipProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('trade')).toBeInTheDocument();
    });
  });
});


