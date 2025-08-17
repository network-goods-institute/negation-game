import { renderHook, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@privy-io/react-auth', () => ({
    usePrivy: jest.fn(),
}));

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

global.indexedDB = {
    open: jest.fn().mockImplementation(() => new MockIDBRequest()),
} as any;

import { useVisitedPoints } from '../points/useVisitedPoints';
import { usePrivy } from '@privy-io/react-auth';

describe('useVisitedPoints', () => {
    beforeAll(() => {
        jest.useFakeTimers();
    });

    afterAll(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    beforeEach(() => {
        jest.clearAllMocks();
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

        await waitFor(() => {
            const openRequest = global.indexedDB.open('appStorage', 2);
            if (openRequest.onsuccess) {
                openRequest.onsuccess(new Event('success') as any);
            }
        });

        act(() => {
            result.current.markPointAsRead(123);
        });

        act(() => {
            jest.advanceTimersByTime(1100); // just over 1 second
        });

    });

    it('should always return true for isVisited when not authenticated', async () => {
        (usePrivy as jest.Mock).mockReturnValue({ user: null });

        const { result } = renderHook(() => useVisitedPoints());

        const isVisited = await result.current.isVisited(123);

        expect(isVisited).toBe(true);
    });

    it('should not try to mark a point as read when not authenticated', async () => {
        (usePrivy as jest.Mock).mockReturnValue({ user: null });

        const { result } = renderHook(() => useVisitedPoints());

        act(() => {
            result.current.markPointAsRead(123);
        });

        act(() => {
            jest.advanceTimersByTime(1100); // just over 1 second
        });

    });

    it('should return an empty map for arePointsVisited when not authenticated', async () => {
        (usePrivy as jest.Mock).mockReturnValue({ user: null });

        const { result } = renderHook(() => useVisitedPoints());

        const visitedMap = await result.current.arePointsVisited([123, 456, 789]);

        expect(visitedMap.size).toBe(0);
    });
}); 