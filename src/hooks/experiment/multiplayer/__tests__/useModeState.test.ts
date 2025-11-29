import { renderHook, act } from '@testing-library/react';
import { useModeState } from '../useModeState';

describe('useModeState', () => {
  it('initializes with default state', () => {
    const { result } = renderHook(() => useModeState());

    expect(result.current.grabMode).toBe(false);
    expect(result.current.perfBoost).toBe(false);
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


  it('calculates selectMode correctly based on other modes', () => {
    const { result } = renderHook(() => useModeState());

    // Initially selectMode should be true
    expect(result.current.selectMode).toBe(true);

    // When grabMode is enabled, selectMode should be false
    act(() => {
      result.current.setGrabMode(true);
    });
    expect(result.current.selectMode).toBe(false);

    // When grabMode is disabled, selectMode should be true
    act(() => {
      result.current.setGrabMode(false);
    });
    expect(result.current.selectMode).toBe(true);
  });

  it('can set multiple states independently', () => {
    const { result } = renderHook(() => useModeState());

    act(() => {
      result.current.setGrabMode(true);
      result.current.setPerfBoost(true);
    });

    expect(result.current.grabMode).toBe(true);
    expect(result.current.perfBoost).toBe(true);
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

});
