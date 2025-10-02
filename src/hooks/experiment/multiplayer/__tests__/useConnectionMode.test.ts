import { renderHook, act } from '@testing-library/react';
import { useConnectionMode } from '../useConnectionMode';

describe('useConnectionMode', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() => useConnectionMode());

    expect(result.current.connectMode).toBe(false);
    expect(result.current.connectAnchorId).toBeNull();
    expect(result.current.connectCursor).toBeNull();
    expect(result.current.connectAnchorRef.current).toBeNull();
  });

  it('sets connect mode', () => {
    const { result } = renderHook(() => useConnectionMode());

    act(() => {
      result.current.setConnectMode(true);
    });

    expect(result.current.connectMode).toBe(true);
  });

  it('sets connect anchor ID', () => {
    const { result } = renderHook(() => useConnectionMode());

    act(() => {
      result.current.setConnectAnchorId('node-123');
    });

    expect(result.current.connectAnchorId).toBe('node-123');
  });

  it('sets connect cursor position', () => {
    const { result } = renderHook(() => useConnectionMode());

    act(() => {
      result.current.setConnectCursor({ x: 100, y: 200 });
    });

    expect(result.current.connectCursor).toEqual({ x: 100, y: 200 });
  });

  it('clearConnect resets all connection state', () => {
    const { result } = renderHook(() => useConnectionMode());

    act(() => {
      result.current.setConnectMode(true);
      result.current.setConnectAnchorId('node-123');
      result.current.setConnectCursor({ x: 100, y: 200 });
    });

    act(() => {
      result.current.clearConnect();
    });

    expect(result.current.connectMode).toBe(false);
    expect(result.current.connectAnchorId).toBeNull();
    expect(result.current.connectCursor).toBeNull();
  });

  it('cancelConnect resets all connection state and mode', () => {
    const { result } = renderHook(() => useConnectionMode());

    act(() => {
      result.current.setConnectMode(true);
      result.current.setConnectAnchorId('node-123');
      result.current.connectAnchorRef.current = 'node-123';
      result.current.setConnectCursor({ x: 100, y: 200 });
    });

    act(() => {
      result.current.cancelConnect();
    });

    expect(result.current.connectMode).toBe(false);
    expect(result.current.connectAnchorId).toBeNull();
    expect(result.current.connectCursor).toBeNull();
    expect(result.current.connectAnchorRef.current).toBeNull();
  });

  it('clears anchor ID when set to null', () => {
    const { result } = renderHook(() => useConnectionMode());

    act(() => {
      result.current.setConnectAnchorId('node-123');
      result.current.connectAnchorRef.current = 'node-123';
      result.current.setConnectCursor({ x: 100, y: 200 });
    });

    act(() => {
      result.current.setConnectAnchorId(null);
    });

    // Effect should clear ref and cursor when anchorId becomes null
    expect(result.current.connectAnchorRef.current).toBeNull();
    expect(result.current.connectCursor).toBeNull();
  });

  it('clears connection state when mode is disabled', () => {
    const { result } = renderHook(() => useConnectionMode());

    act(() => {
      result.current.setConnectMode(true);
      result.current.setConnectAnchorId('node-123');
      result.current.connectAnchorRef.current = 'node-123';
      result.current.setConnectCursor({ x: 100, y: 200 });
    });

    act(() => {
      result.current.setConnectMode(false);
    });

    // Effect should clear all state when mode is disabled
    expect(result.current.connectAnchorId).toBeNull();
    expect(result.current.connectAnchorRef.current).toBeNull();
    expect(result.current.connectCursor).toBeNull();
  });
});
