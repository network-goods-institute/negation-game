import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../utils/test-utils';
import { AuthenticatedActionButton } from '@/components/ui/AuthenticatedActionButton';
import { usePrivy } from '@privy-io/react-auth';
import { handleAuthError } from '@/lib/auth/handleAuthError';

// Mock the usePrivy hook
jest.mock('@privy-io/react-auth', () => ({
    usePrivy: jest.fn(),
}));

// Mock the handleAuthError function to prevent console errors during tests
jest.mock('@/lib/auth/handleAuthError', () => ({
    handleAuthError: jest.fn(),
}));

describe('AuthenticatedActionButton', () => {
    // Set up default mock values for usePrivy
    const mockLogin = jest.fn();
    const mockGetAccessToken = jest.fn();
    const mockHandleAuthError = handleAuthError as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        // Default mock implementation for usePrivy
        (usePrivy as jest.Mock).mockImplementation(() => ({
            ready: true,
            authenticated: false,
            user: null,
            login: mockLogin,
            getAccessToken: mockGetAccessToken,
        }));
    });

    it('renders correctly with default props', () => {
        render(<AuthenticatedActionButton>Test Button</AuthenticatedActionButton>);
        expect(screen.getByRole('button')).toBeInTheDocument();
        expect(screen.getByText('Test Button')).toBeInTheDocument();
    });

    it('calls login when user is not authenticated', async () => {
        (usePrivy as jest.Mock).mockImplementation(() => ({
            ready: true,
            authenticated: false,
            user: null,
            login: mockLogin,
            getAccessToken: mockGetAccessToken,
        }));

        render(<AuthenticatedActionButton>Login</AuthenticatedActionButton>);

        fireEvent.click(screen.getByRole('button'));

        expect(mockLogin).toHaveBeenCalledTimes(1);
        expect(mockGetAccessToken).not.toHaveBeenCalled();
    });

    it('refreshes token and calls onClick when user is authenticated', async () => {
        const mockOnClick = jest.fn();
        mockGetAccessToken.mockResolvedValue('valid-token');

        (usePrivy as jest.Mock).mockImplementation(() => ({
            ready: true,
            authenticated: true,
            user: { id: 'test-user' },
            login: mockLogin,
            getAccessToken: mockGetAccessToken,
        }));

        render(<AuthenticatedActionButton onClick={mockOnClick}>Click Me</AuthenticatedActionButton>);

        fireEvent.click(screen.getByRole('button'));

        // Wait for the async operations to complete
        await waitFor(() => {
            expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
            expect(mockOnClick).toHaveBeenCalledTimes(1);
            expect(mockLogin).not.toHaveBeenCalled();
        });
    });

    it('shows loading state during token refresh', async () => {
        // Create a promise that won't resolve immediately to simulate loading
        let resolveToken: (value: string) => void;
        const tokenPromise = new Promise<string>((resolve) => {
            resolveToken = resolve;
        });
        mockGetAccessToken.mockReturnValue(tokenPromise);

        (usePrivy as jest.Mock).mockImplementation(() => ({
            ready: true,
            authenticated: true,
            user: { id: 'test-user' },
            login: mockLogin,
            getAccessToken: mockGetAccessToken,
        }));

        render(<AuthenticatedActionButton>Loading Test</AuthenticatedActionButton>);

        fireEvent.click(screen.getByRole('button'));

        // Check that loader is displayed
        expect(screen.getByTestId('loader')).toBeInTheDocument();

        // Resolve the token promise
        resolveToken!('valid-token');

        // Verify loader is hidden after promise resolves
        await waitFor(() => {
            expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
        });
    });

    it('calls login if token refresh fails', async () => {
        mockGetAccessToken.mockRejectedValue(new Error('Token refresh failed'));

        (usePrivy as jest.Mock).mockImplementation(() => ({
            ready: true,
            authenticated: true,
            user: { id: 'test-user' },
            login: mockLogin,
            getAccessToken: mockGetAccessToken,
        }));

        render(<AuthenticatedActionButton>Error Test</AuthenticatedActionButton>);

        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => {
            expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
            expect(mockHandleAuthError).toHaveBeenCalledTimes(1);
            expect(mockLogin).toHaveBeenCalledTimes(1);
        });
    });

    it('calls login if token is null or empty', async () => {
        mockGetAccessToken.mockResolvedValue('');

        (usePrivy as jest.Mock).mockImplementation(() => ({
            ready: true,
            authenticated: true,
            user: { id: 'test-user' },
            login: mockLogin,
            getAccessToken: mockGetAccessToken,
        }));

        render(<AuthenticatedActionButton>Empty Token Test</AuthenticatedActionButton>);

        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => {
            expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
            expect(mockHandleAuthError).toHaveBeenCalledTimes(1);
            expect(mockLogin).toHaveBeenCalledTimes(1);
        });
    });

    it('merges props correctly with the underlying Button', () => {
        render(
            <AuthenticatedActionButton
                variant="destructive"
                size="lg"
                className="custom-class"
                disabled
            >
                Custom Button
            </AuthenticatedActionButton>
        );

        const button = screen.getByRole('button');
        expect(button).toHaveClass('custom-class');
        expect(button).toBeDisabled();
    });
}); 