import { handleAuthError, isAuthError } from '../handleAuthError';
import { toast } from 'sonner';
import { logger } from "@/lib/logger";

// Mock sonner toast
jest.mock('sonner', () => ({
    toast: {
        error: jest.fn(),
        success: jest.fn(),
    },
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
    logger: {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
    },
}));

describe('handleAuthError', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock logger.error to prevent actual console output during tests
        jest.spyOn(console, 'error').mockImplementation();
    });

    it('should call toast.error with appropriate message', () => {
        const mockError = new Error('Authentication required');
        handleAuthError(mockError);

        expect(logger.error).toHaveBeenCalledWith('Authentication error:', mockError);
        expect(toast.error).toHaveBeenCalledWith(
            'Authentication Issue',
            expect.objectContaining({
                description: 'There was an authentication problem. Please try again or reload the page if the issue persists.',
            })
        );
    });

    it('should include action description in toast message when provided', () => {
        const mockError = new Error('Authentication required');
        const actionDescription = 'refreshing token';
        handleAuthError(mockError, actionDescription);

        expect(toast.error).toHaveBeenCalledWith(
            'Authentication Issue',
            expect.objectContaining({
                description: 'There was an authentication problem when refreshing token. Please try again or reload the page if the issue persists.',
            })
        );
    });

    it('should include reload action in toast options', () => {
        const mockError = new Error('Authentication required');
        handleAuthError(mockError);

        const toastCall = (toast.error as jest.Mock).mock.calls[0][1];
        expect(toastCall.action).toBeDefined();
        expect(toastCall.action.label).toBe('Reload');
        expect(typeof toastCall.action.onClick).toBe('function');
    });
});

describe('isAuthError', () => {
    it('should return true for known auth error messages', () => {
        const authErrors = [
            new Error('Must be authenticated'),
            new Error('Authentication required'),
            new Error('not authenticated'),
            new Error('error when verifying user privy token'),
            new Error('invalid auth token'),
            'Must be authenticated',
            'Some context: Authentication required and more',
        ];

        authErrors.forEach(error => {
            expect(isAuthError(error)).toBe(true);
        });
    });

    it('should return false for non-auth errors', () => {
        const nonAuthErrors = [
            new Error('Something went wrong'),
            new Error('Network error'),
            null,
            undefined,
            'Random error message',
        ];

        nonAuthErrors.forEach(error => {
            expect(isAuthError(error)).toBe(false);
        });
    });
}); 