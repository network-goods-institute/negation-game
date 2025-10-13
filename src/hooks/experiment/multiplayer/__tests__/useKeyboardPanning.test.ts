import { renderHook, act } from '@testing-library/react';
import { useKeyboardPanning } from '../useKeyboardPanning';
import { useReactFlow } from '@xyflow/react';

// Mock React Flow
jest.mock('@xyflow/react', () => ({
  useReactFlow: jest.fn(),
}));

describe('useKeyboardPanning', () => {
  let mockSetViewport: jest.Mock;
  let mockGetViewport: jest.Mock;
  let mockForceSave: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    mockSetViewport = jest.fn();
    mockGetViewport = jest.fn().mockReturnValue({ x: 0, y: 0, zoom: 1 });
    mockForceSave = jest.fn();

    (useReactFlow as jest.Mock).mockReturnValue({
      setViewport: mockSetViewport,
      getViewport: mockGetViewport,
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Modifier Key Blocking', () => {
    it('should block panning when Shift key is held with WASD', () => {
      renderHook(() => useKeyboardPanning({ enabled: true }));

      // Simulate Shift+W keydown
      const event = new KeyboardEvent('keydown', {
        key: 'w',
        shiftKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      // Run any pending timers
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should NOT call setViewport
      expect(mockSetViewport).not.toHaveBeenCalled();
    });

    it('should block panning when Ctrl key is held with arrow keys', () => {
      renderHook(() => useKeyboardPanning({ enabled: true }));

      // Simulate Ctrl+ArrowUp keydown
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        ctrlKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(mockSetViewport).not.toHaveBeenCalled();
    });

    it('should block panning when Alt key is held with WASD', () => {
      renderHook(() => useKeyboardPanning({ enabled: true }));

      const event = new KeyboardEvent('keydown', {
        key: 's',
        altKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(mockSetViewport).not.toHaveBeenCalled();
    });

    it('should block panning when Meta key is held with arrow keys', () => {
      renderHook(() => useKeyboardPanning({ enabled: true }));

      const event = new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(mockSetViewport).not.toHaveBeenCalled();
    });

    it('should allow panning without modifier keys', () => {
      renderHook(() => useKeyboardPanning({ enabled: true }));

      const event = new KeyboardEvent('keydown', {
        key: 'w',
        bubbles: true,
      });
      window.dispatchEvent(event);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      // Should call setViewport for panning
      expect(mockSetViewport).toHaveBeenCalled();
    });
  });

  describe('Cmd+S / Ctrl+S Save Shortcut', () => {
    it('should call forceSave when Cmd+S is pressed', () => {
      renderHook(() => useKeyboardPanning({
        enabled: true,
        forceSave: mockForceSave,
      }));

      const event = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        bubbles: true,
      });

      Object.defineProperty(event, 'preventDefault', {
        value: jest.fn(),
      });

      window.dispatchEvent(event);

      expect(mockForceSave).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should call forceSave when Ctrl+S is pressed', () => {
      renderHook(() => useKeyboardPanning({
        enabled: true,
        forceSave: mockForceSave,
      }));

      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
      });

      Object.defineProperty(event, 'preventDefault', {
        value: jest.fn(),
      });

      window.dispatchEvent(event);

      expect(mockForceSave).toHaveBeenCalledTimes(1);
    });

    it('should not pan when Cmd+S is pressed', () => {
      renderHook(() => useKeyboardPanning({
        enabled: true,
        forceSave: mockForceSave,
      }));

      const event = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should NOT pan, only save
      expect(mockSetViewport).not.toHaveBeenCalled();
      expect(mockForceSave).toHaveBeenCalled();
    });

    it('should handle save when forceSave is not provided', () => {
      renderHook(() => useKeyboardPanning({ enabled: true }));

      const event = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        bubbles: true,
      });

      Object.defineProperty(event, 'preventDefault', {
        value: jest.fn(),
      });

      // Should not throw
      expect(() => {
        window.dispatchEvent(event);
      }).not.toThrow();

      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe('Normal Panning', () => {
    it('should pan when regular S is pressed (no modifiers)', () => {
      renderHook(() => useKeyboardPanning({ enabled: true }));

      const event = new KeyboardEvent('keydown', {
        key: 's',
        bubbles: true,
      });
      window.dispatchEvent(event);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      // Should pan normally
      expect(mockSetViewport).toHaveBeenCalled();
    });

    it('should pan when W is pressed without modifiers', () => {
      renderHook(() => useKeyboardPanning({ enabled: true }));

      const keydown = new KeyboardEvent('keydown', {
        key: 'w',
        bubbles: true,
      });
      window.dispatchEvent(keydown);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      expect(mockSetViewport).toHaveBeenCalled();
      const calls = mockSetViewport.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0].y).toBeGreaterThan(0); // Panning up
    });

    it('should stop panning when key is released', () => {
      renderHook(() => useKeyboardPanning({ enabled: true }));

      // Press key
      const keydown = new KeyboardEvent('keydown', {
        key: 'd',
        bubbles: true,
      });
      window.dispatchEvent(keydown);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      const callsAfterPress = mockSetViewport.mock.calls.length;
      expect(callsAfterPress).toBeGreaterThan(0);

      // Release key
      const keyup = new KeyboardEvent('keyup', {
        key: 'd',
        bubbles: true,
      });
      window.dispatchEvent(keyup);

      mockSetViewport.mockClear();

      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should not continue panning
      expect(mockSetViewport).not.toHaveBeenCalled();
    });
  });

  describe('Escape key for connect mode', () => {
    it('should call onCancelConnect when Escape is pressed in connect mode', () => {
      const mockCancelConnect = jest.fn();

      renderHook(() => useKeyboardPanning({
        enabled: true,
        connectMode: true,
        onCancelConnect: mockCancelConnect,
      }));

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      });

      Object.defineProperty(event, 'preventDefault', {
        value: jest.fn(),
      });

      window.dispatchEvent(event);

      expect(mockCancelConnect).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe('Editable element checks', () => {
    it('should not pan when focus is in input element', () => {
      renderHook(() => useKeyboardPanning({ enabled: true }));

      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'w',
        bubbles: true,
      });
      input.dispatchEvent(event);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(mockSetViewport).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });

    it('should not pan when focus is in textarea', () => {
      renderHook(() => useKeyboardPanning({ enabled: true }));

      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.focus();

      const event = new KeyboardEvent('keydown', {
        key: 's',
        bubbles: true,
      });
      textarea.dispatchEvent(event);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(mockSetViewport).not.toHaveBeenCalled();

      document.body.removeChild(textarea);
    });
  });

  describe('Enabled flag', () => {
    it('should not set up event listeners when disabled', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

      renderHook(() => useKeyboardPanning({ enabled: false }));

      expect(addEventListenerSpy).not.toHaveBeenCalled();

      addEventListenerSpy.mockRestore();
    });

    it('should not pan when enabled is false', () => {
      renderHook(() => useKeyboardPanning({ enabled: false }));

      const event = new KeyboardEvent('keydown', {
        key: 'w',
        bubbles: true,
      });
      window.dispatchEvent(event);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(mockSetViewport).not.toHaveBeenCalled();
    });
  });
});
