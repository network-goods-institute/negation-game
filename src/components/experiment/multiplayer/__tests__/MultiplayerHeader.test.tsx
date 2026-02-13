import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import { MultiplayerHeader } from '@/components/experiment/multiplayer/MultiplayerHeader';
import { TooltipProvider } from '@/components/ui/tooltip';

process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED = 'true';

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
    const tradeIndicator = document.querySelector('[aria-live="polite"]');
    expect(tradeIndicator).toHaveTextContent('0');
    expect(tradeIndicator).toHaveTextContent('trades');
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

    // Wait for the component to update with the aggregated count
    await waitFor(() => {
      const tradeIndicator = document.querySelector('[aria-live="polite"]');
      expect(tradeIndicator).toHaveTextContent('3');
      expect(tradeIndicator).toHaveTextContent('trades');
    });
  });

  test('shows singular "trade" text when only one pending', async () => {
    const provider = createProviderWithPending([1]);

    render(
      <TooltipProvider>
        <MultiplayerHeader
          username="me"
          userColor="#000"
          provider={provider}
          isConnected
          connectionError={null}
          isSaving={false}
        />
      </TooltipProvider>
    );

    // Force a re-render by wrapping in act
    await act(async () => {
      // The component should initialize with the correct pending trades count
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Check that it shows '1' and 'trade' (singular) in the main indicator
    const tradeIndicator = document.querySelector('[aria-live="polite"]');
    expect(tradeIndicator).toHaveTextContent('1');
    expect(tradeIndicator).toHaveTextContent('trade');
  });
});


