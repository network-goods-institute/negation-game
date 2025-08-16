import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSearch } from '@/queries/search/useSearch';
import userEvent from '@testing-library/user-event';

const SearchTestComponent = () => {
    const { searchQuery, searchResults, isLoading, handleSearch, isActive, hasSearched } = useSearch();

    return (
        <div>
            <input
                data-testid="search-input"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search..."
            />

            {isLoading && <div data-testid="loading">Loading...</div>}

            {!isLoading && searchQuery.length > 0 && searchQuery.length < 2 && (
                <div data-testid="min-chars">Enter at least 2 characters to search</div>
            )}

            {!isLoading && searchQuery.length >= 2 && !hasSearched && (
                <div data-testid="type-to-search">Type to search...</div>
            )}

            {!isLoading && hasSearched && searchResults.length === 0 && searchQuery.length >= 2 && (
                <div data-testid="no-results">No results found for "{searchQuery}"</div>
            )}

            {!isLoading && hasSearched && searchResults.length > 0 && (
                <div data-testid="search-results">
                    {searchResults.map((result) => (
                        <div key={`${result.type}-${result.id}`} data-testid={`result-${result.type}`}>
                            {result.type === 'point' ? (
                                <div>Point: {result.content}</div>
                            ) : (
                                <div>Rationale: {result.title}</div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div data-testid="search-state">
                isActive: {isActive.toString()}, hasSearched: {hasSearched.toString()}
            </div>
        </div>
    );
};

// Mock the debounce hook
jest.mock('@uidotdev/usehooks', () => ({
    useDebounce: jest.fn((value: string) => value), // Return value immediately for testing
}));

// Mock the search action
jest.mock('@/actions/search/searchContent', () => ({
    searchContent: jest.fn(),
}));

// Mock space and user actions  
jest.mock('@/actions/spaces/getSpace', () => ({
    getSpace: jest.fn().mockResolvedValue('test-space'),
}));

jest.mock('@/actions/users/getUserId', () => ({
    getUserId: jest.fn().mockResolvedValue('test-user-id'),
}));

// Mock database
jest.mock('@/services/db', () => ({
    db: {
        execute: jest.fn(),
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
    },
}));

const renderWithQueryClient = (component: React.ReactElement) => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
        },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            {component}
        </QueryClientProvider>
    );
};

describe('Search Functionality Integration Tests', () => {
    let mockSearchContent: jest.MockedFunction<any>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSearchContent = require('@/actions/search/searchContent').searchContent;
    });

    it('should show minimum character requirement when query is too short', async () => {
        const user = userEvent.setup();
        renderWithQueryClient(<SearchTestComponent />);

        const input = screen.getByTestId('search-input');
        await user.type(input, 't');

        expect(screen.getByTestId('min-chars')).toBeInTheDocument();
    });

    it('should handle search input and trigger search', async () => {
        const user = userEvent.setup();
        mockSearchContent.mockResolvedValue([
            {
                type: 'point',
                id: 1,
                content: 'Test point content',
                createdAt: new Date(),
                author: 'testuser',
                relevance: 1,
            }
        ]);

        renderWithQueryClient(<SearchTestComponent />);

        const input = screen.getByTestId('search-input');
        await user.type(input, 'test query');

        // Wait for search to complete (no debounce delay since mocked)
        await waitFor(() => {
            expect(mockSearchContent).toHaveBeenCalledWith(['test query']);
        });

        await waitFor(() => {
            expect(screen.getByTestId('search-results')).toBeInTheDocument();
        });
    });

    it('should display search results when found', async () => {
        const user = userEvent.setup();
        const mockResults = [
            {
                type: 'point' as const,
                id: 1,
                content: 'Test point about cats',
                createdAt: new Date(),
                author: 'testuser',
                relevance: 1,
            },
            {
                type: 'rationale' as const,
                id: 'r1',
                title: 'Test Rationale',
                content: 'Test rationale content',
                createdAt: new Date(),
                author: 'testuser',
                relevance: 1,
            }
        ];
        mockSearchContent.mockResolvedValue(mockResults);

        renderWithQueryClient(<SearchTestComponent />);

        const input = screen.getByTestId('search-input');
        await user.type(input, 'cats');

        await waitFor(() => {
            expect(screen.getByTestId('result-point')).toBeInTheDocument();
            expect(screen.getByTestId('result-rationale')).toBeInTheDocument();
        });

        expect(screen.getByText('Point: Test point about cats')).toBeInTheDocument();
        expect(screen.getByText('Rationale: Test Rationale')).toBeInTheDocument();
    });

    it('should show no results message when search returns empty', async () => {
        const user = userEvent.setup();
        mockSearchContent.mockResolvedValue([]);

        renderWithQueryClient(<SearchTestComponent />);

        const input = screen.getByTestId('search-input');
        await user.type(input, 'nonexistent');

        await waitFor(() => {
            expect(screen.getByTestId('no-results')).toBeInTheDocument();
        });

        expect(screen.getByText('No results found for "nonexistent"')).toBeInTheDocument();
    });

    it('should handle search errors gracefully', async () => {
        const user = userEvent.setup();
        mockSearchContent.mockRejectedValue(new Error('Search failed'));

        renderWithQueryClient(<SearchTestComponent />);

        const input = screen.getByTestId('search-input');
        await user.type(input, 'error query');

        // Should not crash and should eventually show no results
        await waitFor(() => {
            expect(screen.getByTestId('no-results')).toBeInTheDocument();
        });
    });

    it('should update search state correctly', async () => {
        const user = userEvent.setup();
        mockSearchContent.mockResolvedValue([]);

        renderWithQueryClient(<SearchTestComponent />);

        const input = screen.getByTestId('search-input');

        // Initially should not be active or searched
        expect(screen.getByTestId('search-state')).toHaveTextContent('isActive: false, hasSearched: false');

        await user.type(input, 'te');

        // Should become active with valid query
        await waitFor(() => {
            expect(screen.getByTestId('search-state')).toHaveTextContent('isActive: true');
        });

        await user.type(input, 'st');

        // Should have searched
        await waitFor(() => {
            expect(screen.getByTestId('search-state')).toHaveTextContent('hasSearched: true');
        });
    });

    it('should reset state when clearing search', async () => {
        const user = userEvent.setup();
        mockSearchContent.mockResolvedValue([]);

        renderWithQueryClient(<SearchTestComponent />);

        const input = screen.getByTestId('search-input');

        // Type and search
        await user.type(input, 'test');
        await waitFor(() => {
            expect(screen.getByTestId('search-state')).toHaveTextContent('isActive: true');
        });

        // Clear input
        await user.clear(input);

        // Should reset state
        await waitFor(() => {
            expect(screen.getByTestId('search-state')).toHaveTextContent('isActive: false, hasSearched: false');
        });
    });
}); 