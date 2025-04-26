import { act } from '@testing-library/react';
import { renderHookWithProviders } from '@/lib/tests/hook-test-utils';
import { useAuthErrorHandling } from '@/hooks/useAuthErrorHandling';
import { handleAuthError } from '@/lib/auth/handleAuthError';
import { usePrivy } from '@privy-io/react-auth';

// Mock dependencies
jest.mock('@/lib/auth/handleAuthError', () => ({
    handleAuthError: jest.fn(),
    isAuthError: jest.fn().mockImplementation((error) => {
        if (!error) return false;
        const errorMessage = error instanceof Error ? error.message : String(error);
        return errorMessage.includes('auth') || errorMessage.includes('Authentication');
    }),
}));

jest.mock('@privy-io/react-auth', () => ({
    usePrivy: jest.fn().mockReturnValue({
        login: jest.fn(),
    }),
}));

describe('useAuthErrorHandling', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should return the expected functions and state', () => {
        const { result } = renderHookWithProviders(() => useAuthErrorHandling());

        expect(result.current.catchAuthError).toBeDefined();
        expect(typeof result.current.catchAuthError).toBe('function');
        expect(result.current.withAuthErrorHandling).toBeDefined();
        expect(typeof result.current.withAuthErrorHandling).toBe('function');
        expect(result.current.isHandlingAuthError).toBe(false);
    });

    it('catchAuthError should handle auth errors and return true', () => {
        const { result } = renderHookWithProviders(() => useAuthErrorHandling());
        const mockError = new Error('Authentication required');

        let returnValue;
        act(() => {
            returnValue = result.current.catchAuthError(mockError, 'test action');
        });

        expect(returnValue).toBe(true);
        expect(handleAuthError).toHaveBeenCalledWith(mockError, 'test action');
        expect(result.current.isHandlingAuthError).toBe(true);

        // Should call login after a timeout
        act(() => {
            jest.runAllTimers();
        });
        expect(usePrivy().login).toHaveBeenCalled();

        // Should reset isHandlingAuthError after timeout
        expect(result.current.isHandlingAuthError).toBe(false);
    });

    it('catchAuthError should ignore non-auth errors and return false', () => {
        const { result } = renderHookWithProviders(() => useAuthErrorHandling());
        const mockError = new Error('Some other error');

        let returnValue;
        act(() => {
            returnValue = result.current.catchAuthError(mockError);
        });

        expect(returnValue).toBe(false);
        expect(handleAuthError).not.toHaveBeenCalled();
        expect(result.current.isHandlingAuthError).toBe(false);
    });

    it('withAuthErrorHandling should wrap a function with error handling', async () => {
        const { result } = renderHookWithProviders(() => useAuthErrorHandling());

        const mockSuccess = jest.fn().mockResolvedValue({ success: true });
        const wrappedSuccess = result.current.withAuthErrorHandling(mockSuccess, 'success action');

        let response;
        await act(async () => {
            response = await wrappedSuccess();
        });

        expect(mockSuccess).toHaveBeenCalled();
        expect(response).toEqual({ success: true });
        expect(handleAuthError).not.toHaveBeenCalled();

        // Test with function that throws auth error
        const mockAuthError = jest.fn().mockRejectedValue(new Error('Authentication required'));
        const wrappedAuthError = result.current.withAuthErrorHandling(mockAuthError, 'auth error action');

        await act(async () => {
            response = await wrappedAuthError();
        });

        expect(mockAuthError).toHaveBeenCalled();
        expect(response).toBeNull();
        expect(handleAuthError).toHaveBeenCalledWith(expect.any(Error), 'auth error action');

        // Test with function that throws non-auth error
        const nonAuthError = new Error('Some other error');
        const mockOtherError = jest.fn().mockRejectedValue(nonAuthError);
        const wrappedOtherError = result.current.withAuthErrorHandling(mockOtherError);

        await expect(wrappedOtherError()).rejects.toThrow(nonAuthError);
        expect(handleAuthError).toHaveBeenCalledTimes(1); // No additional calls
    });
}); 