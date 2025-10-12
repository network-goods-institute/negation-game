import { renderHook, act } from '@testing-library/react';
import { useReactFlow } from '@xyflow/react';
import { useGraphWheelHandler } from '../useGraphWheelHandler';
import React from 'react';

jest.mock('@xyflow/react');

describe('useGraphWheelHandler', () => {
  let mockContainer: HTMLDivElement;
  let containerRef: React.RefObject<HTMLDivElement>;

  const mockRf = {
    getViewport: jest.fn(),
    setViewport: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (useReactFlow as jest.Mock).mockReturnValue(mockRf);

    // Mock document.elementFromPoint
    document.elementFromPoint = jest.fn().mockReturnValue(null);

    // Create mock container
    mockContainer = document.createElement('div');
    Object.defineProperty(mockContainer, 'getBoundingClientRect', {
      value: jest.fn(() => ({
        left: 0,
        top: 0,
        right: 1000,
        bottom: 800,
        width: 1000,
        height: 800,
      })),
    });
    document.body.appendChild(mockContainer);

    containerRef = { current: mockContainer };
    mockRf.getViewport.mockReturnValue({ x: 100, y: 100, zoom: 1 });
  });

  afterEach(() => {
    document.body.removeChild(mockContainer);
    jest.useRealTimers();
  });

  it('should register wheel event listener on mount', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

    renderHook(() => useGraphWheelHandler({ containerRef }));

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'wheel',
      expect.any(Function),
      expect.objectContaining({ passive: false, capture: true })
    );
  });

  it('should pan viewport on wheel event', () => {
    renderHook(() => useGraphWheelHandler({ containerRef }));

    const wheelEvent = new WheelEvent('wheel', {
      deltaX: 10,
      deltaY: 20,
      clientX: 500,
      clientY: 400,
      bubbles: true,
    });

    Object.defineProperty(wheelEvent, 'preventDefault', {
      value: jest.fn(),
      writable: true,
    });

    act(() => {
      window.dispatchEvent(wheelEvent);
      jest.runAllTimers();
    });

    expect(mockRf.setViewport).toHaveBeenCalledWith(
      {
        x: 90, // 100 + (-10) - reversed delta
        y: 80, // 100 + (-20) - reversed delta
        zoom: 1,
      },
      { duration: 0 }
    );
  });

  it('should reverse wheel deltas for natural scrolling', () => {
    renderHook(() => useGraphWheelHandler({ containerRef }));

    const wheelEvent = new WheelEvent('wheel', {
      deltaX: -15,
      deltaY: -30,
      clientX: 500,
      clientY: 400,
      bubbles: true,
    });

    Object.defineProperty(wheelEvent, 'preventDefault', {
      value: jest.fn(),
    });

    act(() => {
      window.dispatchEvent(wheelEvent);
      jest.runAllTimers();
    });

    expect(mockRf.setViewport).toHaveBeenCalledWith(
      {
        x: 115, // 100 + 15
        y: 130, // 100 + 30
        zoom: 1,
      },
      { duration: 0 }
    );
  });

  it('should batch multiple wheel events with RAF', () => {
    renderHook(() => useGraphWheelHandler({ containerRef }));

    const wheelEvent1 = new WheelEvent('wheel', {
      deltaX: 5,
      deltaY: 10,
      clientX: 500,
      clientY: 400,
      bubbles: true,
    });

    const wheelEvent2 = new WheelEvent('wheel', {
      deltaX: 3,
      deltaY: 7,
      clientX: 500,
      clientY: 400,
      bubbles: true,
    });

    Object.defineProperty(wheelEvent1, 'preventDefault', { value: jest.fn() });
    Object.defineProperty(wheelEvent2, 'preventDefault', { value: jest.fn() });

    act(() => {
      window.dispatchEvent(wheelEvent1);
      window.dispatchEvent(wheelEvent2);
      jest.runAllTimers();
    });

    // Should batch both deltas together
    expect(mockRf.setViewport).toHaveBeenCalledTimes(1);
    expect(mockRf.setViewport).toHaveBeenCalledWith(
      {
        x: 92, // 100 + (-5 + -3)
        y: 83, // 100 + (-10 + -7)
        zoom: 1,
      },
      { duration: 0 }
    );
  });

  it('should ignore wheel events with ctrl key (pinch-zoom)', () => {
    renderHook(() => useGraphWheelHandler({ containerRef }));

    const wheelEvent = new WheelEvent('wheel', {
      deltaX: 10,
      deltaY: 20,
      clientX: 500,
      clientY: 400,
      ctrlKey: true,
      bubbles: true,
    });

    act(() => {
      window.dispatchEvent(wheelEvent);
      jest.runAllTimers();
    });

    expect(mockRf.setViewport).not.toHaveBeenCalled();
  });

  it('should ignore wheel events with meta key', () => {
    renderHook(() => useGraphWheelHandler({ containerRef }));

    const wheelEvent = new WheelEvent('wheel', {
      deltaX: 10,
      deltaY: 20,
      clientX: 500,
      clientY: 400,
      metaKey: true,
      bubbles: true,
    });

    act(() => {
      window.dispatchEvent(wheelEvent);
      jest.runAllTimers();
    });

    expect(mockRf.setViewport).not.toHaveBeenCalled();
  });

  it('should ignore wheel events outside canvas bounds', () => {
    renderHook(() => useGraphWheelHandler({ containerRef }));

    const wheelEvent = new WheelEvent('wheel', {
      deltaX: 10,
      deltaY: 20,
      clientX: 1500, // Outside bounds
      clientY: 400,
      bubbles: true,
    });

    act(() => {
      window.dispatchEvent(wheelEvent);
      jest.runAllTimers();
    });

    expect(mockRf.setViewport).not.toHaveBeenCalled();
  });

  it('should ignore wheel events on editable elements', () => {
    renderHook(() => useGraphWheelHandler({ containerRef }));

    const input = document.createElement('input');
    mockContainer.appendChild(input);

    // Mock elementFromPoint to return the input
    (document.elementFromPoint as jest.Mock).mockReturnValue(input);

    const wheelEvent = new WheelEvent('wheel', {
      deltaX: 10,
      deltaY: 20,
      clientX: 500,
      clientY: 400,
      bubbles: true,
    });

    act(() => {
      window.dispatchEvent(wheelEvent);
      jest.runAllTimers();
    });

    expect(mockRf.setViewport).not.toHaveBeenCalled();

    mockContainer.removeChild(input);
  });

  it('should ignore wheel events on textarea elements', () => {
    renderHook(() => useGraphWheelHandler({ containerRef }));

    const textarea = document.createElement('textarea');
    mockContainer.appendChild(textarea);

    (document.elementFromPoint as jest.Mock).mockReturnValue(textarea);

    const wheelEvent = new WheelEvent('wheel', {
      deltaX: 10,
      deltaY: 20,
      clientX: 500,
      clientY: 400,
      bubbles: true,
    });

    act(() => {
      window.dispatchEvent(wheelEvent);
      jest.runAllTimers();
    });

    expect(mockRf.setViewport).not.toHaveBeenCalled();

    mockContainer.removeChild(textarea);
  });

  it('should ignore wheel events on contentEditable elements', () => {
    renderHook(() => useGraphWheelHandler({ containerRef }));

    const div = document.createElement('div');
    // Set contentEditable using setAttribute and set isContentEditable property
    div.setAttribute('contenteditable', 'true');
    Object.defineProperty(div, 'isContentEditable', {
      value: true,
      writable: false,
    });
    mockContainer.appendChild(div);

    // Mock elementFromPoint to return the contentEditable div
    (document.elementFromPoint as jest.Mock).mockReturnValue(div);

    const wheelEvent = new WheelEvent('wheel', {
      deltaX: 10,
      deltaY: 20,
      clientX: 500,
      clientY: 400,
      bubbles: true,
    });

    act(() => {
      window.dispatchEvent(wheelEvent);
      jest.runAllTimers();
    });

    expect(mockRf.setViewport).not.toHaveBeenCalled();

    mockContainer.removeChild(div);
  });

  it('should prevent default behavior on valid wheel events', () => {
    renderHook(() => useGraphWheelHandler({ containerRef }));

    const preventDefaultSpy = jest.fn();
    const wheelEvent = new WheelEvent('wheel', {
      deltaX: 10,
      deltaY: 20,
      clientX: 500,
      clientY: 400,
      bubbles: true,
    });

    Object.defineProperty(wheelEvent, 'preventDefault', {
      value: preventDefaultSpy,
    });

    act(() => {
      window.dispatchEvent(wheelEvent);
      jest.runAllTimers();
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should clean up event listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useGraphWheelHandler({ containerRef }));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'wheel',
      expect.any(Function),
      expect.objectContaining({ capture: true })
    );
  });

  it('should cancel pending RAF updates on unmount', () => {
    const cancelAnimationFrameSpy = jest.spyOn(window, 'cancelAnimationFrame');

    const { unmount } = renderHook(() => useGraphWheelHandler({ containerRef }));

    const wheelEvent = new WheelEvent('wheel', {
      deltaX: 10,
      deltaY: 20,
      clientX: 500,
      clientY: 400,
      bubbles: true,
    });

    Object.defineProperty(wheelEvent, 'preventDefault', { value: jest.fn() });

    act(() => {
      window.dispatchEvent(wheelEvent);
      // Don't run timers, unmount immediately
    });

    unmount();

    expect(cancelAnimationFrameSpy).toHaveBeenCalled();
  });

  it('should handle null containerRef gracefully', () => {
    const nullRef = { current: null };

    // Should not throw
    expect(() => {
      renderHook(() => useGraphWheelHandler({ containerRef: nullRef }));
    }).not.toThrow();
  });

  it('should handle missing viewport gracefully', () => {
    mockRf.getViewport.mockReturnValue(null);

    renderHook(() => useGraphWheelHandler({ containerRef }));

    const wheelEvent = new WheelEvent('wheel', {
      deltaX: 10,
      deltaY: 20,
      clientX: 500,
      clientY: 400,
      bubbles: true,
    });

    Object.defineProperty(wheelEvent, 'preventDefault', { value: jest.fn() });

    act(() => {
      window.dispatchEvent(wheelEvent);
      jest.runAllTimers();
    });

    expect(mockRf.setViewport).not.toHaveBeenCalled();
  });
});
