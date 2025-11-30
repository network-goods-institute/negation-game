import React from 'react';
import { render, act } from '@testing-library/react';
import { useUserHoldingsLite } from '@/hooks/market/useUserHoldingsLite';

function Probe({ docId, refreshMs = 60_000 }: { docId: string; refreshMs?: number }) {
  const state = useUserHoldingsLite(docId, refreshMs);
  (globalThis as any).__holdingsLite = state;
  return null;
}

describe('useUserHoldingsLite pending optimistic behavior', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (globalThis as any).fetch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps optimistic until server includes it and supports partial inclusion', async () => {
    const seq = [
      { holdings: { A: '0' } },
      { holdings: { A: '0' } },
      { holdings: { A: '5' } },
      { holdings: { A: '9' } },
    ];
    (globalThis as any).fetch.mockImplementation(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(seq.shift() || { holdings: {} }) })
    );

    render(<Probe docId="doc-1" />);
    await act(async () => {});
    expect((globalThis as any).__holdingsLite.data).toEqual({ A: '0' });

    const e1 = new CustomEvent('market:optimisticTrade', {
      detail: { docId: 'doc-1', securityId: 'A', deltaScaled: '9' },
    } as any);
    act(() => { window.dispatchEvent(e1); });
    expect((globalThis as any).__holdingsLite.data).toEqual({ A: '9' });

    jest.setSystemTime(Date.now() + 2000);
    await act(async () => { await (globalThis as any).__holdingsLite.refetch(); });
    expect((globalThis as any).__holdingsLite.data).toEqual({ A: '9' });

    jest.setSystemTime(Date.now() + 2000);
    await act(async () => { await (globalThis as any).__holdingsLite.refetch(); });
    expect((globalThis as any).__holdingsLite.data).toEqual({ A: '9' });

    jest.setSystemTime(Date.now() + 2000);
    await act(async () => { await (globalThis as any).__holdingsLite.refetch(); });
    expect((globalThis as any).__holdingsLite.data).toEqual({ A: '9' });
  });

  it('handles negative deltas and clears when server confirms', async () => {
    const seq = [
      { holdings: { B: '10' } },
      { holdings: { B: '10' } },
      { holdings: { B: '9' } },
      { holdings: { B: '7' } },
    ];
    (globalThis as any).fetch.mockImplementation(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(seq.shift() || { holdings: {} }) })
    );

    render(<Probe docId="doc-2" />);
    await act(async () => {});
    expect((globalThis as any).__holdingsLite.data).toEqual({ B: '10' });

    const e1 = new CustomEvent('market:optimisticTrade', {
      detail: { docId: 'doc-2', securityId: 'B', deltaScaled: '-3' },
    } as any);
    act(() => { window.dispatchEvent(e1); });
    expect((globalThis as any).__holdingsLite.data).toEqual({ B: '7' });

    jest.setSystemTime(Date.now() + 2000);
    await act(async () => { await (globalThis as any).__holdingsLite.refetch(); });
    expect((globalThis as any).__holdingsLite.data).toEqual({ B: '7' });

    jest.setSystemTime(Date.now() + 2000);
    await act(async () => { await (globalThis as any).__holdingsLite.refetch(); });
    expect((globalThis as any).__holdingsLite.data).toEqual({ B: '7' });

    jest.setSystemTime(Date.now() + 2000);
    await act(async () => { await (globalThis as any).__holdingsLite.refetch(); });
    expect((globalThis as any).__holdingsLite.data).toEqual({ B: '7' });
  });
});

