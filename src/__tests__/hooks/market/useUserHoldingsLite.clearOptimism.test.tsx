import React from 'react';
import { render, act } from '@testing-library/react';
import { useUserHoldingsLite } from '@/hooks/market/useUserHoldingsLite';

function Probe({ docId }: { docId: string }) {
  const state = useUserHoldingsLite(docId, 1_000_000);
  (globalThis as any).__holdingsState = state;
  return null;
}

describe('useUserHoldingsLite clears optimistic after sync', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (globalThis as any).fetch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not re-apply the same optimistic delta after server includes it', async () => {
    const sequence = [
      { holdings: {} },
      { holdings: { A: '5' } },
      { holdings: { A: '5' } },
    ];
    (globalThis as any).fetch.mockImplementation(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(sequence.shift() || { holdings: {} }) })
    );

    render(<Probe docId="d1" />);
    await act(async () => {});

    expect((globalThis as any).__holdingsState.data || {}).toEqual({});

    const evt = new CustomEvent('market:optimisticTrade', {
      detail: { docId: 'd1', securityId: 'A', deltaScaled: '5' },
    } as any);
    act(() => {
      window.dispatchEvent(evt);
    });

    expect((globalThis as any).__holdingsState.data).toEqual({ A: '5' });

    jest.setSystemTime(Date.now() + 2000);
    await act(async () => {
      await (globalThis as any).__holdingsState.refetch();
    });

    expect((globalThis as any).__holdingsState.data).toEqual({ A: '5' });

    jest.setSystemTime(Date.now() + 2000);
    await act(async () => {
      await (globalThis as any).__holdingsState.refetch();
    });

    expect((globalThis as any).__holdingsState.data).toEqual({ A: '5' });
  });
});

