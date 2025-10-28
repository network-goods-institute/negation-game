import { renderHook } from '@testing-library/react';
import { useMindchangeRenderConfig } from '../useMindchangeRenderConfig';

// Mock the EdgeArrowMarkers module
jest.mock('../EdgeArrowMarkers', () => ({
  getMarkerIdForEdgeType: (edgeType: string) => {
    if (edgeType === 'negation') {
      return 'arrow-negation';
    }
    if (edgeType === 'objection') {
      return 'arrow-objection';
    }
    return null;
  },
}));

describe('useMindchangeRenderConfig', () => {
  it('returns normal mode with no markers when mindchange is null', () => {
    const { result } = renderHook(() => useMindchangeRenderConfig(null, 'negation'));

    expect(result.current).toMatchObject({
      mode: 'normal',
      markerStart: undefined,
      markerEnd: undefined,
    });
  });

  it('returns normal mode when both forward and backward counts are 0', () => {
    const mindchange = {
      forward: { count: 0, average: 0 },
      backward: { count: 0, average: 0 },
    };

    const { result } = renderHook(() => useMindchangeRenderConfig(mindchange, 'negation'));

    expect(result.current).toMatchObject({
      mode: 'normal',
      markerStart: undefined,
      markerEnd: undefined,
    });
  });

  it('returns bidirectional mode when both forward and backward have counts', () => {
    const mindchange = {
      forward: { count: 3, average: 50 },
      backward: { count: 2, average: -30 },
    };

    const { result } = renderHook(() => useMindchangeRenderConfig(mindchange, 'negation'));

    expect(result.current.mode).toBe('bidirectional');
    expect(result.current.markerId).toBe('arrow-negation');
    expect(result.current.markerStart).toBeUndefined();
    expect(result.current.markerEnd).toBeUndefined();
  });

  it('returns normal mode with markerEnd for forward-only mindchange', () => {
    const mindchange = {
      forward: { count: 3, average: 50 },
      backward: { count: 0, average: 0 },
    };

    const { result } = renderHook(() => useMindchangeRenderConfig(mindchange, 'negation'));

    expect(result.current.mode).toBe('normal');
    expect(result.current.markerStart).toBeUndefined();
    expect(result.current.markerEnd).toBe('url(#arrow-negation)');
  });

  it('returns normal mode with markerStart for backward-only mindchange', () => {
    const mindchange = {
      forward: { count: 0, average: 0 },
      backward: { count: 2, average: -30 },
    };

    const { result } = renderHook(() => useMindchangeRenderConfig(mindchange, 'negation'));

    expect(result.current.mode).toBe('normal');
    expect(result.current.markerStart).toBe('url(#arrow-negation)');
    expect(result.current.markerEnd).toBeUndefined();
  });

  it('returns normal mode when edge type has no marker', () => {
    const mindchange = {
      forward: { count: 3, average: 50 },
      backward: { count: 0, average: 0 },
    };

    const { result } = renderHook(() => useMindchangeRenderConfig(mindchange, 'support'));

    expect(result.current).toMatchObject({
      mode: 'normal',
      markerStart: undefined,
      markerEnd: undefined,
    });
  });

  it('memoizes result and only recalculates when inputs change', () => {
    const mindchange = {
      forward: { count: 3, average: 50 },
      backward: { count: 0, average: 0 },
    };

    const { result, rerender } = renderHook(
      ({ mc, type }) => useMindchangeRenderConfig(mc, type),
      { initialProps: { mc: mindchange, type: 'negation' } }
    );

    const firstResult = result.current;

    // Rerender with same props
    rerender({ mc: mindchange, type: 'negation' });

    // Should return same object reference (memoized)
    expect(result.current).toBe(firstResult);
  });

  it('recalculates when mindchange data changes', () => {
    const initialMindchange = {
      forward: { count: 3, average: 50 },
      backward: { count: 0, average: 0 },
    };

    const { result, rerender } = renderHook(
      ({ mc, type }) => useMindchangeRenderConfig(mc, type),
      { initialProps: { mc: initialMindchange, type: 'negation' } }
    );

    const firstResult = result.current;

    const newMindchange = {
      forward: { count: 3, average: 50 },
      backward: { count: 2, average: -30 },
    };

    rerender({ mc: newMindchange, type: 'negation' });

    expect(result.current).not.toBe(firstResult);
    expect(result.current.mode).toBe('bidirectional');
  });

  it('objection edges show bidirectional with arrows when both directions exist', () => {
    const bothDirections = {
      forward: { count: 2, average: 25 },
      backward: { count: 3, average: -15 },
    };
    const forwardOnly = {
      forward: { count: 2, average: 25 },
      backward: { count: 0, average: 0 },
    };
    const backwardOnly = {
      forward: { count: 0, average: 0 },
      backward: { count: 3, average: -15 },
    };

    // Both directions = bidirectional mode (two lines with arrows)
    const { result: r1 } = renderHook(() => useMindchangeRenderConfig(bothDirections, 'objection'));
    expect(r1.current.mode).toBe('bidirectional');
    expect(r1.current.markerId).toBe('arrow-objection');
    expect(r1.current.markerStart).toBeUndefined();
    expect(r1.current.markerEnd).toBeUndefined();

    // Single direction = normal mode with single arrow
    const { result: r2 } = renderHook(() => useMindchangeRenderConfig(forwardOnly, 'objection'));
    expect(r2.current.mode).toBe('normal');
    expect(r2.current.markerStart).toBeUndefined();
    expect(r2.current.markerEnd).toBe('url(#arrow-objection)');

    const { result: r3 } = renderHook(() => useMindchangeRenderConfig(backwardOnly, 'objection'));
    expect(r3.current.mode).toBe('normal');
    expect(r3.current.markerStart).toBe('url(#arrow-objection)');
    expect(r3.current.markerEnd).toBeUndefined();
  });
});
