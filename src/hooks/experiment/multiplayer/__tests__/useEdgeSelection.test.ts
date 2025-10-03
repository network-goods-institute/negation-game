import { renderHook, act } from '@testing-library/react';
import { useEdgeSelection } from '../useEdgeSelection';

describe('useEdgeSelection', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => useEdgeSelection());

    expect(result.current.hoveredEdgeId).toBeNull();
    expect(result.current.selectedEdgeId).toBeNull();
  });

  it('sets hovered edge ID', () => {
    const { result } = renderHook(() => useEdgeSelection());

    act(() => {
      result.current.setHoveredEdgeId('edge-123');
    });

    expect(result.current.hoveredEdgeId).toBe('edge-123');
  });

  it('sets selected edge ID', () => {
    const { result } = renderHook(() => useEdgeSelection());

    act(() => {
      result.current.setSelectedEdgeId('edge-123');
    });

    expect(result.current.selectedEdgeId).toBe('edge-123');
  });

  it('revealEdgeTemporarily sets both hover and select states', () => {
    const { result } = renderHook(() => useEdgeSelection());

    act(() => {
      result.current.revealEdgeTemporarily('edge-123');
    });

    expect(result.current.hoveredEdgeId).toBe('edge-123');
    expect(result.current.selectedEdgeId).toBe('edge-123');
  });

  it('revealEdgeTemporarily clears states after default duration', () => {
    const { result } = renderHook(() => useEdgeSelection());

    act(() => {
      result.current.revealEdgeTemporarily('edge-123');
    });

    expect(result.current.hoveredEdgeId).toBe('edge-123');
    expect(result.current.selectedEdgeId).toBe('edge-123');

    act(() => {
      jest.advanceTimersByTime(3500);
    });

    expect(result.current.hoveredEdgeId).toBeNull();
    expect(result.current.selectedEdgeId).toBeNull();
  });

  it('revealEdgeTemporarily accepts custom duration', () => {
    const { result } = renderHook(() => useEdgeSelection());

    act(() => {
      result.current.revealEdgeTemporarily('edge-123', 1000);
    });

    expect(result.current.hoveredEdgeId).toBe('edge-123');

    act(() => {
      jest.advanceTimersByTime(999);
    });

    expect(result.current.hoveredEdgeId).toBe('edge-123');

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(result.current.hoveredEdgeId).toBeNull();
  });

  it('revealEdgeTemporarily cancels previous timeout when called multiple times', () => {
    const { result } = renderHook(() => useEdgeSelection());

    act(() => {
      result.current.revealEdgeTemporarily('edge-1', 2000);
    });

    expect(result.current.hoveredEdgeId).toBe('edge-1');

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Still showing edge-1
    expect(result.current.hoveredEdgeId).toBe('edge-1');

    // Call again with different edge
    act(() => {
      result.current.revealEdgeTemporarily('edge-2', 2000);
    });

    expect(result.current.hoveredEdgeId).toBe('edge-2');

    // Advance past where edge-1 would have cleared
    act(() => {
      jest.advanceTimersByTime(1500);
    });

    // Still showing edge-2 because timeout was reset
    expect(result.current.hoveredEdgeId).toBe('edge-2');

    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Now cleared
    expect(result.current.hoveredEdgeId).toBeNull();
  });

  it('does not clear if edge ID changed manually before timeout', () => {
    const { result } = renderHook(() => useEdgeSelection());

    act(() => {
      result.current.revealEdgeTemporarily('edge-123');
    });

    // Manually change to different edge
    act(() => {
      result.current.setHoveredEdgeId('edge-456');
    });

    // Advance past timeout
    act(() => {
      jest.advanceTimersByTime(3500);
    });

    // Should not clear because ID doesn't match
    expect(result.current.hoveredEdgeId).toBe('edge-456');
  });

  it('cleans up timeout on unmount', () => {
    const { result, unmount } = renderHook(() => useEdgeSelection());

    act(() => {
      result.current.revealEdgeTemporarily('edge-123');
    });

    unmount();

    // Should not throw
    act(() => {
      jest.advanceTimersByTime(3500);
    });
  });
});
