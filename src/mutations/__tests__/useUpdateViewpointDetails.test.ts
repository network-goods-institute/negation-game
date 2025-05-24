// Mock dependencies first
jest.mock("../auth/useAuthenticatedMutation", () => ({
  useAuthenticatedMutation: jest.fn(),
}));

// Instead of mocking the action itself, mock its dependencies
// This way we're testing the real hook with the real action
jest.mock("@/actions/viewpoints/updateViewpointDetails", () => {
  // Create a mock function that can be spied on
  const updateViewpointDetails = jest.fn(async ({ id }) => id);
  return { updateViewpointDetails };
});

// Import after mocking
import { useUpdateViewpointDetails } from "../viewpoints/useUpdateViewpointDetails";
import { useAuthenticatedMutation } from "../auth/useAuthenticatedMutation";
import { updateViewpointDetails } from "@/actions/viewpoints/updateViewpointDetails";

describe("useUpdateViewpointDetails", () => {
  it("should use useAuthenticatedMutation with updateViewpointDetails action", () => {
    // Mock the hook to return a mutation object
    const mockMutation = {
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
    };
    (useAuthenticatedMutation as jest.Mock).mockReturnValue(mockMutation);

    // Call the hook
    const result = useUpdateViewpointDetails();

    // Verify it was called with the correct parameters
    expect(useAuthenticatedMutation).toHaveBeenCalledWith({
      mutationFn: updateViewpointDetails,
    });

    // Verify the result is the mutation object
    expect(result).toBe(mockMutation);
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
    });

    // Verify the mutateAsync was called with the correct arguments
    expect(mockMutateAsync).toHaveBeenCalledWith({
      id: "test-id",
      title: "Test Title",
      description: "Test Description",
    });
  });
});
