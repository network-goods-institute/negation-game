// Mock dependencies first
jest.mock("../auth/useAuthenticatedMutation", () => ({
  useAuthenticatedMutation: jest.fn(),
}));

jest.mock("@/queries/points/usePointData", () => ({
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

// Mock useVisitedPoints hook
jest.mock("@/hooks/points/useVisitedPoints", () => ({
  useVisitedPoints: jest.fn(() => ({
    markPointAsRead: jest.fn(),
    isVisited: jest.fn(),
    arePointsVisited: jest.fn(),
  })),
}));

// Instead of mocking the action itself, mock its dependencies
jest.mock("@/actions/epistemic/doubt", () => {
  const doubt = jest.fn(async ({ pointId, negationId, amount }) => ({
    doubtId: 123,
    earnings: 5,
  }));
  return { doubt };
});

// Import after mocking
import { useDoubt } from "../epistemic/useDoubt";
import { useAuthenticatedMutation } from "../auth/useAuthenticatedMutation";
import { doubt } from "@/actions/epistemic/doubt";
import { useInvalidateRelatedPoints } from "@/queries/points/usePointData";
import { pointNegationsQueryKey } from "@/queries/points/usePointNegations";
import { useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { useVisitedPoints } from "@/hooks/points/useVisitedPoints";

describe("useDoubt", () => {
  // Setup common mocks
  const mockInvalidateRelatedPoints = jest.fn();
  const mockQueryClient = {
    invalidateQueries: jest.fn(),
    refetchQueries: jest.fn(),
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
  });

  it("should use useAuthenticatedMutation with doubt action", () => {
    // Mock the hook to return a mutation object
    const mockMutation = {
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
    };
    (useAuthenticatedMutation as jest.Mock).mockReturnValue(mockMutation);

    // Call the hook
    const result = useDoubt();

    // Verify it was called with the correct parameters
    expect(useAuthenticatedMutation).toHaveBeenCalledWith({
      mutationFn: doubt,
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
    useDoubt();

    // Now execute the onSuccess callback with test data
    expect(onSuccessCallback).toBeDefined();
    if (onSuccessCallback) {
      onSuccessCallback(
        { doubtId: 123, earnings: 5 },
        { pointId: 456, negationId: 789 }
      );
    }

    // Verify the correct invalidation calls were made
    expect(mockInvalidateRelatedPoints).toHaveBeenCalledWith(456);
    expect(mockInvalidateRelatedPoints).toHaveBeenCalledWith(789);

    // Verify markPointAsRead was called
    expect(mockMarkPointAsRead).toHaveBeenCalledWith(456);

    // Verify doubt-specific invalidation
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["doubt", 456, 789],
      exact: false,
    });

    // Verify other invalidation queries
    const expectedPointNegationsKeyPoint = pointNegationsQueryKey({
      pointId: 456,
      userId: mockUser.id,
    });
    const expectedPointNegationsKeyNeg = pointNegationsQueryKey({
      pointId: 789,
      userId: mockUser.id,
    });

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: expectedPointNegationsKeyPoint,
      exact: false,
    });

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: expectedPointNegationsKeyNeg,
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
    const mockMutateAsync = jest
      .fn()
      .mockResolvedValue({ doubtId: 123, earnings: 5 });
    (useAuthenticatedMutation as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
    });

    // Call the hook and then call mutateAsync
    const { mutateAsync } = useDoubt();
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
});
