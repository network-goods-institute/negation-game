import React from "react";
import { render, screen, waitFor } from "@/__tests__/utils/test-utils";
import { ViewpointStatsBar } from "../ViewpointStatsBar";

// Mock fetchPoints and useQuery
const mockFetchPoints = jest.fn();
jest.mock("@/actions/fetchPoints", () => ({
    fetchPoints: (...args: any[]) => mockFetchPoints(...args)
}));

// Initial mock implementation
mockFetchPoints.mockImplementation(async (ids: number[]) => {
    // Return mock points based on ids
    return ids.map(id => ({
        pointId: id,
        cred: id === 1 ? 100 : id === 2 ? 200 : 150,
        content: `Point ${id}`,
        createdAt: new Date(),
        createdBy: "testUser",
        amountSupporters: 0,
        amountNegations: 0,
        negationsCred: 0,
        favor: 0,
        space: "test-space",
        negationIds: [],
    }));
});

jest.mock("@tanstack/react-query", () => {
    const original = jest.requireActual("@tanstack/react-query");
    let mockQueryFn = jest.fn().mockImplementation(({ queryKey, queryFn, enabled }) => {
        if (queryKey[0] === 'viewpoint-stats-points') {
            const pointIds = queryKey[1];
            if (!enabled || pointIds.length === 0) {
                return { data: null, isLoading: false };
            }

            // For testing loading state
            if (pointIds.includes(999)) {
                return { data: null, isLoading: true };
            }

            // Return mock data
            const mockData = [
                { pointId: 1, cred: 100, favor: 0 },
                { pointId: 2, cred: 200, favor: 0 },
                { pointId: 3, cred: 150, favor: 0 },
                { pointId: 4, cred: 1000, favor: 0 }
            ].filter(p => pointIds.includes(p.pointId));

            return {
                data: mockData,
                isLoading: false
            };
        }
        return { data: null, isLoading: false };
    });

    return {
        ...original,
        useQuery: mockQueryFn,
    };
});

describe("ViewpointStatsBar", () => {
    it("renders view and copy counts", () => {
        render(<ViewpointStatsBar views={100} copies={50} />);

        // Check for view count
        expect(screen.getByText("100")).toBeInTheDocument();

        // Check for copy count
        expect(screen.getByText("50")).toBeInTheDocument();
    });

    it("formats large numbers with appropriate suffixes", () => {
        render(<ViewpointStatsBar views={1500} copies={2500000} />);

        // Check for formatted view count (1.5k)
        expect(screen.getByText("1.5k")).toBeInTheDocument();

        // Check for formatted copy count (2.5M)
        expect(screen.getByText("2.5M")).toBeInTheDocument();
    });

    it("applies custom className when provided", () => {
        const { container } = render(
            <ViewpointStatsBar views={100} copies={50} className="custom-class" />
        );

        // Find the top-level div
        const statsBar = container.querySelector("div");

        // Check if it has the custom class
        expect(statsBar).toHaveClass("custom-class");
    });

    it("renders icons for views and copies", () => {
        const { container } = render(<ViewpointStatsBar views={100} copies={50} />);

        // Find SVG elements (these are the icons)
        const eyeIcon = container.querySelector('.lucide-eye');
        const copyIcon = container.querySelector('.lucide-copy');

        // Verify icons exist
        expect(eyeIcon).toBeInTheDocument();
        expect(copyIcon).toBeInTheDocument();
    });

    it("calculates and displays total cred for provided point IDs", async () => {
        const { container } = render(
            <ViewpointStatsBar views={100} copies={50} pointIds={[1, 2, 3]} />
        );

        // Total cred should be 450 (100 + 200 + 150)
        await waitFor(() => {
            expect(screen.getByText("450")).toBeInTheDocument();
        });

        // Check for the coins icon
        const coinsIcon = container.querySelector('.lucide-coins');
        expect(coinsIcon).toBeInTheDocument();
    });

    it("shows loading state while calculating cred", async () => {
        // Render with special ID 999 that triggers loading state in mock
        render(<ViewpointStatsBar views={100} copies={50} pointIds={[999]} />);

        // Should show "Calculating..." while loading
        const credCalculatingElement = screen.getAllByText("Calculating...")[0];
        expect(credCalculatingElement).toBeInTheDocument();

        // Check for the coins icon
        const coinsIcon = credCalculatingElement.closest('div')?.querySelector('.lucide-coins');
        expect(coinsIcon).toBeInTheDocument();
    });

    it("doesn't render cred section when no point IDs are provided", () => {
        const { container } = render(<ViewpointStatsBar views={100} copies={50} />);

        // Should not find the coins icon
        const coinsIcon = container.querySelector('.lucide-coins');
        expect(coinsIcon).not.toBeInTheDocument();
    });

    it("formats large total cred with appropriate suffix", async () => {
        render(<ViewpointStatsBar views={100} copies={50} pointIds={[4]} />);

        // Total cred should be 1000 and displayed as 1.0k
        await waitFor(() => {
            expect(screen.getByText("1.0k")).toBeInTheDocument();
        });
    });

    it("calculates and displays average favor for provided point IDs", async () => {
        // Directly populate the actual useEffect logic with our mock data to ensure proper calculation
        const mockData = [
            { pointId: 1, cred: 100, favor: 20 },
            { pointId: 2, cred: 100, favor: 40 },
            { pointId: 3, cred: 100, favor: 60 }
        ];

        // Mock the useQuery hook to return our controlled data
        const useQueryMock = jest.requireMock("@tanstack/react-query").useQuery;
        useQueryMock.mockImplementation(({ queryKey }: any) => {
            if (queryKey[0] === 'viewpoint-stats-points') {
                return {
                    data: mockData,
                    isLoading: false
                };
            }
            return { data: null, isLoading: false };
        });

        render(<ViewpointStatsBar views={100} copies={50} pointIds={[1, 2, 3]} />);

        // The average favor should be 40 (20 + 40 + 60) / 3
        await waitFor(() => {
            // Look for the exact value without the % sign
            expect(screen.getByText("40")).toBeInTheDocument();
        });

        // Check for the trending up icon
        const trendingUpIcon = screen.getByText("40").closest('div')?.querySelector('.lucide-trending-up');
        expect(trendingUpIcon).toBeInTheDocument();
    });
}); 