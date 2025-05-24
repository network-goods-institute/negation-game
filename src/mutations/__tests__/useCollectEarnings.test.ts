// Mock dependencies first
jest.mock("../auth/useAuthenticatedMutation", () => ({
  useAuthenticatedMutation: jest.fn(),
}));

jest.mock("@/queries/points/usePointData", () => ({
  useInvalidateRelatedPoints: jest.fn(),
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: jest.fn(),
}));

jest.mock("@privy-io/react-auth", () => ({
  usePrivy: jest.fn(),
}));

// Mock the action
jest.mock("@/actions/epistemic/collectEarnings", () => {
  const collectEarnings = jest.fn(async () => ({
    totalEarnings: 42,
    affectedPoints: [1, 2, 3],
  }));
  return { collectEarnings };
});

// Import after mocking
import { useCollectEarnings } from "../epistemic/useCollectEarnings";
import { useAuthenticatedMutation } from "../auth/useAuthenticatedMutation";
import { collectEarnings } from "@/actions/epistemic/collectEarnings";
import { useInvalidateRelatedPoints } from "@/queries/points/usePointData";
import { useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { userQueryKey } from "@/queries/users/useUser";

describe("useCollectEarnings", () => {
  // Setup common mocks
  const mockInvalidateRelatedPoints = jest.fn();
  const mockQueryClient = {
    invalidateQueries: jest.fn(),
  };
  const mockUser = { id: "user-123" };

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default mocks
    (useInvalidateRelatedPoints as jest.Mock).mockReturnValue(
      mockInvalidateRelatedPoints
    );
    (useQueryClient as jest.Mock).mockReturnValue(mockQueryClient);
    (usePrivy as jest.Mock).mockReturnValue({ user: mockUser });
  });

  it("should use useAuthenticatedMutation with collectEarnings action", () => {
    // Mock the hook to return a mutation object
    const mockMutation = {
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
    };
    (useAuthenticatedMutation as jest.Mock).mockReturnValue(mockMutation);

    // Call the hook
    const result = useCollectEarnings();

    // Verify it was called with the correct parameters
    expect(useAuthenticatedMutation).toHaveBeenCalledWith({
      mutationFn: collectEarnings,
      onSuccess: expect.any(Function),
    });

    // Verify the result is the mutation object
    expect(result).toBe(mockMutation);
  });

  it("should invalidate related queries on success", async () => {
    // Mock useAuthenticatedMutation to capture and execute the onSuccess callback
    let onSuccessCallback: Function | undefined;
    (useAuthenticatedMutation as jest.Mock).mockImplementation(
      ({ onSuccess }) => {
        onSuccessCallback = onSuccess;
        return { mutateAsync: jest.fn() };
      }
    );

    // Call the hook
    useCollectEarnings();

    // Now execute the onSuccess callback with test data
    expect(onSuccessCallback).toBeDefined();
    if (onSuccessCallback) {
      onSuccessCallback({
        totalEarnings: 42,
        affectedPoints: [1, 2, 3],
      });
    }

    // Verify user query invalidation
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: userQueryKey(mockUser.id),
    });

    // Verify earnings preview invalidation
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["earnings-preview"],
    });

    // Verify each affected point is invalidated
    expect(mockInvalidateRelatedPoints).toHaveBeenCalledWith(1);
    expect(mockInvalidateRelatedPoints).toHaveBeenCalledWith(2);
    expect(mockInvalidateRelatedPoints).toHaveBeenCalledWith(3);
  });

  it("should handle multiple affected points correctly", async () => {
    // Mock useAuthenticatedMutation to capture and execute the onSuccess callback
    let onSuccessCallback: Function | undefined;
    (useAuthenticatedMutation as jest.Mock).mockImplementation(
      ({ onSuccess }) => {
        onSuccessCallback = onSuccess;
        return { mutateAsync: jest.fn() };
      }
    );

    // Call the hook
    useCollectEarnings();

    // Execute with many affected points
    expect(onSuccessCallback).toBeDefined();
    if (onSuccessCallback) {
      onSuccessCallback({
        totalEarnings: 100,
        affectedPoints: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      });
    }

    // Verify each point was invalidated
    expect(mockInvalidateRelatedPoints).toHaveBeenCalledTimes(10);
    for (let i = 1; i <= 10; i++) {
      expect(mockInvalidateRelatedPoints).toHaveBeenCalledWith(i);
    }
  });

  it("should pass through to the underlying action when called", async () => {
    // Mock the hook to return a mutation object
    const mockMutateAsync = jest.fn().mockResolvedValue({
      totalEarnings: 42,
      affectedPoints: [1, 2, 3],
    });
    (useAuthenticatedMutation as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
    });

    // Call the hook and then call mutateAsync
    const { mutateAsync } = useCollectEarnings();
    const result = await mutateAsync();

    // Verify the mutateAsync was called with no arguments
    expect(mockMutateAsync).toHaveBeenCalled();

    // Verify the expected result
    expect(result).toEqual({
      totalEarnings: 42,
      affectedPoints: [1, 2, 3],
    });
  });
});
