// Mock dependencies first
jest.mock("../useAuthenticatedMutation", () => ({
  useAuthenticatedMutation: jest.fn(),
}));

jest.mock("@/queries/usePointData", () => ({
  useInvalidateRelatedPoints: jest.fn(),
  pointQueryKey: jest.fn(({ pointId, userId }) => [
    "point",
    { pointId, userId },
  ]),
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: jest.fn(),
}));

jest.mock("@privy-io/react-auth", () => ({
  usePrivy: jest.fn(),
}));

jest.mock("@/queries/useDoubtForRestake", () => ({
  doubtForRestakeQueryKey: jest.fn(({ pointId, negationId, userId }) => [
    "doubt-for-restake",
    pointId,
    negationId,
    userId,
  ]),
}));

jest.mock("@/queries/useRestakeForPoints", () => ({
  restakeForPointsQueryKey: jest.fn(({ pointId, negationId, userId }) => [
    "restake-for-points",
    pointId,
    negationId,
    userId,
  ]),
}));

// Mock useVisitedPoints hook
jest.mock("@/hooks/useVisitedPoints", () => ({
  useVisitedPoints: jest.fn(() => ({
    markPointAsRead: jest.fn(),
    isVisited: jest.fn(),
    arePointsVisited: jest.fn(),
  })),
}));

// Instead of mocking the action itself, mock its dependencies
jest.mock("@/actions/restake", () => {
  const restake = jest.fn(async ({ pointId, negationId, amount }) => 123);
  return { restake };
});

// Mock setTimeout to speed up tests
jest.useFakeTimers();

// Import after mocking
import { useRestake } from "../useRestake";
import { useAuthenticatedMutation } from "../useAuthenticatedMutation";
import { restake } from "@/actions/restake";
import { useInvalidateRelatedPoints } from "@/queries/usePointData";
import { useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { doubtForRestakeQueryKey } from "@/queries/useDoubtForRestake";
import { restakeForPointsQueryKey } from "@/queries/useRestakeForPoints";
import { useVisitedPoints } from "@/hooks/useVisitedPoints";

describe("useRestake", () => {
  // Setup common mocks
  const mockInvalidateRelatedPoints = jest.fn();
  const mockQueryClient = {
    invalidateQueries: jest.fn(),
    refetchQueries: jest.fn().mockResolvedValue(undefined),
  };
  const mockUser = { id: "user-123" };
  const mockMarkPointAsRead = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default mocks
    (useInvalidateRelatedPoints as jest.Mock).mockReturnValue(
      mockInvalidateRelatedPoints
    );
    (useQueryClient as jest.Mock).mockReturnValue(mockQueryClient);
    (usePrivy as jest.Mock).mockReturnValue({ user: mockUser });
    (useVisitedPoints as jest.Mock).mockReturnValue({
      markPointAsRead: mockMarkPointAsRead,
      isVisited: jest.fn(),
      arePointsVisited: jest.fn(),
    });
    (doubtForRestakeQueryKey as jest.Mock).mockImplementation(
      ({ pointId, negationId, userId }) => [
        "doubt-for-restake",
        pointId,
        negationId,
        userId,
      ]
    );
    (restakeForPointsQueryKey as jest.Mock).mockImplementation(
      ({ pointId, negationId, userId }) => [
        "restake-for-points",
        pointId,
        negationId,
        userId,
      ]
    );
  });

  it("should use useAuthenticatedMutation with restake action", () => {
    // Mock the hook to return a mutation object
    const mockMutation = {
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
    };
    (useAuthenticatedMutation as jest.Mock).mockReturnValue(mockMutation);

    // Call the hook
    const result = useRestake();

    // Verify it was called with the correct parameters
    expect(useAuthenticatedMutation).toHaveBeenCalledWith({
      mutationFn: restake,
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
    useRestake();

    // Now execute the onSuccess callback with test data
    expect(onSuccessCallback).toBeDefined();
    if (onSuccessCallback) {
      const promise = onSuccessCallback(123, { pointId: 456, negationId: 789 });
      // Fast-forward through the setTimeout in onSuccess
      jest.runAllTimers();
      await promise;
    }

    // Verify the correct invalidation calls were made
    expect(mockInvalidateRelatedPoints).toHaveBeenCalledWith(456);
    expect(mockInvalidateRelatedPoints).toHaveBeenCalledWith(789);

    // Verify other invalidation queries
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["restake", 456, 789],
      exact: false,
    });

    // Verify immediate refetch of doubt data
    expect(mockQueryClient.refetchQueries).toHaveBeenCalledWith({
      queryKey: ["doubt-for-restake", 456, 789, mockUser.id],
      exact: true,
    });

    // Verify immediate refetch of restake data
    expect(mockQueryClient.refetchQueries).toHaveBeenCalledWith({
      queryKey: ["restake-for-points", 456, 789, mockUser.id],
      exact: true,
    });

    // Verify invalidation of effective-restakes queries
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["effective-restakes", 456, 789],
      exact: false,
    });

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["point-negations", 456],
      exact: false,
    });

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["point-negations", 789],
      exact: false,
    });

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: [456, "favor-history"],
      exact: false,
    });

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: [789, "favor-history"],
      exact: false,
    });

    // Check user specific invalidation
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["user", mockUser.id],
    });

    // Verify feed invalidation
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["feed"],
    });

    // Verify pinnedPoint invalidation
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["pinnedPoint"],
      exact: false,
    });

    // Verify users-reputation invalidation
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["users-reputation"],
      exact: false,
    });

    // And point data refetch
    expect(mockQueryClient.refetchQueries).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.arrayContaining([
          "point",
          expect.objectContaining({ pointId: 456 }),
        ]),
      })
    );

    expect(mockQueryClient.refetchQueries).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.arrayContaining([
          "point",
          expect.objectContaining({ pointId: 789 }),
        ]),
      })
    );
  });

  it("should pass the arguments to the underlying action when called", async () => {
    // Mock the hook to return a mutation object
    const mockMutateAsync = jest.fn().mockResolvedValue(123);
    (useAuthenticatedMutation as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
    });

    // Call the hook and then call mutateAsync
    const { mutateAsync } = useRestake();
    await mutateAsync({
      pointId: 456,
      negationId: 789,
      amount: 10,
    });

    // Verify the mutateAsync was called with the correct arguments
    expect(mockMutateAsync).toHaveBeenCalledWith({
      pointId: 456,
      negationId: 789,
      amount: 10,
    });
  });

  // Clean up
  afterAll(() => {
    jest.useRealTimers();
  });
});
