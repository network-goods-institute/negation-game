import React from 'react';
import { render, act } from '@testing-library/react';
import { useUserHoldingsLite } from '@/hooks/market/useUserHoldingsLite';

function Probe({ docId }: { docId: string | null }) {
  const state = useUserHoldingsLite(docId, 60_000);
  (globalThis as any).__holdingsLiteState = state;
  return null;
}

describe('useUserHoldingsLite resets optimistic state on doc switch', () => {
  beforeEach(() => {
    (globalThis as any).fetch = jest.fn((url: string) => {
      if (url.includes('/A/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ holdings: { S: '0' } }) });
      }
      if (url.includes('/B/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ holdings: { S: '3' } }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ holdings: {} }) });
    });
  });

  it('does not carry optimistic deltas across documents', async () => {
    const { rerender } = render(<Probe docId={'A'} />);

    await act(async () => {});

    const addA = new CustomEvent('market:optimisticTrade', {
      detail: { docId: 'A', securityId: 'S', deltaScaled: '5' },
    } as any);
    act(() => {
      window.dispatchEvent(addA);
    });

    expect((globalThis as any).__holdingsLiteState.data).toEqual({ S: '5' });

    rerender(<Probe docId={'B'} />);

    await act(async () => {});

    expect((globalThis as any).__holdingsLiteState.data).toEqual({ S: '3' });

    const addB = new CustomEvent('market:optimisticTrade', {
      detail: { docId: 'B', securityId: 'S', deltaScaled: '2' },
    } as any);
    act(() => {
      window.dispatchEvent(addB);
    });
    expect((globalThis as any).__holdingsLiteState.data).toEqual({ S: '5' });
  });
});

