import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PointsTabContent } from '../PointsTabContent';

// Mock the FeedItem component to avoid ESM issues
jest.mock('../FeedItem', () => ({
    FeedItem: ({ item }: { item: any }) => (
        <div data-testid={`feed-item-${item.id}`}>
            {item.content}
        </div>
    ),
}));

// Mock the infinite scroll hook
jest.mock('@/hooks/ui/useInfiniteScroll', () => ({
    useInfiniteScroll: () => null,
}));

// Mock the CreateRationaleViewpointCard component
jest.mock('../CreateRationaleViewpointCard', () => ({
    CreateRationaleViewpointCard: () => <div data-testid="create-rationale-card">Create Rationale</div>,
}));

// Mock the KnowledgeBaseContext
jest.mock('@/components/contexts/KnowledgeBaseContext', () => ({
    useKnowledgeBase: () => ({
        openDialog: jest.fn(),
    }),
}));

const mockProps = {
    points: [],
    isLoading: false,
    combinedFeed: [],
    basePath: '/s/test',
    space: 'test',
    setNegatedPointId: jest.fn(),
    login: jest.fn(),
    user: null,
    pinnedPoint: null,
    loginOrMakePoint: jest.fn(),
    handleCardClick: jest.fn(),
    loadingCardId: null,
    onPrefetchPoint: jest.fn(),
};

describe('PointsTabContent', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should display refresh button when no points are available', () => {
        const mockRefetch = jest.fn();
        render(
            <PointsTabContent
                {...mockProps}
                onRefetchFeed={mockRefetch}
                isRefetching={false}
            />
        );

        expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
        expect(screen.getByText('Refresh Feed')).toBeInTheDocument();
    });

    it('should call refetch when refresh button is clicked', () => {
        const mockRefetch = jest.fn();
        render(
            <PointsTabContent
                {...mockProps}
                onRefetchFeed={mockRefetch}
                isRefetching={false}
            />
        );

        const refreshButton = screen.getByText('Refresh Feed');
        fireEvent.click(refreshButton);

        expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('should show loading state when refetching', () => {
        const mockRefetch = jest.fn();
        render(
            <PointsTabContent
                {...mockProps}
                onRefetchFeed={mockRefetch}
                isRefetching={true}
            />
        );

        expect(screen.getByText('Refreshing...')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /refreshing/i })).toBeDisabled();
    });

    it('should not show refresh button when onRefetchFeed is not provided', () => {
        render(<PointsTabContent {...mockProps} />);

        expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
        expect(screen.queryByText('Refresh Feed')).not.toBeInTheDocument();
    });

    it('should display feed items when points are available', () => {
        const mockCombinedFeed = [
            {
                type: 'point',
                id: 'point-1',
                content: 'Test point content',
                createdAt: new Date(),
                data: {
                    pointId: 1,
                    content: 'Test point content',
                }
            }
        ];

        render(
            <PointsTabContent
                {...mockProps}
                points={[mockCombinedFeed[0].data]}
                combinedFeed={mockCombinedFeed}
            />
        );

        expect(screen.queryByText('Nothing here yet')).not.toBeInTheDocument();
        expect(screen.queryByText('Refresh Feed')).not.toBeInTheDocument();
        expect(screen.getByTestId('create-rationale-card')).toBeInTheDocument();
        expect(screen.getByTestId('feed-item-point-1')).toBeInTheDocument();
        expect(screen.getByText('Test point content')).toBeInTheDocument();
    });
}); 