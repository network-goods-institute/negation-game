import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// We need to import and test the VoterAvatar component from NodeVoting
// Since it's not exported separately, we'll test it through NodeVoting
import { NodeVoting } from "../NodeVoting";
import { voterCache } from "@/lib/voterCache";
import type { VoterData } from "@/types/voters";
const mockFetch = jest.fn();
const originalFetch = global.fetch;
const createFetchResponse = (data: unknown, ok = true) =>
  Promise.resolve({
    ok,
    status: ok ? 200 : 500,
    json: async () => data,
  });

jest.mock("@/hooks/experiment/multiplayer/useAuthSetup", () => ({
  useAuthSetup: () => ({
    userId: "current-user-id",
    username: "Current User",
    authenticated: true,
  }),
}));

jest.mock("../ThumbsUpIcon", () => ({
  ThumbsUpIcon: () => <div data-testid="thumbs-up-icon">👍</div>,
}));

describe("VoterAvatar loading states", () => {
  beforeAll(() => {
    (global as unknown as { fetch: typeof fetch }).fetch = mockFetch as any;
  });

  afterAll(() => {
    (global as unknown as { fetch: typeof fetch }).fetch = originalFetch as any;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    voterCache.clear();
    mockFetch.mockResolvedValue(createFetchResponse({ voters: [] }));
  });

  describe("loading state", () => {
    it("should show loading skeleton while fetching voter data", async () => {
      // Delay the fetch to keep loading state visible
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(createFetchResponse({ voters: [] })), 100)
          )
      );

      render(
        <NodeVoting
          nodeId="node-1"
          votes={["user-1", "user-2"]}
          onToggleVote={jest.fn()}
        />
      );

      // Should show loading skeletons
      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);

      // Wait for fetch to complete
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it("should not show loading skeleton for cached voters", () => {
      const voters: VoterData[] = [
        { id: "user-1", username: "Alice", avatarUrl: null },
        { id: "user-2", username: "Bob", avatarUrl: null },
      ];

      voterCache.setMany(voters);

      render(
        <NodeVoting
          nodeId="node-1"
          votes={["user-1", "user-2"]}
          onToggleVote={jest.fn()}
        />
      );

      // Should not show loading skeletons since data is cached
      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBe(0);
    });

    it("should only show loading skeleton for uncached voters", async () => {
      const cachedVoter: VoterData = {
        id: "user-1",
        username: "Alice",
        avatarUrl: null,
      };

      const uncachedVoter: VoterData = {
        id: "user-2",
        username: "Bob",
        avatarUrl: null,
      };

      voterCache.set("user-1", cachedVoter);

      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve(createFetchResponse({ voters: [uncachedVoter] })),
              100
            )
          )
      );

      render(
        <NodeVoting
          nodeId="node-1"
          votes={["user-1", "user-2"]}
          onToggleVote={jest.fn()}
        />
      );

      // One skeleton for user-2 (uncached)
      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBe(1);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/users/voters",
          expect.objectContaining({
            body: JSON.stringify({ userIds: ["user-2"] }),
            method: "POST",
          })
        );
      });
    });
  });

  describe("avatar image loading", () => {
    it("should render initials when no avatarUrl is provided", async () => {
      const voters: VoterData[] = [
        { id: "user-1", username: "Alice", avatarUrl: null },
      ];

      mockFetch.mockResolvedValue(createFetchResponse({ voters }));

      render(
        <NodeVoting
          nodeId="node-1"
          votes={["user-1"]}
          onToggleVote={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("AL")).toBeInTheDocument();
      });
    });

    it("should render initials based on user ID when username is not available", async () => {
      const voters: VoterData[] = [
        { id: "user-abc", username: "", avatarUrl: null },
      ];

      mockFetch.mockResolvedValue(createFetchResponse({ voters }));

      render(
        <NodeVoting
          nodeId="node-1"
          votes={["user-abc"]}
          onToggleVote={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("US")).toBeInTheDocument();
      });
    });

    it("should render avatar component when avatarUrl is provided", async () => {
      const voters: VoterData[] = [
        {
          id: "user-1",
          username: "Alice",
          avatarUrl: "https://example.com/alice.jpg",
        },
      ];

      mockFetch.mockResolvedValue(createFetchResponse({ voters }));

      const { container } = render(
        <NodeVoting
          nodeId="node-1"
          votes={["user-1"]}
          onToggleVote={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Avatar elements should be in the DOM
      const avatarElements = container.querySelectorAll("[class*='rounded-full']");
      expect(avatarElements.length).toBeGreaterThan(0);
    });

    it("should handle voters with various data states", async () => {
      const voters: VoterData[] = [
        { id: "user-1", username: "Alice", avatarUrl: null },
        { id: "user-2", username: "", avatarUrl: null },
        {
          id: "user-3",
          username: "Charlie",
          avatarUrl: "https://example.com/charlie.jpg",
        },
      ];

      mockFetch.mockResolvedValue(createFetchResponse({ voters }));

      render(
        <NodeVoting
          nodeId="node-1"
          votes={["user-1", "user-2", "user-3"]}
          onToggleVote={jest.fn()}
        />
      );

      await waitFor(() => {
        // At least one set of initials should render
        expect(screen.getByText("AL")).toBeInTheDocument();
      });
    });
  });

  describe("avatar tooltip data", () => {
    it("should render tooltips for avatars", async () => {
      const voters: VoterData[] = [
        { id: "user-1", username: "Alice", avatarUrl: null },
      ];

      mockFetch.mockResolvedValue(createFetchResponse({ voters }));

      const { container } = render(
        <NodeVoting
          nodeId="node-1"
          votes={["user-1"]}
          onToggleVote={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Tooltip triggers should be present
      const tooltipTriggers = container.querySelectorAll("[data-state]");
      expect(tooltipTriggers.length).toBeGreaterThan(0);
    });

    it("should render avatar for current user", async () => {
      const voters: VoterData[] = [
        { id: "current-user-id", username: "Current User", avatarUrl: null },
      ];

      mockFetch.mockResolvedValue(createFetchResponse({ voters }));

      render(
        <NodeVoting
          nodeId="node-1"
          votes={["current-user-id"]}
          onToggleVote={jest.fn()}
        />
      );

      await waitFor(() => {
        // Should render initials for current user
        expect(screen.getByText("CU")).toBeInTheDocument();
      });
    });

    it("should render initials when username is missing", async () => {
      const voters: VoterData[] = [
        { id: "user-123456", username: "", avatarUrl: null },
      ];

      mockFetch.mockResolvedValue(createFetchResponse({ voters }));

      render(
        <NodeVoting
          nodeId="node-1"
          votes={["user-123456"]}
          onToggleVote={jest.fn()}
        />
      );

      await waitFor(() => {
        // Should render initials based on ID
        expect(screen.getByText("US")).toBeInTheDocument();
      });
    });
  });

  describe("avatar rendering limits", () => {
    it("should render maximum 4 avatars", async () => {
      const voters: VoterData[] = Array.from({ length: 10 }, (_, i) => ({
        id: `user-${i}`,
        username: `User ${i}`,
        avatarUrl: null,
      }));

      mockFetch.mockResolvedValue(createFetchResponse({ voters }));

      render(
        <NodeVoting
          nodeId="node-1"
          votes={voters.map((v) => v.id)}
          onToggleVote={jest.fn()}
        />
      );

      await waitFor(() => {
        // Count avatar elements (initials)
        const avatars = document.querySelectorAll("[class*='Avatar']");
        // Should show 4 avatars + remaining count
        expect(screen.getByText("+6")).toBeInTheDocument();
      });
    });

    it("should not show remaining count when 4 or fewer voters", async () => {
      const voters: VoterData[] = Array.from({ length: 3 }, (_, i) => ({
        id: `user-${i}`,
        username: `User ${i}`,
        avatarUrl: null,
      }));

      mockFetch.mockResolvedValue(createFetchResponse({ voters }));

      render(
        <NodeVoting
          nodeId="node-1"
          votes={voters.map((v) => v.id)}
          onToggleVote={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Should not show +N indicator
      expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
    });
  });

  describe("avatar styling", () => {
    it("should render avatars with proper structure", async () => {
      const voters: VoterData[] = [
        { id: "user-1", username: "Alice", avatarUrl: null },
      ];

      mockFetch.mockResolvedValue(createFetchResponse({ voters }));

      const { container } = render(
        <NodeVoting
          nodeId="node-1"
          votes={["user-1"]}
          onToggleVote={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Check that avatars are rendered
      const avatarElements = container.querySelectorAll("[class*='rounded-full']");
      expect(avatarElements.length).toBeGreaterThan(0);
    });

    it("should apply border styling to avatars", async () => {
      const voters: VoterData[] = [
        { id: "user-1", username: "Alice", avatarUrl: null },
      ];

      mockFetch.mockResolvedValue(createFetchResponse({ voters }));

      const { container } = render(
        <NodeVoting
          nodeId="node-1"
          votes={["user-1"]}
          onToggleVote={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const avatarElements = container.querySelectorAll("[class*='border']");
      expect(avatarElements.length).toBeGreaterThan(0);
    });
  });
});
