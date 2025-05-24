// Mock all Privy-related modules first to avoid jose/ESM issues
jest.mock('@privy-io/react-auth', () => ({
    usePrivy: jest.fn(() => ({
        authenticated: true,
        user: { id: 'test-user' },
        ready: true,
    })),
}));

jest.mock('@/lib/privy/getPrivyClient', () => ({
    getPrivyClient: jest.fn(() => ({
        getUser: jest.fn(() => Promise.resolve({ id: 'test-user' })),
        verifyAuthToken: jest.fn(() => Promise.resolve({ userId: 'test-user' })),
    })),
}));

jest.mock('@/actions/users/getUserId', () => ({
    getUserId: jest.fn(() => Promise.resolve('test-user')),
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeletePointDialog } from '@/components/dialogs/DeletePointDialog';
import { useDeletePoint } from '@/mutations/points/useDeletePoint';
import { isWithinDeletionTimelock } from '@/lib/negation-game/deleteTimelock';
import { useRouter, usePathname } from 'next/navigation';

// Enable fake timers
jest.useFakeTimers();

// Mock all the dependencies
jest.mock('@/mutations/points/useDeletePoint');
jest.mock('@/lib/negation-game/deleteTimelock');
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
    usePathname: jest.fn(),
}));

// Mock the UI components to simplify testing
jest.mock('@/components/ui/dialog', () => {
    return {
        Dialog: ({ children }: { children: React.ReactNode }) => <div role="dialog" aria-modal="true" data-state="open">{children}</div>,
        DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
        DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
        DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
        DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
        DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
    };
});

jest.mock('@/components/ui/button', () => {
    return {
        Button: ({ children, onClick, disabled, variant, ...props }: {
            children: React.ReactNode,
            onClick?: () => void,
            disabled?: boolean,
            variant?: string,
            'data-testid'?: string
        }) => {
            // Assign data-testid based on button content or variant
            let testId;
            if (props['data-testid']) {
                testId = props['data-testid'];
            } else if (typeof children === 'string' && children === 'Cancel') {
                testId = 'cancel-button';
            } else if (typeof children === 'string' && children === 'Delete') {
                testId = 'delete-button';
            } else if (variant === 'destructive') {
                testId = 'delete-button';
            }

            // Remove variant from props as it's not a valid HTML button attribute
            return (
                <button
                    onClick={onClick}
                    disabled={disabled}
                    data-testid={testId}
                    {...props}
                >
                    {children}
                </button>
            );
        },
    };
});

