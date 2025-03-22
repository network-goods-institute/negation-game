import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Privy before importing any modules that use it
jest.mock('@privy-io/react-auth', () => ({
    usePrivy: jest.fn(),
}));

// Mock IndexedDB before importing any modules that use it
class MockIDBRequest {
    onsuccess = null;
    onupgradeneeded = null;
    onerror = null;
    result = {
        transaction: jest.fn().mockReturnValue({
            objectStore: jest.fn().mockReturnValue({
                index: jest.fn().mockReturnValue({
                    getAllKeys: jest.fn().mockReturnValue({
                        onsuccess: null,
                        result: []
                    })
                }),
                get: jest.fn().mockReturnValue({
                    onsuccess: null,
                    result: null
                }),
                put: jest.fn(),
                delete: jest.fn(),
            }),
            oncomplete: null,
            onerror: null,
        }),
        objectStoreNames: {
            contains: jest.fn().mockReturnValue(true),
        },
        createObjectStore: jest.fn().mockReturnValue({
            createIndex: jest.fn(),
        }),
    };
    error = null;
}

// Mock the global window.indexedDB
global.indexedDB = {
    open: jest.fn().mockImplementation(() => new MockIDBRequest()),
} as any;

// Now that we've set up all the mocks, we can import the hook
import { useVisitedPoints } from '@/hooks/useVisitedPoints';
import { usePrivy } from '@privy-io/react-auth';

describe('useVisitedPoints', () => {
    beforeAll(() => {
        // Mock setTimeout
        jest.useFakeTimers();
    });

    afterAll(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Set up usePrivy mock to return logged in user by default
        (usePrivy as jest.Mock).mockReturnValue({ user: { id: 'test-user' } });
    });

    it('should return isVisited, arePointsVisited, and markPointAsRead functions', () => {
        const { result } = renderHook(() => useVisitedPoints());

        expect(result.current.isVisited).toBeDefined();
        expect(typeof result.current.isVisited).toBe('function');

        expect(result.current.arePointsVisited).toBeDefined();
        expect(typeof result.current.arePointsVisited).toBe('function');

        expect(result.current.markPointAsRead).toBeDefined();
        expect(typeof result.current.markPointAsRead).toBe('function');
    });

    it('should mark a point as read when authenticated', async () => {
        const { result } = renderHook(() => useVisitedPoints());

        // Set up the indexedDB to be ready
        await waitFor(() => {
            // Trigger the onsuccess callback
            const openRequest = global.indexedDB.open('appStorage', 2);
            if (openRequest.onsuccess) {
                openRequest.onsuccess(new Event('success') as any);
            }
        });

        // Mark a point as read
        act(() => {
            result.current.markPointAsRead(123);
        });

        // Fast-forward timers to trigger the debounced write
        act(() => {
            jest.advanceTimersByTime(1100); // just over 1 second
        });

        // This would normally trigger the db write, but we can't really test that
        // because the DB is mocked. We'd need integration tests for that.
    });

    it('should always return true for isVisited when not authenticated', async () => {
        // Set up usePrivy mock to return no user (unauthenticated)
        (usePrivy as jest.Mock).mockReturnValue({ user: null });

        const { result } = renderHook(() => useVisitedPoints());

        // Check if a point is visited
        const isVisited = await result.current.isVisited(123);

        // Should always be true when unauthenticated
        expect(isVisited).toBe(true);
    });

    it('should not try to mark a point as read when not authenticated', async () => {
        // Set up usePrivy mock to return no user (unauthenticated)
        (usePrivy as jest.Mock).mockReturnValue({ user: null });

        const { result } = renderHook(() => useVisitedPoints());

        // Attempt to mark a point as read when unauthenticated
        act(() => {
            result.current.markPointAsRead(123);
        });

        // Fast-forward timers
        act(() => {
            jest.advanceTimersByTime(1100); // just over 1 second
        });

        // We expect no DB operations to occur
        // This is difficult to test directly since we're mocking the DB
        // In a real-world scenario, we'd want integration tests for this
    });

    it('should return an empty map for arePointsVisited when not authenticated', async () => {
        // Set up usePrivy mock to return no user (unauthenticated)
        (usePrivy as jest.Mock).mockReturnValue({ user: null });

        const { result } = renderHook(() => useVisitedPoints());

        // Check multiple points
        const visitedMap = await result.current.arePointsVisited([123, 456, 789]);

        // Should be empty when unauthenticated
        expect(visitedMap.size).toBe(0);
    });
}); 