// Mock dependencies first
const originalConsoleError = console.error;

beforeEach(() => {
  console.error = jest.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
});

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

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Instead of mocking the action itself, mock its dependencies
jest.mock("@/actions/points/deletePoint", () => {
  const deletePoint = jest.fn(async ({ pointId }) => ({
    success: true,
    message: "Point deleted successfully and all cred reimbursed",
  }));
  return { deletePoint };
});

// Mock setTimeout to speed up tests
jest.useFakeTimers();

// Import after mocking
import { useDeletePoint } from "../points/useDeletePoint";
import { useAuthenticatedMutation } from "../auth/useAuthenticatedMutation";
import { deletePoint } from "@/actions/points/deletePoint";
import { useInvalidateRelatedPoints } from "@/queries/points/usePointData";
import { useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";

describe("useDeletePoint", () => {
  // Setup common mocks
  const mockInvalidateRelatedPoints = jest.fn();
  const mockQueryClient = {
    invalidateQueries: jest.fn(),
  };
  const mockUser = { id: "user-123" };
  // For storing callback references in tests
  type SuccessCallbackType = (data: any, variables: any) => void;
  type ErrorCallbackType = (error: Error) => void;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock window.location
    Object.defineProperty(window, "location", {
      value: { href: "https://example.com" },
      writable: true,
    });

    // Set up default mocks
    (useInvalidateRelatedPoints as jest.Mock).mockReturnValue(
      mockInvalidateRelatedPoints
    );
    (useQueryClient as jest.Mock).mockReturnValue(mockQueryClient);
    (usePrivy as jest.Mock).mockReturnValue({ user: mockUser });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it("should use useAuthenticatedMutation with deletePoint action", () => {
    // Mock the hook to return a mutation object
    const mockMutation = {
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
      isSuccess: false,
    };
    (useAuthenticatedMutation as jest.Mock).mockReturnValue(mockMutation);

    // Call the hook
    const result = useDeletePoint();

    // Verify it was called with the correct parameters
    expect(useAuthenticatedMutation).toHaveBeenCalledWith({
      mutationFn: deletePoint,
      onSuccess: expect.any(Function),
      onError: expect.any(Function),
    });

    // Verify the result is the mutation object
    expect(result).toBe(mockMutation);
  });

  it("should handle successful point deletion", async () => {
    // For storing the success callback
    let capturedOnSuccess: SuccessCallbackType | undefined;

    // Mock useAuthenticatedMutation to capture the onSuccess callback
    (useAuthenticatedMutation as jest.Mock).mockImplementation(
      ({ mutationFn, onSuccess, onError }) => {
        capturedOnSuccess = onSuccess;
        return {
          mutate: jest.fn(),
          isPending: false,
          isSuccess: false,
        };
      }
    );

    // Call the hook
    useDeletePoint();

    // Now execute the onSuccess callback with successful result
    expect(capturedOnSuccess).toBeDefined();
    if (capturedOnSuccess) {
      capturedOnSuccess(
        { success: true, message: "Point deleted successfully" },
        { pointId: 123 }
      );
    }

    // Check toast success was shown
    expect(toast.success).toHaveBeenCalledWith("Point deleted successfully");

    // Verify invalidations
    expect(mockInvalidateRelatedPoints).toHaveBeenCalledWith(123);

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["point", { pointId: 123, userId: mockUser.id }],
    });

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: [123, "negations"],
      exact: false,
    });

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["user", mockUser.id],
      exact: false,
    });

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["feed"],
      exact: false,
      refetchType: "all",
    });

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["profile-points"],
      exact: false,
      refetchType: "all",
    });

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["priority-points"],
      exact: false,
      refetchType: "all",
    });

    // Check deletion validation cache invalidation
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["validate-deletion", 123],
    });

    // Note: Redirect logic is now handled in DeletePointDialog component
  });

  // Redirect tests removed - redirect logic is now handled in DeletePointDialog component

  it("should handle failed point deletion", async () => {
    // For storing the success callback
    let capturedOnSuccess: SuccessCallbackType | undefined;

    // Mock useAuthenticatedMutation to capture the onSuccess callback
    (useAuthenticatedMutation as jest.Mock).mockImplementation(
      ({ mutationFn, onSuccess, onError }) => {
        capturedOnSuccess = onSuccess;
        return {
          mutate: jest.fn(),
          isPending: false,
          isSuccess: false,
        };
      }
    );

    // Call the hook
    useDeletePoint();

    // Now execute the onSuccess callback with a failed result
    expect(capturedOnSuccess).toBeDefined();
    if (capturedOnSuccess) {
      capturedOnSuccess(
        { success: false, message: "You can only delete your own points" },
        { pointId: 123 }
      );
    }

    // Check toast error was shown
    expect(toast.error).toHaveBeenCalledWith(
      "You can only delete your own points"
    );

    // Verify no invalidations occurred
    expect(mockInvalidateRelatedPoints).not.toHaveBeenCalled();
    expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  it("should handle various failure messages", async () => {
    let capturedOnSuccess: SuccessCallbackType | undefined;

    (useAuthenticatedMutation as jest.Mock).mockImplementation(
      ({ onSuccess }) => {
        capturedOnSuccess = onSuccess;
        return { mutateAsync: jest.fn() };
      }
    );

    useDeletePoint();

    // Test different failure scenarios
    const failureScenarios = [
      "Cannot delete points with endorsements",
      "Point has active negations",
      "Point not found",
      "Insufficient permissions"
    ];

    for (const message of failureScenarios) {
      jest.clearAllMocks();
      
      if (capturedOnSuccess) {
        capturedOnSuccess(
          { success: false, message },
          { pointId: 123 }
        );
      }

      expect(toast.error).toHaveBeenCalledWith(message);
      expect(mockInvalidateRelatedPoints).not.toHaveBeenCalled();
    }
  });

  it("should handle missing user ID gracefully", async () => {
    // Mock user as null
    (usePrivy as jest.Mock).mockReturnValue({ user: null });

    let capturedOnSuccess: SuccessCallbackType | undefined;

    (useAuthenticatedMutation as jest.Mock).mockImplementation(
      ({ onSuccess }) => {
        capturedOnSuccess = onSuccess;
        return { mutateAsync: jest.fn() };
      }
    );

    useDeletePoint();

    if (capturedOnSuccess) {
      capturedOnSuccess(
        { success: true, message: "Point deleted successfully" },
        { pointId: 123 }
      );
    }

    // Should still invalidate queries but with undefined userId
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["point", { pointId: 123, userId: undefined }],
    });
  });

  it("should handle errors", async () => {
    // For storing the error callback
    let capturedOnError: ErrorCallbackType | undefined;

    // Mock useAuthenticatedMutation to capture the onError callback
    (useAuthenticatedMutation as jest.Mock).mockImplementation(
      ({ mutationFn, onSuccess, onError }) => {
        capturedOnError = onError;
        return {
          mutate: jest.fn(),
          isPending: false,
          isSuccess: false,
        };
      }
    );

    // Call the hook
    useDeletePoint();

    // Now execute the onError callback
    expect(capturedOnError).toBeDefined();
    if (capturedOnError) {
      capturedOnError(new Error("Something went wrong"));
    }

    // Check toast error was shown
    expect(toast.error).toHaveBeenCalledWith("Failed to delete point");
  });

  it("should handle network errors during deletion", async () => {
    let capturedOnError: ErrorCallbackType | undefined;

    (useAuthenticatedMutation as jest.Mock).mockImplementation(
      ({ onError }) => {
        capturedOnError = onError;
        return { mutateAsync: jest.fn() };
      }
    );

    useDeletePoint();

    if (capturedOnError) {
      capturedOnError(new Error("Network request failed"));
    }

    expect(toast.error).toHaveBeenCalledWith("Failed to delete point");
  });

  it("should properly invalidate validation deletion cache", async () => {
    let capturedOnSuccess: SuccessCallbackType | undefined;

    (useAuthenticatedMutation as jest.Mock).mockImplementation(
      ({ onSuccess }) => {
        capturedOnSuccess = onSuccess;
        return { mutateAsync: jest.fn() };
      }
    );

    useDeletePoint();

    if (capturedOnSuccess) {
      capturedOnSuccess(
        { success: true, message: "Point deleted successfully" },
        { pointId: 456 }
      );
    }

    // Verify the validation cache for this specific point was invalidated
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['validate-deletion', 456],
    });
  });

  it("should call mutateAsync with correct parameters", async () => {
    const mockMutateAsync = jest.fn().mockResolvedValue({
      success: true,
      message: "Point deleted successfully"
    });

    (useAuthenticatedMutation as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
    });

    const { mutateAsync } = useDeletePoint();
    
    await mutateAsync({ pointId: 789 });

    expect(mockMutateAsync).toHaveBeenCalledWith({ pointId: 789 });
  });

  // Fallback redirection test removed - redirect logic is now handled in DeletePointDialog component
});
