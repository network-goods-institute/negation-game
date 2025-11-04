import { buyShares, sellShares, closePosition } from '@/utils/market/marketContextMenu';

jest.mock('@/utils/market/marketUtils', () => ({
  getDocIdFromURL: () => 'doc-x',
  dispatchMarketRefresh: jest.fn(),
}));

describe('market optimistic dispatch gating', () => {
  let dispatchSpy: jest.SpyInstance;
  beforeEach(() => {
    dispatchSpy = jest.spyOn(window, 'dispatchEvent');
  });
  afterEach(() => {
    dispatchSpy.mockRestore();
  });

  it('buyShares dispatches optimistic only on success', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValue({ ok: false });
    await buyShares('p-a', 1);
    expect(dispatchSpy).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'market:optimisticTrade' }));

    (globalThis as any).fetch = jest.fn().mockResolvedValue({ ok: true });
    await buyShares('p-a', 1);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'market:optimisticTrade' }));
  });

  it('sellShares dispatches optimistic only on success', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValue({ ok: false });
    await sellShares('p-a', 1);
    expect(dispatchSpy).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'market:optimisticTrade' }));

    (globalThis as any).fetch = jest.fn().mockResolvedValue({ ok: true });
    await sellShares('p-a', 1);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'market:optimisticTrade' }));
  });

  it('closePosition dispatches optimistic only when close POST succeeds', async () => {
    (globalThis as any).fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ userHoldings: { 'p-a': (5n * (10n ** 18n)).toString() } }) })
      .mockResolvedValueOnce({ ok: false });
    await closePosition('p-a');
    expect(dispatchSpy).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'market:optimisticTrade' }));

    (globalThis as any).fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ userHoldings: { 'p-a': (5n * (10n ** 18n)).toString() } }) })
      .mockResolvedValueOnce({ ok: true });
    await closePosition('p-a');
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'market:optimisticTrade' }));
  });
});