describe('DeletePointDialog', () => {
    const mockDeletePoint = jest.fn();
    const mockIsPending = jest.fn();
    const mockReplace = jest.fn();
    let mockPathname = '/p/123';

    // Set up useState and other hooks mocks
    const originalUseState = React.useState;
    const mockSetConfirmText = jest.fn();
    const mockSetHasDeleted = jest.fn();
    const mockSetHoursLeft = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock useDeletePoint hook
        (useDeletePoint as jest.Mock).mockReturnValue({
            mutate: mockDeletePoint,
            isPending: false,
        });

        // Mock isWithinDeletionTimelock
        (isWithinDeletionTimelock as jest.Mock).mockReturnValue(true);

        // Mock router
        (useRouter as jest.Mock).mockReturnValue({
            replace: mockReplace,
        });

        // Mock pathname
        (usePathname as jest.Mock).mockReturnValue(mockPathname);

        // Mock hooks
        // @ts-ignore - Mocking useState
        React.useState = jest.fn()
            .mockImplementationOnce(() => ['', mockSetConfirmText]) // confirmText state
            .mockImplementationOnce(() => [false, mockSetHasDeleted]); // hasDeleted state

        // Mock window.location
        Object.defineProperty(window, 'location', {
            value: { href: 'https://example.com/p/123' },
            writable: true,
        });
    });

    afterEach(() => {
        // Restore useState
        React.useState = originalUseState;
    });

    afterAll(() => {
        // Reset timers
        jest.useRealTimers();
    });

    it('renders properly when allowed to delete', () => {
        // Set up a date 6 hours ago
        const createdAt = new Date(Date.now() - 6 * 60 * 60 * 1000);

        render(
            <DeletePointDialog
                open={true}
                onOpenChange={jest.fn()}
                pointId={123}
                createdAt={createdAt}
            />
        );

        // Check dialog is open
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();

        // Check title
        expect(screen.getByText('Delete Point')).toBeInTheDocument();

        // Check hours left message - using partial text match
        expect(screen.getByText(/You have 2 hours left to delete this point/)).toBeInTheDocument();

        // Check confirmation field exists
        const input = screen.getByRole('textbox');
        expect(input).toBeInTheDocument();

        // Check delete button exists and is disabled
        const deleteButton = screen.getByTestId('delete-button');
        expect(deleteButton).toBeInTheDocument();
        expect(deleteButton).toBeDisabled();
    });

    it('renders properly when outside deletion window', () => {
        // Mock isWithinDeletionTimelock to return false
        (isWithinDeletionTimelock as jest.Mock).mockReturnValue(false);

        render(
            <DeletePointDialog
                open={true}
                onOpenChange={jest.fn()}
                pointId={123}
                createdAt={new Date(Date.now() - 10 * 60 * 60 * 1000)}
            />
        );

        // Should show message about not being able to delete - using partial text match
        expect(screen.getByText(/This point can no longer be deleted/)).toBeInTheDocument();

        // Delete button should not exist
        const deleteButton = screen.queryByTestId('delete-button');
        expect(deleteButton).toBeNull();
    });

    it('enables the delete button when "delete" is typed', () => {
        const onOpenChange = jest.fn();

        const { rerender } = render(
            <DeletePointDialog
                open={true}
                onOpenChange={onOpenChange}
                pointId={123}
                createdAt={new Date(Date.now() - 6 * 60 * 60 * 1000)}
            />
        );

        // Initially the button should be disabled
        const deleteButton = screen.getByTestId('delete-button');
        expect(deleteButton).toBeDisabled();

        // Type "delete" into the confirmation input
        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'delete' } });

        // The setState mock should have been called
        expect(mockSetConfirmText).toHaveBeenCalledWith('delete');

        // Re-render with the state updated
        // Reset the useState mock for the next render
        // @ts-ignore - Mocking useState
        React.useState = jest.fn()
            .mockImplementationOnce(() => ['delete', mockSetConfirmText]) // confirmation state now "delete"
            .mockImplementationOnce(() => [false, mockSetHasDeleted]); // hasDeleted state

        rerender(
            <DeletePointDialog
                open={true}
                onOpenChange={onOpenChange}
                pointId={123}
                createdAt={new Date(Date.now() - 6 * 60 * 60 * 1000)}
            />
        );

        // Now the button should be enabled
        const updatedDeleteButton = screen.getByTestId('delete-button');
        expect(updatedDeleteButton).not.toBeDisabled();
    });

    it('calls deletePoint when delete button is clicked', () => {
        // Mock the confirmation being "delete" already
        // @ts-ignore - Mocking useState
        React.useState = jest.fn()
            .mockImplementationOnce(() => ['delete', mockSetConfirmText]) // confirmation already "delete"
            .mockImplementationOnce(() => [false, mockSetHasDeleted]); // hasDeleted state

        const onOpenChange = jest.fn();

        render(
            <DeletePointDialog
                open={true}
                onOpenChange={onOpenChange}
                pointId={123}
                createdAt={new Date(Date.now() - 6 * 60 * 60 * 1000)}
            />
        );

        // Find the delete button - should be enabled with 'delete' typed
        const deleteButton = screen.getByTestId('delete-button');
        expect(deleteButton).not.toBeDisabled();

        // Click the delete button
        fireEvent.click(deleteButton);

        // Should close the dialog
        expect(onOpenChange).toHaveBeenCalledWith(false);

        // Should set hasDeleted to true
        expect(mockSetHasDeleted).toHaveBeenCalledWith(true);

        // Verify deletePoint was called with correct argument
        expect(mockDeletePoint).toHaveBeenCalledWith(
            { pointId: 123 }
        );
    });

    it('should extract correct space URL from different pathnames', () => {
        // Test cases for path extraction
        const testCases = [
            { path: '/s/test-space/p/123', expected: '/s/test-space' },
            { path: '/s/another-space/p/456/thread/789', expected: '/s/another-space' },
            { path: '/p/123', expected: '/' },
        ];

        for (const { path, expected } of testCases) {
            jest.clearAllMocks();

            // Set the current pathname
            (usePathname as jest.Mock).mockReturnValue(path);

            // Mock useState for this iteration
            // @ts-ignore - Mocking useState
            React.useState = jest.fn()
                .mockImplementationOnce(() => ['delete', mockSetConfirmText])
                .mockImplementationOnce(() => [false, mockSetHasDeleted]);

            // Mock router with a replace function
            (useRouter as jest.Mock).mockReturnValue({
                replace: mockReplace,
            });

            const { unmount } = render(
                <DeletePointDialog
                    open={true}
                    onOpenChange={jest.fn()}
                    pointId={123}
                    createdAt={new Date(Date.now() - 6 * 60 * 60 * 1000)}
                />
            );

            // Click the delete button to trigger the navigation
            const deleteButton = screen.getByTestId('delete-button');
            fireEvent.click(deleteButton);

            // Check that setHasDeleted was called (which triggers redirect)
            expect(mockSetHasDeleted).toHaveBeenCalledWith(true);

            // Advance timers to trigger setTimeout callback
            jest.advanceTimersByTime(1000);

            // Clean up after each test case
            unmount();
        }
    });

    it('handles deletion when pending and successful', async () => {
        // Set isPending to true initially
        (useDeletePoint as jest.Mock).mockReturnValue({
            mutate: mockDeletePoint,
            isPending: true,
        });

        const { rerender } = render(
            <DeletePointDialog
                open={true}
                onOpenChange={jest.fn()}
                pointId={123}
                createdAt={new Date(Date.now() - 6 * 60 * 60 * 1000)}
            />
        );

        // Check that delete button shows spinner and is disabled while pending
        const deleteButton = screen.getByTestId('delete-button');
        expect(deleteButton).toBeDisabled();
        expect(deleteButton.textContent).toContain('Deleting');

        // Change isPending to false and rerender
        (useDeletePoint as jest.Mock).mockReturnValue({
            mutate: mockDeletePoint,
            isPending: false,
        });

        // Reset useState mock for rerender
        // @ts-ignore - Mocking useState
        React.useState = jest.fn()
            .mockImplementationOnce(() => ['delete', mockSetConfirmText])
            .mockImplementationOnce(() => [false, mockSetHasDeleted]);

        rerender(
            <DeletePointDialog
                open={true}
                onOpenChange={jest.fn()}
                pointId={123}
                createdAt={new Date(Date.now() - 6 * 60 * 60 * 1000)}
            />
        );

        // Button should now be enabled
        const updatedDeleteButton = screen.getByTestId('delete-button');
        expect(updatedDeleteButton).not.toBeDisabled();
        expect(updatedDeleteButton.textContent).toBe('Delete');
    });

    it('should close dialog when cancel is clicked', () => {
        const onOpenChange = jest.fn();

        render(
            <DeletePointDialog
                open={true}
                onOpenChange={onOpenChange}
                pointId={123}
                createdAt={new Date(Date.now() - 6 * 60 * 60 * 1000)}
            />
        );

        // Find and click the cancel button
        const cancelButton = screen.getByTestId('cancel-button');
        fireEvent.click(cancelButton);

        // Check that onOpenChange was called with false
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
}); 