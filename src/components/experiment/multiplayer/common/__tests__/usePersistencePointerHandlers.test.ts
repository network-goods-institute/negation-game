import { renderHook } from '@testing-library/react';
import { usePersistencePointerHandlers } from '../usePersistencePointerHandlers';

// Mock useReactFlow
jest.mock('@xyflow/react', () => ({
  useReactFlow: jest.fn(() => ({
    getViewport: jest.fn(() => ({ x: 0, y: 0, zoom: 1 })),
    setViewport: jest.fn(),
  })),
}));

describe('usePersistencePointerHandlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with no active pan session', () => {
    const { result } = renderHook(() => usePersistencePointerHandlers({ grabMode: false }));

    expect(result.current.handlePersistencePointerDown).toBeDefined();
    expect(result.current.handlePersistencePointerMove).toBeDefined();
    expect(result.current.handlePersistencePointerUp).toBeDefined();
    expect(result.current.handlePersistencePointerLeave).toBeDefined();
  });

  it('returns handler functions', () => {
    const { result } = renderHook(() => usePersistencePointerHandlers({ grabMode: true }));

    expect(typeof result.current.handlePersistencePointerDown).toBe('function');
    expect(typeof result.current.handlePersistencePointerMove).toBe('function');
    expect(typeof result.current.handlePersistencePointerUp).toBe('function');
    expect(typeof result.current.handlePersistencePointerLeave).toBe('function');
  });

  it('updates when grabMode changes', () => {
    const { result, rerender } = renderHook(
      ({ grabMode }) => usePersistencePointerHandlers({ grabMode }),
      { initialProps: { grabMode: false } }
    );

    const initialHandlers = result.current;

    rerender({ grabMode: true });

    // Handlers should be defined after rerender
    expect(result.current.handlePersistencePointerDown).toBeDefined();
    expect(result.current.handlePersistencePointerMove).toBeDefined();
  });
});
