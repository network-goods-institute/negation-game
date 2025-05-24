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

jest.mock("@/queries/users/useUserEndorsements", () => ({
  userEndorsementsQueryKey: jest.fn(({ pointId, userId }) => [
    "user-endorsements",
    pointId,
    userId,
  ]),
}));

jest.mock("@/queries/space/useSpace", () => ({
  useSpace: jest.fn(),
}));

jest.mock("@/hooks/points/useVisitedPoints", () => ({
  useVisitedPoints: jest.fn(),
}));

jest.mock("jotai", () => ({
  useAtom: jest.fn(),
}));

jest.mock("@/atoms/visitedPointsAtom", () => ({
  visitedPointsAtom: "mock-visited-points-atom",
}));

// Instead of mocking the action itself, mock its dependencies
jest.mock("@/actions/endorsements/endorse", () => {
  const endorse = jest.fn(async ({ pointId, cred }) => 123);
  return { endorse };
});

// Import after mocking
import { useEndorse } from "../endorsements/useEndorse";
import { useAuthenticatedMutation } from "../auth/useAuthenticatedMutation";
import { endorse } from "@/actions/endorsements/endorse";
import { useInvalidateRelatedPoints } from "@/queries/points/usePointData";
import { useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { userEndorsementsQueryKey } from "@/queries/users/useUserEndorsements";
import { useSpace } from "@/queries/space/useSpace";
import { useVisitedPoints } from "@/hooks/points/useVisitedPoints";
import { useAtom } from "jotai";
import { visitedPointsAtom } from "@/atoms/visitedPointsAtom";

describe("useEndorse", () => {
  // Setup common mocks
  const mockInvalidateRelatedPoints = jest.fn();
  const mockQueryClient = {
    invalidateQueries: jest.fn(),
  };
  const mockUser = { id: "user-123" };
  const mockSpace = { data: { id: "space-123" } };
  const mockMarkPointAsRead = jest.fn();
  const mockSetVisitedPoints = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default mocks
    (useInvalidateRelatedPoints as jest.Mock).mockReturnValue(
      mockInvalidateRelatedPoints
    );
    (useQueryClient as jest.Mock).mockReturnValue(mockQueryClient);
    (usePrivy as jest.Mock).mockReturnValue({ user: mockUser });
    (useSpace as jest.Mock).mockReturnValue(mockSpace);
    (useVisitedPoints as jest.Mock).mockReturnValue({
      markPointAsRead: mockMarkPointAsRead,
    });
    (useAtom as jest.Mock).mockReturnValue([new Set(), mockSetVisitedPoints]);
    (userEndorsementsQueryKey as jest.Mock).mockImplementation(
      ({ pointId, userId }) => ["user-endorsements", pointId, userId]
    );
  });

  it("should use useAuthenticatedMutation with endorse action", () => {
    // Mock the hook to return a mutation object
    const mockMutation = {
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
    };
    (useAuthenticatedMutation as jest.Mock).mockReturnValue(mockMutation);

    // Call the hook
    const result = useEndorse();

    // Verify it was called with the correct parameters
    expect(useAuthenticatedMutation).toHaveBeenCalledWith({
      mutationFn: endorse,
      onSuccess: expect.any(Function),
    });

    // Verify the result is the mutation object
    expect(result).toBe(mockMutation);
  });

  it("should mark the point as read on success", () => {
    // Mock useAuthenticatedMutation to capture and execute the onSuccess callback
    let onSuccessCallback: Function | undefined;
    (useAuthenticatedMutation as jest.Mock).mockImplementation(
      ({ onSuccess }) => {
        onSuccessCallback = onSuccess;
        return { mutateAsync: jest.fn() };
      }
    );

    // Call the hook
    useEndorse();

    // Now execute the onSuccess callback with test data
    expect(onSuccessCallback).toBeDefined();
    if (onSuccessCallback) {
      onSuccessCallback(123, { pointId: 456, cred: 10 });
    }

    // Verify the point was marked as read
    expect(mockMarkPointAsRead).toHaveBeenCalledWith(456);

    // Verify visitedPoints atom was updated
    expect(mockSetVisitedPoints).toHaveBeenCalled();
    const updateFunction = mockSetVisitedPoints.mock.calls[0][0];
    const mockPrevSet = new Set();
    const result = updateFunction(mockPrevSet);
    expect(result.has(456)).toBe(true);
  });

  it("should invalidate related queries on success", () => {
    // Mock useAuthenticatedMutation to capture and execute the onSuccess callback
    let onSuccessCallback: Function | undefined;
    (useAuthenticatedMutation as jest.Mock).mockImplementation(
      ({ onSuccess }) => {
        onSuccessCallback = onSuccess;
        return { mutateAsync: jest.fn() };
      }
    );

    // Call the hook
    useEndorse();

    // Now execute the onSuccess callback with test data
    expect(onSuccessCallback).toBeDefined();
    if (onSuccessCallback) {
      onSuccessCallback(123, { pointId: 456, cred: 10 });
    }

    // Verify invalidation of related points
    expect(mockInvalidateRelatedPoints).toHaveBeenCalledWith(456);

    // Verify other invalidation queries
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: [456, "favor-history"],
      exact: false,
    });

    // Check user specific invalidation
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["user", mockUser.id],
    });

    // Verify feed invalidation
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["feed", mockUser.id],
      refetchType: "all",
    });

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["feed"],
      exact: false,
      refetchType: "all",
    });

    // Verify user endorsements invalidation
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["user-endorsements", 456, mockUser.id],
      exact: false,
    });

    // Verify pinned-point invalidation
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["pinned-point", mockSpace.data.id],
      refetchType: "all",
    });

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["pinned-point"],
      exact: false,
      refetchType: "all",
    });

    // Verify priority-points invalidation
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["priority-points", mockUser.id, mockUser],
      refetchType: "all",
    });

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["priority-points"],
      exact: false,
      refetchType: "all",
    });

    // Verify legacy pinnedPoint invalidation
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["pinnedPoint"],
      exact: false,
    });
  });

  it("should pass the arguments to the underlying action when called", async () => {
    // Mock the hook to return a mutation object
    const mockMutateAsync = jest.fn().mockResolvedValue(123);
    (useAuthenticatedMutation as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
    });

    // Call the hook and then call mutateAsync
    const { mutateAsync } = useEndorse();
    await mutateAsync({
      pointId: 456,
      cred: 10,
    });

    // Verify the mutateAsync was called with the correct arguments
    expect(mockMutateAsync).toHaveBeenCalledWith({
      pointId: 456,
      cred: 10,
    });
  });
});
