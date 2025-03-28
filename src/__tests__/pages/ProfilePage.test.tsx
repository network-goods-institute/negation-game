import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock all privy-related modules before importing ProfilePage
jest.mock('@privy-io/react-auth', () => ({
    usePrivy: jest.fn(() => ({
        user: { id: '123' },
        ready: true
    }))
}));

// Mock next/navigation before importing anything that uses it
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
    usePathname: jest.fn(() => '/profile/testuser'),
    useParams: jest.fn(() => ({ username: 'testuser' }))
}));

// Create mocks for all necessary backend modules
jest.mock('@/actions/getUserId', () => ({
    getUserId: jest.fn(() => Promise.resolve('user-123')),
}));

jest.mock('@/lib/privy/getPrivyClient', () => ({
    getPrivyClient: jest.fn(() => ({
        getUser: jest.fn(() => Promise.resolve({ id: 'user-123' })),
    })),
}));

// Mock all the UI components
jest.mock('@/components/PointCard', () => ({
    PointCard: () => <div data-testid="mock-point-card">Mock Point Card</div>
}));

jest.mock('@/components/ViewpointCard', () => ({
    ViewpointCard: () => <div data-testid="mock-viewpoint-card">Mock Viewpoint Card</div>
}));

jest.mock('@/components/ProfileEditDialog', () => ({
    ProfileEditDialog: () => <div data-testid="mock-profile-edit-dialog">Mock Profile Edit Dialog</div>
}));

// Mock React.use to return fake params
jest.spyOn(React, 'use').mockImplementation(() => ({ username: 'testuser' }));

// Now we can safely import ProfilePage
import ProfilePage from '@/app/profile/[username]/page';
import { useRouter } from 'next/navigation';

// Mock all the data hooks
jest.mock('@/queries/useUser', () => ({
    useUser: jest.fn()
}));

jest.mock('@/queries/useProfilePoints', () => ({
    useProfilePoints: jest.fn()
}));

jest.mock('@/queries/useUserViewpoints', () => ({
    useUserViewpoints: jest.fn()
}));

jest.mock('@/queries/useUserEndorsedPoints', () => ({
    useUserEndorsedPoints: jest.fn()
}));

jest.mock('@/queries/useFeed', () => ({
    useFeed: jest.fn()
}));

// Import hooks after mocking
import { useUser } from '@/queries/useUser';
import { useProfilePoints } from '@/queries/useProfilePoints';
import { useUserViewpoints } from '@/queries/useUserViewpoints';
import { useUserEndorsedPoints } from '@/queries/useUserEndorsedPoints';
import { useFeed } from '@/queries/useFeed';

// Mock backButtonUtils to avoid any window location issues
jest.mock('@/utils/backButtonUtils', () => ({
    getBackButtonHandler: jest.fn().mockImplementation((router, setInitialTab, homePath = '/') => {
        return () => {
            if (window.history.length > 1) {
                window.history.back();
                return;
            }

            if (document.referrer) {
                router.back();
            } else {
                router.push(homePath);
            }
        };
    }),
    isSameDomain: jest.fn()
}));

describe('ProfilePage', () => {
    let mockRouter: any;
    let originalHistoryBack: () => void;
    let originalHistoryLength: number;
    let originalReferrer: string;

    beforeEach(() => {
        // Setup router mock
        mockRouter = {
            back: jest.fn(),
            push: jest.fn(),
        };
        (useRouter as jest.Mock).mockReturnValue(mockRouter);

        // Mock successful data loading - using the data structure that the component expects
        (useUser as jest.Mock).mockReturnValue({
            data: {
                id: '123',
                username: 'testuser',
                createdAt: new Date().toISOString(),
                cred: 100
            },
            isLoading: false,
        });

        (useProfilePoints as jest.Mock).mockReturnValue({
            data: [{
                pointId: 1,
                content: 'Test point',
                createdAt: new Date(),
                cred: 10,
                space: 'global',
                amountSupporters: 1,
                amountNegations: 0,
                viewerCred: 5,
                favor: 0.5
            }],
            isLoading: false,
        });

        (useUserViewpoints as jest.Mock).mockReturnValue({
            data: [],
            isLoading: false,
        });

        (useUserEndorsedPoints as jest.Mock).mockReturnValue({
            data: [],
            isLoading: false,
        });

        (useFeed as jest.Mock).mockReturnValue({
            data: [],
            isLoading: false,
        });

        // Save original window.history methods and properties
        originalHistoryBack = window.history.back;
        originalHistoryLength = window.history.length;

        // Setup document.referrer mock
        Object.defineProperty(document, 'referrer', {
            configurable: true,
            get: jest.fn(() => "")
        });
        originalReferrer = document.referrer;

        // Mock window.history.back
        window.history.back = jest.fn();
    });

    afterEach(() => {
        // Restore original window.history
        window.history.back = originalHistoryBack;
        Object.defineProperty(window.history, 'length', {
            configurable: true,
            value: originalHistoryLength
        });

        // Restore original document.referrer
        Object.defineProperty(document, 'referrer', {
            configurable: true,
            get: () => originalReferrer
        });

        jest.clearAllMocks();
    });

    test('renders back button', () => {
        // Use a fake params promise
        const paramsPromise = Promise.resolve({ username: 'testuser' });

        render(<ProfilePage params={paramsPromise} />);
        const backButton = screen.getByRole('button', { name: /back/i });
        expect(backButton).toBeInTheDocument();
    });

    test('clicking back button uses window.history.back when history exists', () => {
        // Mock window.history.back and history.length
        window.history.back = jest.fn();
        Object.defineProperty(window.history, 'length', {
            configurable: true,
            value: 2 // Simulate having history
        });

        const paramsPromise = Promise.resolve({ username: 'testuser' });
        render(<ProfilePage params={paramsPromise} />);
        const backButton = screen.getByRole('button', { name: /back/i });

        // Click the back button
        fireEvent.click(backButton);

        // Should use window.history.back()
        expect(window.history.back).toHaveBeenCalled();
        expect(mockRouter.back).not.toHaveBeenCalled();
        expect(mockRouter.push).not.toHaveBeenCalled();
    });

    test('clicking back button redirects to home when no history/referrer', () => {
        // Mock history to be empty
        Object.defineProperty(window.history, 'length', {
            configurable: true,
            value: 1 // Simulate no history
        });
        window.history.back = jest.fn();

        // Mock empty referrer
        Object.defineProperty(document, 'referrer', {
            configurable: true,
            get: () => ''
        });

        const paramsPromise = Promise.resolve({ username: 'testuser' });
        render(<ProfilePage params={paramsPromise} />);
        const backButton = screen.getByRole('button', { name: /back/i });

        // Click the back button
        fireEvent.click(backButton);

        // Should redirect to home
        expect(mockRouter.push).toHaveBeenCalledWith('/');
        expect(window.history.back).not.toHaveBeenCalled();
    });

    test('handles Not Found state properly', () => {
        // Mock user not found state
        (useProfilePoints as jest.Mock).mockReturnValue({
            data: null,
            isLoading: false,
        });

        const paramsPromise = Promise.resolve({ username: 'testuser' });
        render(<ProfilePage params={paramsPromise} />);

        // Should still render back button even in not found state
        const backButton = screen.getByRole('button', { name: /back/i });
        expect(backButton).toBeInTheDocument();

        // Ensure Not Found text is displayed
        expect(screen.getByText(/not found/i)).toBeInTheDocument();
    });
}); 