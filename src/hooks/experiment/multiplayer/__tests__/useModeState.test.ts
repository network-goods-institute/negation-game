import { renderHook, act } from '@testing-library/react';
import { useModeState } from '../useModeState';

describe('useModeState', () => {
  it('initializes with default state', () => {
    const { result } = renderHook(() => useModeState());

    expect(result.current.grabMode).toBe(false);
    expect(result.current.perfBoost).toBe(false);
    expect(result.current.mindchangeSelectMode).toBe(false);
    expect(result.current.mindchangeEdgeId).toBe(null);
    expect(result.current.mindchangeNextDir).toBe(null);
    expect(result.current.selectMode).toBe(true);
  });

  it('updates grabMode when setGrabMode is called', () => {
    const { result } = renderHook(() => useModeState());

    act(() => {
      result.current.setGrabMode(true);
    });

    expect(result.current.grabMode).toBe(true);
    expect(result.current.selectMode).toBe(false); // selectMode should be false when grabMode is true
  });

  it('updates perfBoost when setPerfBoost is called', () => {
    const { result } = renderHook(() => useModeState());

    act(() => {
      result.current.setPerfBoost(true);
    });

    expect(result.current.perfBoost).toBe(true);
  });

  it('updates mindchangeSelectMode when setMindchangeSelectMode is called', () => {
    const { result } = renderHook(() => useModeState());

    act(() => {
      result.current.setMindchangeSelectMode(true);
    });

    expect(result.current.mindchangeSelectMode).toBe(true);
    expect(result.current.selectMode).toBe(false);
  });

  it('updates mindchangeEdgeId when setMindchangeEdgeId is called', () => {
    const { result } = renderHook(() => useModeState());

    act(() => {
      result.current.setMindchangeEdgeId('edge123');
    });

    expect(result.current.mindchangeEdgeId).toBe('edge123');
  });

  it('updates mindchangeNextDir when setMindchangeNextDir is called', () => {
    const { result } = renderHook(() => useModeState());

    act(() => {
      result.current.setMindchangeNextDir('forward');
    });

    expect(result.current.mindchangeNextDir).toBe('forward');
  });

  it('calculates selectMode correctly based on other modes', () => {
    const { result } = renderHook(() => useModeState());

    // Initially selectMode should be true
    expect(result.current.selectMode).toBe(true);

    // When grabMode is enabled, selectMode should be false
    act(() => {
      result.current.setGrabMode(true);
    });
    expect(result.current.selectMode).toBe(false);

    // When grabMode is disabled but mindchangeSelectMode is enabled
    act(() => {
      result.current.setGrabMode(false);
      result.current.setMindchangeSelectMode(true);
    });
    expect(result.current.selectMode).toBe(false);

    // When both are disabled, selectMode should be true
    act(() => {
      result.current.setMindchangeSelectMode(false);
    });
    expect(result.current.selectMode).toBe(true);
  });

  it('can set multiple states independently', () => {
    const { result } = renderHook(() => useModeState());

    act(() => {
      result.current.setGrabMode(true);
      result.current.setPerfBoost(true);
      result.current.setMindchangeEdgeId('edge456');
      result.current.setMindchangeNextDir('backward');
    });

    expect(result.current.grabMode).toBe(true);
    expect(result.current.perfBoost).toBe(true);
    expect(result.current.mindchangeEdgeId).toBe('edge456');
    expect(result.current.mindchangeNextDir).toBe('backward');
  });

  it('can toggle modes back and forth', () => {
    const { result } = renderHook(() => useModeState());

    act(() => {
      result.current.setGrabMode(true);
    });
    expect(result.current.grabMode).toBe(true);

    act(() => {
      result.current.setGrabMode(false);
    });
    expect(result.current.grabMode).toBe(false);
  });

  it('can clear mindchangeEdgeId by setting to null', () => {
    const { result } = renderHook(() => useModeState());

    act(() => {
      result.current.setMindchangeEdgeId('edge789');
    });
    expect(result.current.mindchangeEdgeId).toBe('edge789');

    act(() => {
      result.current.setMindchangeEdgeId(null);
    });
    expect(result.current.mindchangeEdgeId).toBe(null);
  });
});
