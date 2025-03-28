import { render, screen } from '@testing-library/react';
import { SearchResultsList } from '../SearchResultsList';
import { SearchResult } from '@/actions/searchContent';
import userEvent from '@testing-library/user-event';

// Mock the necessary dependencies
jest.mock('@/hooks/useBasePath', () => ({
    useBasePath: () => '/s/global',
}));

// Mock jotai properly
jest.mock('jotai', () => ({
    useSetAtom: jest.fn().mockReturnValue(jest.fn()),
    atom: jest.fn()
}));

jest.mock('@privy-io/react-auth', () => ({
    usePrivy: () => ({
        user: null,
        login: jest.fn(),
    }),
}));

jest.mock('@/components/ui/loader', () => ({
    Loader: () => <div data-testid="loader">Loading...</div>,
}));

// Mock PointCard component
jest.mock('@/components/PointCard', () => ({
    PointCard: (props: any) => (
        <div data-testid="point-card" className={props.className}>
            {props.isLoading && <div data-testid="loading-spinner" />}
        </div>
    ),
}));

// Mock the ViewpointCardWrapper component
jest.mock('@/components/ViewpointCardWrapper', () => ({
    ViewpointCardWrapper: (props: any) => (
        <div
            data-testid="viewpoint-card-wrapper"
            onClick={() => props.handleCardClick?.(`rationale-${props.id}`)}
        >
            {props.loadingCardId === `rationale-${props.id}` && (
                <div data-testid="loading-spinner">Loading...</div>
            )}
        </div>
    ),
}));

// Mock point data for tests
const createMockPointData = () => ({
    pointId: 1,
    content: 'Test point content',
    createdAt: new Date('2023-01-01'),
    createdBy: 'user1',
    space: 'global',
    amountNegations: 5,
    amountSupporters: 10,
    cred: 100,
    favor: 0.75,
    negationsCred: 20,
    negationIds: ['2', '3'],
    username: 'testuser',
    relevance: 0.95,
    viewerCred: 50
} as any); // Cast as any to bypass TypeScript errors in test fixtures

describe('SearchResultsList', () => {
    it('displays loading state correctly', () => {
        render(
            <SearchResultsList
                results={[]}
                isLoading={true}
                query="test"
                hasSearched={true}
            />
        );
        expect(screen.getByTestId('loader')).toBeInTheDocument();
    });

    it('displays empty state when no results found', () => {
        render(
            <SearchResultsList
                results={[]}
                isLoading={false}
                query="test"
                hasSearched={true}
            />
        );
        expect(screen.getByText(/no results found for/i)).toBeInTheDocument();
    });

    it('displays \'Enter at least 2 characters\' message when query is too short', () => {
        render(
            <SearchResultsList
                results={[]}
                isLoading={false}
                query="t"
                hasSearched={false}
            />
        );
        expect(screen.getByText(/enter at least 2 characters/i)).toBeInTheDocument();
    });

    it('displays \'Type to search...\' when query is valid but not searched yet', () => {
        render(
            <SearchResultsList
                results={[]}
                isLoading={false}
                query="test"
                hasSearched={false}
            />
        );
        expect(screen.getByText(/type to search/i)).toBeInTheDocument();
    });

    it('renders point cards', () => {
        const mockResults: SearchResult[] = [
            {
                id: '1',
                content: 'Test point content',
                createdAt: new Date('2023-01-01'),
                type: 'point',
                pointData: createMockPointData(),
                author: 'testuser',
                relevance: 0.95
            }
        ];

        render(
            <SearchResultsList
                results={mockResults}
                isLoading={false}
                query="test"
                hasSearched={true}
            />
        );

        expect(screen.getByTestId('point-card')).toBeInTheDocument();
    });

    it('renders viewpoint cards', () => {
        const mockResults: SearchResult[] = [
            {
                type: 'rationale',
                id: 'vp-1',
                title: 'Test viewpoint title',
                description: 'Test viewpoint description',
                content: '',
                createdAt: new Date('2023-01-01'),
                author: 'testuser',
                relevance: 1,
                space: 'global',
                statistics: {
                    views: 100,
                    copies: 20,
                    totalCred: 500,
                    averageFavor: 0.8
                }
            }
        ];

        render(
            <SearchResultsList
                results={mockResults}
                isLoading={false}
                query="test"
                hasSearched={true}
            />
        );

        expect(screen.getByTestId('viewpoint-card-wrapper')).toBeInTheDocument();
    });

    it('correctly renders mixed results', () => {
        const mockResults: SearchResult[] = [
            {
                id: '1',
                content: 'Test point content',
                createdAt: new Date('2023-01-01'),
                type: 'point',
                pointData: createMockPointData(),
                author: 'testuser',
                relevance: 0.95
            },
            {
                type: 'rationale',
                id: 'vp-1',
                title: 'Test viewpoint title',
                description: 'Test viewpoint description',
                content: '',
                createdAt: new Date('2023-01-01'),
                author: 'testuser',
                relevance: 1,
                space: 'global',
                statistics: {
                    views: 100,
                    copies: 20,
                    totalCred: 500,
                    averageFavor: 0.8
                }
            }
        ];

        render(
            <SearchResultsList
                results={mockResults}
                isLoading={false}
                query="test"
                hasSearched={true}
            />
        );

        expect(screen.getByTestId('point-card')).toBeInTheDocument();
        expect(screen.getByTestId('viewpoint-card-wrapper')).toBeInTheDocument();
    });

    it('shows loading animation on point card when loadingCardId matches', () => {
        const mockResults: SearchResult[] = [
            {
                id: '1',
                content: 'Test point content',
                createdAt: new Date('2023-01-01'),
                type: 'point',
                pointData: createMockPointData(),
                author: 'testuser',
                relevance: 0.95
            }
        ];

        render(
            <SearchResultsList
                results={mockResults}
                isLoading={false}
                query="test"
                hasSearched={true}
                loadingCardId="point-1"
            />
        );

        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('calls handleCardClick when a viewpoint is clicked', async () => {
        const user = userEvent.setup();
        const mockHandleCardClick = jest.fn();

        const mockResults: SearchResult[] = [
            {
                type: 'rationale',
                id: 'vp-1',
                title: 'Test viewpoint',
                content: 'Test viewpoint description',
                description: 'Test viewpoint description',
                createdAt: new Date('2023-01-01'),
                author: 'testuser',
                relevance: 1,
                space: 'test-space',
                statistics: {
                    views: 50,
                    copies: 20,
                    totalCred: 500,
                    averageFavor: 80,
                }
            }
        ];

        render(
            <SearchResultsList
                results={mockResults}
                isLoading={false}
                query="test"
                hasSearched={true}
                handleCardClick={mockHandleCardClick}
            />
        );

        const viewpointWrapper = screen.getByTestId('viewpoint-card-wrapper');
        await user.click(viewpointWrapper);
        expect(mockHandleCardClick).toHaveBeenCalledWith('rationale-vp-1');
    });
}); 