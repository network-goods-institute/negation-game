import { renderHook, act } from "@testing-library/react";
import { useVisitedPoints } from "./useVisitedPoints";
import { usePrivy } from "@privy-io/react-auth";
import { useSetAtom } from "jotai";

// Mock dependencies
jest.mock("@privy-io/react-auth", () => ({
  usePrivy: jest.fn(),
}));

jest.mock("jotai", () => ({
  useSetAtom: jest.fn(),
}));

// Mock IndexedDB
const indexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
};

const mockDB = {
  createObjectStore: jest.fn(),
  transaction: jest.fn(),
  objectStoreNames: { contains: jest.fn() },
};

const mockTransaction = {
  objectStore: jest.fn(),
  oncomplete: null,
  onerror: null,
};

const mockObjectStore = {
  put: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  index: jest.fn(),
};

describe("useVisitedPoints", () => {
  beforeEach(() => {
    // Setup mocks
    (global as any).indexedDB = indexedDB;

    // Mock usePrivy to return a logged in user
    (usePrivy as jest.Mock).mockReturnValue({
      user: { id: "test-user" },
    });

    // Mock setAtom function
    const mockSetAtom = jest.fn();
    (useSetAtom as jest.Mock).mockReturnValue(mockSetAtom);

    // Setup IndexedDB mock chain
    indexedDB.open.mockReturnValue({
      result: mockDB,
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
    });

    mockDB.transaction.mockReturnValue(mockTransaction);
    mockTransaction.objectStore.mockReturnValue(mockObjectStore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should mark point as read and persist in both IndexedDB and atom", async () => {
    // Setup
    const mockSetVisitedPoints = jest.fn();
    (useSetAtom as jest.Mock).mockReturnValue(mockSetVisitedPoints);

    // Render hook
    const { result } = renderHook(() => useVisitedPoints());

    // Mock successful DB initialization
    act(() => {
      indexedDB.open().onsuccess?.({} as Event);
    });

    // Mark point as read
    await act(async () => {
      result.current.markPointAsRead(123);
    });

    // Verify atom was updated
    expect(mockSetVisitedPoints).toHaveBeenCalled();

    // Verify IndexedDB write was queued
    // Note: We can't easily verify the actual IndexedDB write due to the debounce,
    // but we can verify the write was attempted
    expect(mockObjectStore.put).toHaveBeenCalled();
  });

  it("should initialize with existing visited points from IndexedDB", async () => {
    // Setup mock DB with existing points
    const mockVisitedPoints = [
      { pointId: 1, timestamp: Date.now() },
      { pointId: 2, timestamp: Date.now() },
    ];

    mockObjectStore.getAll.mockImplementation(() => ({
      onsuccess: function () {
        this.result = mockVisitedPoints;
      },
    }));

    // Render hook
    renderHook(() => useVisitedPoints());

    // Trigger DB initialization
    act(() => {
      indexedDB.open().onsuccess?.({} as Event);
    });

    // Verify atom was initialized with existing points
    const mockSetVisitedPoints = useSetAtom as jest.Mock;
    expect(mockSetVisitedPoints).toHaveBeenCalled();
    expect(mockSetVisitedPoints.mock.calls[0][0]).toBeInstanceOf(Set);
    expect(mockSetVisitedPoints.mock.calls[0][0].has(1)).toBe(true);
    expect(mockSetVisitedPoints.mock.calls[0][0].has(2)).toBe(true);
  });

  it("should maintain read state across hook remounts", async () => {
    // Setup
    const mockSetVisitedPoints = jest.fn();
    (useSetAtom as jest.Mock).mockReturnValue(mockSetVisitedPoints);

    // First mount
    const { result, rerender } = renderHook(() => useVisitedPoints());

    // Mark point as read
    await act(async () => {
      result.current.markPointAsRead(123);
    });

    // Rerender hook (simulating component remount)
    rerender();

    // Verify the read state was maintained
    expect(mockSetVisitedPoints).toHaveBeenCalledTimes(2); // Once for initial mount, once for markAsRead

    // The second call should include the point we marked as read
    const secondCallArg = mockSetVisitedPoints.mock.calls[1][0];
    expect(secondCallArg instanceof Set).toBe(true);
    expect(secondCallArg.has(123)).toBe(true);
  });
});
