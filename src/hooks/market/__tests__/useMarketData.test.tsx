import { renderHook } from '@testing-library/react';
import { useMarketData } from '../useMarketData';

describe('useMarketData', () => {
  it('should extract valid market data from node/edge data', () => {
    const data = {
      market: {
        price: 2.5,
        mine: 50,
        total: 100,
        influence: 0.5,
      },
    };

    const { result } = renderHook(() => useMarketData(data));

    expect(result.current.price).toBe(2.5);
    expect(result.current.mine).toBe(50);
    expect(result.current.total).toBe(100);
    expect(result.current.influence).toBe(0.5);
    expect(result.current.hasPrice).toBe(true);
    expect(result.current.hasHoldings).toBe(true);
  });

  it('should handle missing data gracefully', () => {
    const { result } = renderHook(() => useMarketData({}));

    expect(Number.isNaN(result.current.price)).toBe(true);
    expect(Number.isNaN(result.current.mine)).toBe(true);
    expect(Number.isNaN(result.current.total)).toBe(true);
    expect(Number.isNaN(result.current.influence)).toBe(true);
    expect(result.current.hasPrice).toBe(false);
    expect(result.current.hasHoldings).toBe(false);
  });

  it('should memoize result when data does not change', () => {
    const data = { market: { price: 1.5 } };

    const { result, rerender } = renderHook(({ data }) => useMarketData(data), {
      initialProps: { data },
    });

    const firstResult = result.current;

    rerender({ data });

    expect(result.current).toBe(firstResult);
  });

  it('should return new result when data changes', () => {
    const { result, rerender } = renderHook(({ data }) => useMarketData(data), {
      initialProps: { data: { market: { price: 1.5 } } },
    });

    const firstResult = result.current;

    rerender({ data: { market: { price: 2.5 } } });

    expect(result.current).not.toBe(firstResult);
    expect(result.current.price).toBe(2.5);
  });

  it('should handle null data', () => {
    const { result } = renderHook(() => useMarketData(null));

    expect(result.current.hasPrice).toBe(false);
    expect(result.current.hasHoldings).toBe(false);
  });

  it('should handle undefined data', () => {
    const { result } = renderHook(() => useMarketData(undefined));

    expect(result.current.hasPrice).toBe(false);
    expect(result.current.hasHoldings).toBe(false);
  });

  it('should extract partial market data', () => {
    const data = {
      market: {
        price: 3.0,
      },
    };

    const { result } = renderHook(() => useMarketData(data));

    expect(result.current.price).toBe(3.0);
    expect(result.current.hasPrice).toBe(true);
    expect(Number.isNaN(result.current.mine)).toBe(true);
    expect(result.current.hasHoldings).toBe(false);
  });

  it('should detect hasHoldings only when mine > 0', () => {
    const { result: resultWithHoldings } = renderHook(() =>
      useMarketData({ market: { mine: 5 } })
    );
    expect(resultWithHoldings.current.hasHoldings).toBe(true);

    const { result: resultWithoutHoldings } = renderHook(() =>
      useMarketData({ market: { mine: 0 } })
    );
    expect(resultWithoutHoldings.current.hasHoldings).toBe(false);

    const { result: resultNegative } = renderHook(() =>
      useMarketData({ market: { mine: -1 } })
    );
    expect(resultNegative.current.hasHoldings).toBe(false);
  });

  it('should handle invalid data types', () => {
    const data = {
      market: {
        price: 'invalid',
        mine: null,
        total: undefined,
      },
    };

    const { result } = renderHook(() => useMarketData(data));

    expect(Number.isNaN(result.current.price)).toBe(true);
    expect(Number.isNaN(result.current.mine)).toBe(true);
    expect(Number.isNaN(result.current.total)).toBe(true);
    expect(result.current.hasPrice).toBe(false);
  });
});
