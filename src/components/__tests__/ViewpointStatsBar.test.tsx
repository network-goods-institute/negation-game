import React from "react";
import { render, screen, waitFor } from "@/lib/tests/test-utils";
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

    it("shows total cred when provided", () => {
        render(<ViewpointStatsBar views={100} copies={50} totalCred={450} />);

        // Total cred should be 450
        expect(screen.getByText("450")).toBeInTheDocument();

        // Check for the coins icon
        const coinsIcon = screen.getByText("450").closest('div')?.querySelector('.lucide-coins');
        expect(coinsIcon).toBeInTheDocument();
    });

    it("shows average favor when provided", () => {
        render(<ViewpointStatsBar views={100} copies={50} averageFavor={40} />);

        // The average favor should be 40
        expect(screen.getByText("40")).toBeInTheDocument();

        // Check for the trending up icon
        const trendingUpIcon = screen.getByText("40").closest('div')?.querySelector('.lucide-trending-up');
        expect(trendingUpIcon).toBeInTheDocument();
    });

    it("formats large total cred with appropriate suffix", () => {
        render(<ViewpointStatsBar views={100} copies={50} totalCred={1000} />);

        // Total cred should be 1000 and displayed as 1.0k
        expect(screen.getByText("1.0k")).toBeInTheDocument();
    });

    it("doesn't render cred and favor sections when zero", () => {
        const { container } = render(<ViewpointStatsBar views={100} copies={50} totalCred={0} averageFavor={0} />);

        // Should not find the coins or trending up icons
        const coinsIcon = container.querySelector('.lucide-coins');
        const trendingUpIcon = container.querySelector('.lucide-trending-up');
        expect(coinsIcon).not.toBeInTheDocument();
        expect(trendingUpIcon).not.toBeInTheDocument();
    });
}); 