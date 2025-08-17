jest.mock("../auth/useAuthenticatedMutation", () => ({
  useAuthenticatedMutation: jest.fn(),
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/actions/viewpoints/updateViewpointDetails", () => {
  const updateViewpointDetails = jest.fn(async ({ id }) => id);
  return { updateViewpointDetails };
});

jest.mock("@/actions/viewpoints/updateRationalePoints", () => ({
  updateRationalePoints: jest.fn(),
}));

import { useUpdateViewpointDetails } from "../viewpoints/useUpdateViewpointDetails";
import { useAuthenticatedMutation } from "../auth/useAuthenticatedMutation";
import { updateViewpointDetails } from "@/actions/viewpoints/updateViewpointDetails";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

describe("useUpdateViewpointDetails", () => {
  const mockQueryClient = {
    invalidateQueries: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useQueryClient as jest.Mock).mockReturnValue(mockQueryClient);
  });

  it("should use useAuthenticatedMutation with updateViewpointDetails action", () => {
    const mockMutation = {
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
    };
    (useAuthenticatedMutation as jest.Mock).mockReturnValue(mockMutation);

    const result = useUpdateViewpointDetails();

    expect(useAuthenticatedMutation).toHaveBeenCalledWith({
      mutationFn: updateViewpointDetails,
      onSuccess: expect.any(Function),
      onError: expect.any(Function),
    });

    expect(result).toBe(mockMutation);
  });

  it("should invalidate related queries on success", async () => {
    let onSuccessCallback: Function | undefined;
    (useAuthenticatedMutation as jest.Mock).mockImplementation(
      ({ onSuccess }) => {
        onSuccessCallback = onSuccess;
        return { mutateAsync: jest.fn() };
      }
    );

    useUpdateViewpointDetails();

    expect(onSuccessCallback).toBeDefined();
    if (onSuccessCallback) {
      onSuccessCallback("test-id", {
        id: "test-id",
        title: "Updated Title",
        description: "Updated Description",
      });
    }

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["viewpoint", "test-id"],
    });

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["viewpoints"],
      exact: false,
    });

    expect(toast.success).toHaveBeenCalledWith(
      "Rationale details updated successfully"
    );
  });

  it("should invalidate topics queries when topicId is updated", async () => {
    let onSuccessCallback: Function | undefined;
    (useAuthenticatedMutation as jest.Mock).mockImplementation(
      ({ onSuccess }) => {
        onSuccessCallback = onSuccess;
        return { mutateAsync: jest.fn() };
      }
    );

    useUpdateViewpointDetails();

    expect(onSuccessCallback).toBeDefined();
    if (onSuccessCallback) {
      onSuccessCallback("test-id", {
        id: "test-id",
        title: "Updated Title",
        description: "Updated Description",
        topicId: 123,
      });
    }

    // Verify topics queries were invalidated when topicId was provided
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["topics"],
      exact: false,
    });
  });

  it("should not invalidate topics queries when topicId is not updated", async () => {
    // Mock useAuthenticatedMutation to capture and execute the onSuccess callback
    let onSuccessCallback: Function | undefined;
    (useAuthenticatedMutation as jest.Mock).mockImplementation(
      ({ onSuccess }) => {
        onSuccessCallback = onSuccess;
        return { mutateAsync: jest.fn() };
      }
    );

    // Call the hook
    useUpdateViewpointDetails();

    // Execute the onSuccess callback without topicId in variables
    expect(onSuccessCallback).toBeDefined();
    if (onSuccessCallback) {
      onSuccessCallback("test-id", {
        id: "test-id",
        title: "Updated Title",
        description: "Updated Description",
      });
    }

    // Verify topics queries were NOT invalidated when topicId was not provided
    expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: ["topics"],
      exact: false,
    });
  });

  it("should handle errors correctly", async () => {
    // Mock useAuthenticatedMutation to capture and execute the onError callback
    let onErrorCallback: Function | undefined;
    (useAuthenticatedMutation as jest.Mock).mockImplementation(
      ({ onError }) => {
        onErrorCallback = onError;
        return { mutateAsync: jest.fn() };
      }
    );

    // Call the hook
    useUpdateViewpointDetails();

    // Now execute the onError callback with test error
    expect(onErrorCallback).toBeDefined();
    if (onErrorCallback) {
      onErrorCallback(new Error("Update failed"));
    }

    // Verify error toast was shown
    expect(toast.error).toHaveBeenCalledWith(
      "Failed to update rationale details. Please try again."
    );
  });

  it("should pass the arguments to the underlying action when called", async () => {
    // Mock the hook to return a mutation object
    const mockMutateAsync = jest.fn().mockResolvedValue("success-id");
    (useAuthenticatedMutation as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
    });

    // Call the hook and then call mutateAsync
    const { mutateAsync } = useUpdateViewpointDetails();
    await mutateAsync({
      id: "test-id",
      title: "Test Title",
      description: "Test Description",
      topicId: 456,
    });

    // Verify the mutateAsync was called with the correct arguments
    expect(mockMutateAsync).toHaveBeenCalledWith({
      id: "test-id",
      title: "Test Title",
      description: "Test Description",
      topicId: 456,
    });
  });
});
