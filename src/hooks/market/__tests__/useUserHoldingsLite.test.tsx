import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { useUserHoldingsLite } from '../../market/useUserHoldingsLite';

function HookProbe({ docId }: { docId: string }) {
  const { data } = useUserHoldingsLite(docId, 60_000);
  return <pre data-testid="out">{JSON.stringify(data || {})}</pre>;
}

describe('useUserHoldingsLite', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn(async () => ({ ok: true, json: async () => ({ holdings: { 'p-1': '0' } }) })) as any;
  });

  it('applies optimistic deltas immediately for matching doc', async () => {
    render(<HookProbe docId="doc1" />);

    // initial fetch
    await act(async () => {});
    expect(screen.getByTestId('out').textContent).toContain('"p-1":"0"');

    // +1 share
    await act(async () => {
      window.dispatchEvent(new CustomEvent('market:optimisticTrade', { detail: { docId: 'doc1', securityId: 'p-1', deltaScaled: '1000000000000000000' } }));
    });
    expect(screen.getByTestId('out').textContent).toContain('"p-1":"1000000000000000000"');

    // -1 share back to zero
    await act(async () => {
      window.dispatchEvent(new CustomEvent('market:optimisticTrade', { detail: { docId: 'doc1', securityId: 'p-1', deltaScaled: '-1000000000000000000' } }));
    });
    expect(screen.getByTestId('out').textContent).toContain('"p-1":"0"');
  });

  it('ignores optimistic events for other docs', async () => {
    render(<HookProbe docId="docA" />);
    await act(async () => {});
    await act(async () => {
      window.dispatchEvent(new CustomEvent('market:optimisticTrade', { detail: { docId: 'docB', securityId: 'p-1', deltaScaled: '5' } }));
    });
    expect(screen.getByTestId('out').textContent).toContain('"p-1":"0"');
  });
});

