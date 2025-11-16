import { renderHook, act } from '@testing-library/react';
import { useBuyAmountPreview } from '@/hooks/market/useBuyAmountPreview';

describe('useBuyAmountPreview', () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('fetches preview and returns shares number', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ shares: '2000000000000000000', cost: '1000000000000000000' }) });
    const { result } = renderHook(() => useBuyAmountPreview('doc-1', 'p-a', 10));
    expect(result.current.loading).toBe(false);
    await act(async () => {
      jest.advanceTimersByTime(250);
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.shares).toBeCloseTo(2);
  });
});

