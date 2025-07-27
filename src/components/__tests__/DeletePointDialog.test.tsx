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
import { validatePointDeletion } from '@/actions/points/validatePointDeletion';
import { 
    generateConfirmationRequirement, 
    validateConfirmation, 
    getConfirmationPreview 
} from '@/lib/negation-game/deletionConfirmation';
import { useQuery } from '@tanstack/react-query';

// Enable fake timers
jest.useFakeTimers();

// Mock all the dependencies
jest.mock('@/mutations/points/useDeletePoint');
jest.mock('@/lib/negation-game/deleteTimelock');
jest.mock('@/actions/points/validatePointDeletion');
jest.mock('@/lib/negation-game/deletionConfirmation');
jest.mock('@tanstack/react-query');
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
    
    // Mock data
    const mockValidationData = {
        canDelete: true,
        errors: [],
        warnings: [],
        point: {
            id: 123,
            content: "Test point content for deletion",
            createdAt: new Date(),
            createdBy: 'test-user'
        }
    };
    
    const mockConfirmationRequirement = {
        type: 'first-words' as const,
        description: 'Type the first 3 words of this point',
        requirement: 'Test point content'
    };

    // Set up useState and other hooks mocks
    const originalUseState = React.useState;
    const mockSetConfirmText = jest.fn();
    const mockSetConfirmationRequirement = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock useDeletePoint hook
        (useDeletePoint as jest.Mock).mockReturnValue({
            mutate: mockDeletePoint,
            isPending: false,
            isSuccess: false,
        });

        // Mock isWithinDeletionTimelock
        (isWithinDeletionTimelock as jest.Mock).mockReturnValue(true);

        // Mock validation function
        (validatePointDeletion as jest.Mock).mockResolvedValue(mockValidationData);
        
        // Mock confirmation functions
        (generateConfirmationRequirement as jest.Mock).mockReturnValue(mockConfirmationRequirement);
        (validateConfirmation as jest.Mock).mockReturnValue(false);
        (getConfirmationPreview as jest.Mock).mockReturnValue('Test point content');
        
        // Mock useQuery
        (useQuery as jest.Mock).mockReturnValue({
            data: mockValidationData,
            isLoading: false,
            error: null,
        });

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
            .mockImplementationOnce(() => [mockConfirmationRequirement, mockSetConfirmationRequirement]); // confirmationRequirement state

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

        // Check title - using role to be more specific
        expect(screen.getByRole('heading', { name: /Delete Point/ })).toBeInTheDocument();

        // Check hours left message - using partial text match
        expect(screen.getByText(/You have 2 hours left to delete this point/)).toBeInTheDocument();

        // Check that validation was called
        expect(useQuery).toHaveBeenCalledWith({
            queryKey: ['validate-deletion', 123],
            queryFn: expect.any(Function),
            enabled: true,
            staleTime: 30000,
        });

        // Check confirmation field exists
        const input = screen.getByRole('textbox');
        expect(input).toBeInTheDocument();

        // Check delete button exists and is disabled
        const deleteButton = screen.getByTestId('delete-button');
        expect(deleteButton).toBeInTheDocument();
        expect(deleteButton).toBeDisabled();
    });

    it('renders properly when outside deletion window', () => {
        // Mock validation to return error
        const mockValidationWithError = {
            canDelete: false,
            errors: ['Points can only be deleted within 8 hours of creation'],
            warnings: [],
            point: mockValidationData.point
        };
        
        (useQuery as jest.Mock).mockReturnValue({
            data: mockValidationWithError,
            isLoading: false,
            error: null,
        });

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
        
        // Should show the error message
        expect(screen.getByText(/Points can only be deleted within 8 hours of creation/)).toBeInTheDocument();

        // Delete button should not exist
        const deleteButton = screen.queryByTestId('delete-button');
        expect(deleteButton).toBeNull();
    });

    it('enables the delete button when correct confirmation is typed', () => {
        const onOpenChange = jest.fn();
        
        // Mock useState to include confirmationRequirement state
        // @ts-ignore - Mocking useState
        React.useState = jest.fn()
            .mockImplementationOnce(() => ['', mockSetConfirmText]) // confirmText state
            .mockImplementationOnce(() => [mockConfirmationRequirement, mockSetConfirmationRequirement]); // confirmationRequirement state

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

        // Type the required confirmation into the input
        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'Test point content' } });

        // The setState mock should have been called
        expect(mockSetConfirmText).toHaveBeenCalledWith('Test point content');

        // Mock validation to return true for correct input
        (validateConfirmation as jest.Mock).mockReturnValue(true);

        // Re-render with the state updated
        // @ts-ignore - Mocking useState
        React.useState = jest.fn()
            .mockImplementationOnce(() => ['Test point content', mockSetConfirmText]) // confirmation state with correct text
            .mockImplementationOnce(() => [mockConfirmationRequirement, mockSetConfirmationRequirement]); // confirmationRequirement state

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
        // Mock the confirmation being correct already
        // @ts-ignore - Mocking useState
        React.useState = jest.fn()
            .mockImplementationOnce(() => ['Test point content', mockSetConfirmText]) // confirmation already correct
            .mockImplementationOnce(() => [mockConfirmationRequirement, mockSetConfirmationRequirement]); // confirmationRequirement state
            
        // Mock validation to return true
        (validateConfirmation as jest.Mock).mockReturnValue(true);

        const onOpenChange = jest.fn();

        render(
            <DeletePointDialog
                open={true}
                onOpenChange={onOpenChange}
                pointId={123}
                createdAt={new Date(Date.now() - 6 * 60 * 60 * 1000)}
            />
        );

        // Find the delete button - should be enabled with correct confirmation typed
        const deleteButton = screen.getByTestId('delete-button');
        expect(deleteButton).not.toBeDisabled();

        // Click the delete button
        fireEvent.click(deleteButton);

        // Verify deletePoint was called with correct argument
        expect(mockDeletePoint).toHaveBeenCalledWith(
            { pointId: 123 }
        );
    });

    it('should handle redirect after successful deletion', () => {
        // Mock successful deletion
        (useDeletePoint as jest.Mock).mockReturnValue({
            mutate: mockDeletePoint,
            isPending: false,
            isSuccess: true,
        });
        
        // Mock useState with correct confirmation
        // @ts-ignore - Mocking useState
        React.useState = jest.fn()
            .mockImplementationOnce(() => ['Test point content', mockSetConfirmText])
            .mockImplementationOnce(() => [mockConfirmationRequirement, mockSetConfirmationRequirement]);
            
        // Mock validation to return true
        (validateConfirmation as jest.Mock).mockReturnValue(true);
        
        // Set the current pathname to a space path
        (usePathname as jest.Mock).mockReturnValue('/s/test-space/p/123');

        const onOpenChange = jest.fn();

        render(
            <DeletePointDialog
                open={true}
                onOpenChange={onOpenChange}
                pointId={123}
                createdAt={new Date(Date.now() - 6 * 60 * 60 * 1000)}
            />
        );

        // Should close the dialog due to isSuccess
        expect(onOpenChange).toHaveBeenCalledWith(false);

        // Advance timers to trigger setTimeout callback for redirect
        jest.advanceTimersByTime(1000);

        // Should redirect to space root
        expect(mockReplace).toHaveBeenCalledWith('/s/test-space');
    });

    it('handles deletion when pending and successful', async () => {
        // Set isPending to true initially
        (useDeletePoint as jest.Mock).mockReturnValue({
            mutate: mockDeletePoint,
            isPending: true,
            isSuccess: false,
        });
        
        // Mock useState with correct confirmation
        // @ts-ignore - Mocking useState
        React.useState = jest.fn()
            .mockImplementationOnce(() => ['Test point content', mockSetConfirmText])
            .mockImplementationOnce(() => [mockConfirmationRequirement, mockSetConfirmationRequirement]);
            
        // Mock validation to return true
        (validateConfirmation as jest.Mock).mockReturnValue(true);

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
            isSuccess: false,
        });

        // Reset useState mock for rerender
        // @ts-ignore - Mocking useState
        React.useState = jest.fn()
            .mockImplementationOnce(() => ['Test point content', mockSetConfirmText])
            .mockImplementationOnce(() => [mockConfirmationRequirement, mockSetConfirmationRequirement]);

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
        expect(updatedDeleteButton.textContent).toBe('Delete Point');
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