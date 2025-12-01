import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NodeVoting } from "../NodeVoting";
import { voterCache } from "@/lib/voterCache";
import { logger } from "@/lib/logger";
import type { VoterData } from "@/types/voters";
const mockFetch = jest.fn();
const originalFetch = global.fetch;
const createFetchResponse = (data: unknown, ok = true) =>
  Promise.resolve({
    ok,
    status: ok ? 200 : 500,
    json: async () => data,
  });

// Mock useAuthSetup
jest.mock("@/hooks/experiment/multiplayer/useAuthSetup", () => ({
  useAuthSetup: () => ({
    userId: "current-user-id",
    username: "Current User",
    authenticated: true,
  }),
}));

// Mock ThumbsUpIcon
jest.mock("../ThumbsUpIcon", () => ({
  ThumbsUpIcon: ({ filled }: { filled: boolean }) => (
    <div data-testid="thumbs-up-icon" data-filled={filled}>
      👍
    </div>
  ),
}));

describe("NodeVoting", () => {
  const mockOnToggleVote = jest.fn();

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

  describe("rendering", () => {
    it("should render like button with no votes", () => {
      render(
        <NodeVoting
          nodeId="node-1"
          votes={[]}
          onToggleVote={mockOnToggleVote}
        />
      );

      const button = screen.getByRole("button", { name: /like/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute("aria-pressed", "false");
    });

    it("should show voted state when current user has voted", async () => {
      render(
        <NodeVoting
          nodeId="node-1"
          votes={["current-user-id"]}
          onToggleVote={mockOnToggleVote}
        />
      );

      const button = screen.getByRole("button", { name: /unlike/i });
      expect(button).toHaveAttribute("aria-pressed", "true");

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it("should render unfilled thumbs up icon regardless of vote state", async () => {
      const { rerender } = render(
        <NodeVoting
          nodeId="node-1"
          votes={[]}
          onToggleVote={mockOnToggleVote}
        />
      );

      expect(screen.getByTestId("thumbs-up-icon")).toHaveAttribute("data-filled", "false");

      rerender(
        <NodeVoting
          nodeId="node-1"
          votes={["current-user-id"]}
          onToggleVote={mockOnToggleVote}
        />
      );

      expect(screen.getByTestId("thumbs-up-icon")).toHaveAttribute("data-filled", "false");

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it("should render avatars when there are votes", async () => {
      const voters: VoterData[] = [
        { id: "user-1", username: "Alice", avatarUrl: null },
        { id: "user-2", username: "Bob", avatarUrl: "https://example.com/bob.jpg" },
      ];

      mockFetch.mockResolvedValue(createFetchResponse({ voters }));

      render(
        <NodeVoting
          nodeId="node-1"
          votes={["user-1", "user-2"]}
          onToggleVote={mockOnToggleVote}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/users/voters",
          expect.objectContaining({
            body: JSON.stringify({ userIds: ["user-1", "user-2"] }),
            method: "POST",
          })
        );
      });
    });

    it("should show loading skeletons while fetching voter data", async () => {
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
          onToggleVote={mockOnToggleVote}
        />
      );

      // Should show loading skeletons
      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("should show +N indicator when more than 4 voters", async () => {
      const voters: VoterData[] = [
        { id: "user-1", username: "Alice", avatarUrl: null },
        { id: "user-2", username: "Bob", avatarUrl: null },
        { id: "user-3", username: "Charlie", avatarUrl: null },
        { id: "user-4", username: "David", avatarUrl: null },
        { id: "user-5", username: "Eve", avatarUrl: null },
        { id: "user-6", username: "Frank", avatarUrl: null },
      ];

      mockFetch.mockResolvedValue(createFetchResponse({ voters }));

      render(
        <NodeVoting
          nodeId="node-1"
          votes={voters.map((v) => v.id)}
          onToggleVote={mockOnToggleVote}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("+2")).toBeInTheDocument();
      });
    });
  });

  describe("voting interaction", () => {
    it("should call onToggleVote when button is clicked", () => {
      render(
        <NodeVoting
          nodeId="node-1"
          votes={[]}
          onToggleVote={mockOnToggleVote}
        />
      );

      const button = screen.getByRole("button", { name: /like/i });
      fireEvent.click(button);

      expect(mockOnToggleVote).toHaveBeenCalledWith(
        "node-1",
        "current-user-id",
        "Current User"
      );
    });

    it("should not call onToggleVote when onToggleVote is undefined", () => {
      render(<NodeVoting nodeId="node-1" votes={[]} />);

      const button = screen.getByRole("button", { name: /like/i });
      fireEvent.click(button);

      expect(mockOnToggleVote).not.toHaveBeenCalled();
    });

    it("should have data-interactive attribute for event handling", () => {
      render(
        <NodeVoting
          nodeId="node-1"
          votes={[]}
          onToggleVote={mockOnToggleVote}
        />
      );

      const button = screen.getByRole("button", { name: /like/i });
      expect(button).toHaveAttribute("data-interactive", "true");
    });
  });

  describe("caching", () => {
    it("should use cached data when available", async () => {
      const voters: VoterData[] = [
        { id: "user-1", username: "Alice", avatarUrl: null },
        { id: "user-2", username: "Bob", avatarUrl: null },
      ];

      // Pre-populate cache
      voterCache.setMany(voters);

      render(
        <NodeVoting
          nodeId="node-1"
          votes={["user-1", "user-2"]}
          onToggleVote={mockOnToggleVote}
        />
      );

      // Should not fetch since data is cached
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should only fetch missing voters when some are cached", async () => {
      const cachedVoter: VoterData = {
        id: "user-1",
        username: "Alice",
        avatarUrl: null,
      };

      const fetchedVoter: VoterData = {
        id: "user-2",
        username: "Bob",
        avatarUrl: null,
      };

      voterCache.set("user-1", cachedVoter);
      mockFetch.mockResolvedValue(createFetchResponse({ voters: [fetchedVoter] }));

      render(
        <NodeVoting
          nodeId="node-1"
          votes={["user-1", "user-2"]}
          onToggleVote={mockOnToggleVote}
        />
      );

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

    it("should cache fetched voters for future renders", async () => {
      const voters: VoterData[] = [
        { id: "user-1", username: "Alice", avatarUrl: null },
      ];

      mockFetch.mockResolvedValue(createFetchResponse({ voters }));

      const { unmount } = render(
        <NodeVoting
          nodeId="node-1"
          votes={["user-1"]}
          onToggleVote={mockOnToggleVote}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      unmount();

      // Re-render with same voter
      render(
        <NodeVoting
          nodeId="node-2"
          votes={["user-1"]}
          onToggleVote={mockOnToggleVote}
        />
      );

      // Should not fetch again since voter is cached
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("variant styling", () => {
    it("should apply blue variant styles by default", () => {
      render(
        <NodeVoting
          nodeId="node-1"
          votes={[]}
          onToggleVote={mockOnToggleVote}
        />
      );

      const button = screen.getByRole("button", { name: /like/i });
      expect(button).toHaveClass("border-stone-300");
    });

    it("should apply orange variant styles when specified", () => {
      render(
        <NodeVoting
          nodeId="node-1"
          votes={[]}
          onToggleVote={mockOnToggleVote}
          variant="orange"
        />
      );

      const button = screen.getByRole("button", { name: /like/i });
      expect(button).toHaveClass("border-amber-300");
    });
  });

  describe("voter data display", () => {
    it("should fetch voter data when votes are provided", async () => {
      const voters: VoterData[] = [
        { id: "user-1", username: "Alice", avatarUrl: null },
        { id: "user-2", username: "Bob", avatarUrl: null },
      ];

      mockFetch.mockResolvedValue(createFetchResponse({ voters }));

      render(
        <NodeVoting
          nodeId="node-1"
          votes={["user-1", "user-2"]}
          onToggleVote={mockOnToggleVote}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/users/voters",
          expect.objectContaining({
            body: JSON.stringify({ userIds: ["user-1", "user-2"] }),
            method: "POST",
          })
        );
      });
    });

    it("should render voter initials", async () => {
      const voters: VoterData[] = [
        { id: "user-1", username: "Alice", avatarUrl: null },
        { id: "user-2", username: "Bob", avatarUrl: null },
      ];

      mockFetch.mockResolvedValue(createFetchResponse({ voters }));

      render(
        <NodeVoting
          nodeId="node-1"
          votes={["user-1", "user-2"]}
          onToggleVote={mockOnToggleVote}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("AL")).toBeInTheDocument();
        expect(screen.getByText("BO")).toBeInTheDocument();
      });
    });

    it("should show current user's initials when they have voted", async () => {
      const voters: VoterData[] = [
        { id: "current-user-id", username: "Current User", avatarUrl: null },
      ];

      mockFetch.mockResolvedValue(createFetchResponse({ voters }));

      render(
        <NodeVoting
          nodeId="node-1"
          votes={["current-user-id"]}
          onToggleVote={mockOnToggleVote}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("CU")).toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("should handle fetch errors gracefully", async () => {
      const loggerError = jest.spyOn(logger, "error").mockImplementation(() => {});
      mockFetch.mockRejectedValue(new Error("Network error"));

      render(
        <NodeVoting
          nodeId="node-1"
          votes={["user-1"]}
          onToggleVote={mockOnToggleVote}
        />
      );

      await waitFor(() => {
        expect(loggerError).toHaveBeenCalledWith(
          "Failed to fetch voter data:",
          expect.any(Error)
        );
      });

      loggerError.mockRestore();
    });
  });
});
