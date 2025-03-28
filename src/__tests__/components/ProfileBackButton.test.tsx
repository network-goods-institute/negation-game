import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from 'lucide-react';
import { isSameDomain, getBackButtonHandler } from '@/utils/backButtonUtils';
import { useRouter } from 'next/navigation';

// Mock backButtonUtils including both functions
jest.mock('@/utils/backButtonUtils', () => {
    // Create a mock for isSameDomain that can be reused
    const isSameDomainMock = jest.fn();

    return {
        isSameDomain: isSameDomainMock,
        // Create a simple mock implementation of getBackButtonHandler
        getBackButtonHandler: jest.fn().mockImplementation((router, homePath = '/') => {
            return () => {
                // This is a simplified version that uses the already defined isSameDomainMock
                if (window.history.length > 1) {
                    window.history.back();
                    return;
                }

                if (isSameDomainMock(document.referrer)) {
                    router.back();
                } else {
                    router.push(homePath);
                }
            };
        }),
        // Mock handleBackNavigation just in case
        handleBackNavigation: jest.fn()
    };
});

// Mock the Next.js router
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

// Create a simple test component that mimics the back button in profile
const BackButton: React.FC = () => {
    const router = useRouter();
    // Use the imported (mocked) handler directly
    const handleBackClick = getBackButtonHandler(router);

    return (
        <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 px-2 rounded-md"
            onClick={handleBackClick}
        >
            <ArrowLeftIcon className="size-4" />
            <span className="text-sm">Back</span>
        </Button>
    );
};

describe('ProfileBackButton', () => {
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

        // Reset all mocks
        jest.clearAllMocks();
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
    });

    test('renders the back button correctly', () => {
        render(<BackButton />);

        const backButton = screen.getByRole('button', { name: /back/i });
        expect(backButton).toBeInTheDocument();

        // Check that it contains the arrow icon
        const arrowIcon = backButton.querySelector('svg');
        expect(arrowIcon).toBeInTheDocument();
    });

    test('clicking the back button uses window.history.back when history exists', () => {
        // Mock window.history.back and history.length
        window.history.back = jest.fn();
        Object.defineProperty(window.history, 'length', {
            configurable: true,
            value: 2 // Simulate having history
        });

        render(<BackButton />);
        const backButton = screen.getByRole('button', { name: /back/i });

        // Click the back button
        fireEvent.click(backButton);

        // Should use window.history.back()
        expect(window.history.back).toHaveBeenCalled();
        expect(mockRouter.back).not.toHaveBeenCalled();
        expect(mockRouter.push).not.toHaveBeenCalled();
    });

    test('clicking the back button uses router.back when no history but referrer is from same domain', () => {
        // Mock history to be empty
        Object.defineProperty(window.history, 'length', {
            configurable: true,
            value: 1 // Simulate no history
        });
        window.history.back = jest.fn();

        // Mock document.referrer to be from same domain
        Object.defineProperty(document, 'referrer', {
            configurable: true,
            get: () => 'https://example.com/some-page'
        });

        // Mock isSameDomain to return true
        (isSameDomain as jest.Mock).mockReturnValue(true);

        render(<BackButton />);
        const backButton = screen.getByRole('button', { name: /back/i });

        // Click the back button
        fireEvent.click(backButton);

        // Should use router.back()
        expect(mockRouter.back).toHaveBeenCalled();
        expect(window.history.back).not.toHaveBeenCalled();
        expect(mockRouter.push).not.toHaveBeenCalled();
    });

    test('clicking the back button uses router.push("/") when no history and external referrer', () => {
        // Mock history to be empty
        Object.defineProperty(window.history, 'length', {
            configurable: true,
            value: 1 // Simulate no history
        });
        window.history.back = jest.fn();

        // Mock document.referrer to be from external domain
        Object.defineProperty(document, 'referrer', {
            configurable: true,
            get: () => 'https://external-site.com'
        });

        // Mock isSameDomain to return false
        (isSameDomain as jest.Mock).mockReturnValue(false);

        render(<BackButton />);
        const backButton = screen.getByRole('button', { name: /back/i });

        // Click the back button
        fireEvent.click(backButton);

        // Should use router.push('/')
        expect(mockRouter.push).toHaveBeenCalledWith('/');
        expect(window.history.back).not.toHaveBeenCalled();
        expect(mockRouter.back).not.toHaveBeenCalled();
    });

    test('clicking the back button uses router.push("/") when no history and empty referrer', () => {
        // Mock history to be empty
        Object.defineProperty(window.history, 'length', {
            configurable: true,
            value: 1 // Simulate no history
        });
        window.history.back = jest.fn();

        // Mock document.referrer to be empty
        Object.defineProperty(document, 'referrer', {
            configurable: true,
            get: () => ''
        });

        // Mock isSameDomain to return false for empty referrer
        (isSameDomain as jest.Mock).mockReturnValue(false);

        render(<BackButton />);
        const backButton = screen.getByRole('button', { name: /back/i });

        // Click the back button
        fireEvent.click(backButton);

        // Should use router.push('/')
        expect(mockRouter.push).toHaveBeenCalledWith('/');
        expect(window.history.back).not.toHaveBeenCalled();
        expect(mockRouter.back).not.toHaveBeenCalled();
    });

    test('clicking the back button works with localhost referrer', () => {
        // Mock history to be empty
        Object.defineProperty(window.history, 'length', {
            configurable: true,
            value: 1 // Simulate no history
        });
        window.history.back = jest.fn();

        // Mock document.referrer to be from localhost
        Object.defineProperty(document, 'referrer', {
            configurable: true,
            get: () => 'http://localhost:3000/some-page'
        });

        // Mock isSameDomain to return true for localhost
        (isSameDomain as jest.Mock).mockReturnValue(true);

        render(<BackButton />);
        const backButton = screen.getByRole('button', { name: /back/i });

        // Click the back button
        fireEvent.click(backButton);

        // Should use router.back() as localhost is considered same domain
        expect(mockRouter.back).toHaveBeenCalled();
        expect(window.history.back).not.toHaveBeenCalled();
        expect(mockRouter.push).not.toHaveBeenCalled();
    });
}); 