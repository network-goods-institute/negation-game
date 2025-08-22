
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TopicsPageClient from "@/app/s/[space]/topics/TopicsPageClient";
import { useAllTopics } from "@/queries/topics/useAllTopics";
import { useUserTopicRationales } from "@/queries/topics/useUserTopicRationales";

jest.mock("@/queries/topics/useAllTopics");
jest.mock("@/queries/topics/useUserTopicRationales");
jest.mock("@privy-io/react-auth", () => ({
    usePrivy: () => ({ user: { id: "test-user-id" } }),
}));
jest.mock("@/components/layouts/SpaceLayout", () => ({
    SpaceLayout: ({ children, header }: any) => (
        <div data-testid="space-layout">
            {header}
            {children}
        </div>
    ),
}));
jest.mock("@/components/layouts/headers/SpaceChildHeader", () => ({
    SpaceChildHeader: ({ title, subtitle, rightActions }: any) => (
        <div data-testid="space-child-header">
            <h1>{title}</h1>
            <p>{subtitle}</p>
            {rightActions}
        </div>
    ),
}));
jest.mock("@/components/topic/TopicCard", () => ({
    TopicCard: ({ topic, hasUserRationale }: any) => (
        <div data-testid="topic-card">
            <h3>{topic.name}</h3>
            {topic.closed && <span>Closed</span>}
            {!topic.closed && !hasUserRationale && <p>Missing rationale</p>}
        </div>
    ),
}));
jest.mock("@/components/space/skeletons", () => ({
    TopicCardSkeleton: () => <div data-testid="topic-card-skeleton">Loading...</div>,
}));

const mockUseAllTopics = useAllTopics as jest.MockedFunction<typeof useAllTopics>;
const mockUseUserTopicRationales = useUserTopicRationales as jest.MockedFunction<typeof useUserTopicRationales>;

const mockTopics = [
    {
        id: 1,
        name: "Open Topic 1",
        closed: false,
        rationalesCount: 5,
        pointsCount: 10,
        latestRationaleAt: new Date("2024-01-01"),
        earliestRationaleAt: new Date("2024-01-01"),
        latestAuthorUsername: "user1",
    },
    {
        id: 2,
        name: "Closed Topic 1",
        closed: true,
        rationalesCount: 3,
        pointsCount: 7,
        latestRationaleAt: new Date("2024-01-02"),
        earliestRationaleAt: new Date("2024-01-02"),
        latestAuthorUsername: "user2",
    },
    {
        id: 3,
        name: "Open Topic 2",
        closed: false,
        rationalesCount: 0,
        pointsCount: 0,
        latestRationaleAt: null,
        earliestRationaleAt: null,
        latestAuthorUsername: null,
    },
    {
        id: 4,
        name: "Open Topic 3",
        closed: false,
        rationalesCount: 0,
        pointsCount: 0,
        latestRationaleAt: null,
        earliestRationaleAt: null,
        latestAuthorUsername: null,
    },
];

const createQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
    },
});

const renderWithQueryClient = (component: React.ReactElement) => {
    const queryClient = createQueryClient();
    return render(
        <QueryClientProvider client={queryClient}>
            {component}
        </QueryClientProvider>
    );
};

describe("TopicsPageClient", () => {
    beforeEach(() => {
        mockUseAllTopics.mockReturnValue({
            data: mockTopics,
            isLoading: false,
            error: null,
        } as any);

        mockUseUserTopicRationales.mockReturnValue({
            data: [1],
            isLoading: false,
            error: null,
        } as any);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("renders all topics including closed ones", () => {
        renderWithQueryClient(<TopicsPageClient space="test-space" />);

        expect(screen.getByText("Open Topic 1")).toBeInTheDocument();
        expect(screen.getByText("Closed Topic 1")).toBeInTheDocument();
        expect(screen.getByText("Open Topic 2")).toBeInTheDocument();
        expect(screen.getByText("Open Topic 3")).toBeInTheDocument();
    });

    it("shows closed badge for closed topics", () => {
        renderWithQueryClient(<TopicsPageClient space="test-space" />);

        expect(screen.getByText("Closed")).toBeInTheDocument();
    });

    it("does not show missing rationale text for closed topics", () => {
        renderWithQueryClient(<TopicsPageClient space="test-space" />);

        // The closed topic (ID 2) should not show "Missing rationale" even though user doesn't have a rationale for it
        // because closed topics are not actionable
        // Check that the closed topic specifically doesn't show missing rationale
        const closedTopicCard = screen.getByText("Closed Topic 1").closest('[data-testid="topic-card"]');
        expect(closedTopicCard).not.toHaveTextContent("Missing rationale");
    });

    it("shows correct topic counts in summary badges", () => {
        renderWithQueryClient(<TopicsPageClient space="test-space" />);

        // Check that the summary badges show correct counts
        expect(screen.getByText("4 total")).toBeInTheDocument();
        expect(screen.getByText("2 with rationales")).toBeInTheDocument();
        expect(screen.getByText("2 without rationales")).toBeInTheDocument();
        expect(screen.getByText("1 have my rationale")).toBeInTheDocument();
        expect(screen.getByText("2 need my rationale")).toBeInTheDocument();
    });



    it("displays correct topic counts", () => {
        renderWithQueryClient(<TopicsPageClient space="test-space" />);

        expect(screen.getByText("4 total")).toBeInTheDocument();
        // Only open topics should be counted for rationale status
        expect(screen.getByText("2 need my rationale")).toBeInTheDocument();
        expect(screen.getByText("1 have my rationale")).toBeInTheDocument();
    });

    it("handles loading state", () => {
        mockUseAllTopics.mockReturnValue({
            data: undefined,
            isLoading: true,
            error: null,
        } as any);

        renderWithQueryClient(<TopicsPageClient space="test-space" />);

        expect(screen.getAllByTestId("topic-card-skeleton")).toHaveLength(6);
    });
});
