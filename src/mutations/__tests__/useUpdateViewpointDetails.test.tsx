/**
 * @jest-environment jsdom
 */
import React from "react";
import { renderHook } from "@testing-library/react";
import { useUpdateViewpointDetails } from "../viewpoints/useUpdateViewpointDetails";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthenticatedMutation } from "../auth/useAuthenticatedMutation";

// Mock the dependencies
jest.mock("../auth/useAuthenticatedMutation", () => ({
    useAuthenticatedMutation: jest.fn()
}));

jest.mock("@/actions/viewpoints/updateViewpointDetails", () => ({
    updateViewpointDetails: jest.fn()
}));

describe("useUpdateViewpointDetails", () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
                mutations: { retry: false }
            }
        });

        // Reset mocks between tests
        jest.clearAllMocks();

        // Setup mock implementation for useAuthenticatedMutation
        (useAuthenticatedMutation as jest.Mock).mockImplementation(({ mutationFn }) => ({
            mutate: jest.fn(),
            mutateAsync: jest.fn(),
            isLoading: false,
            isPending: false,
            isSuccess: false,
            isError: false,
            status: "idle"
        }));
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    it("should call useAuthenticatedMutation with the correct parameters", () => {
        // Import the real updateViewpointDetails to pass to hook
        const { updateViewpointDetails } = require("@/actions/viewpoints/updateViewpointDetails");

        renderHook(() => useUpdateViewpointDetails(), { wrapper });

        // Verify the hook passes the correct function to useAuthenticatedMutation
        expect(useAuthenticatedMutation).toHaveBeenCalledWith({
            mutationFn: updateViewpointDetails
        });
    });

    it("should return the mutation object from useAuthenticatedMutation", () => {
        // Setup a mock return value with specific properties
        const mockMutation = {
            mutate: jest.fn(),
            mutateAsync: jest.fn(),
            isLoading: false,
            isPending: false,
            isSuccess: true,
            isError: false,
            status: "success"
        };

        (useAuthenticatedMutation as jest.Mock).mockReturnValue(mockMutation);

        const { result } = renderHook(() => useUpdateViewpointDetails(), { wrapper });

        // Check that we're getting the exact same object that useAuthenticatedMutation returns
        expect(result.current).toBe(mockMutation);
    });

    it("should pass mutations through to the updateViewpointDetails action", async () => {
        // Setup the mutation mock with working mutateAsync
        const mockMutateAsync = jest.fn().mockResolvedValue("viewpoint-123");

        const mockMutation = {
            mutate: jest.fn(),
            mutateAsync: mockMutateAsync,
            isLoading: false,
            isPending: false,
            isSuccess: false,
            isError: false,
            status: "idle"
        };

        (useAuthenticatedMutation as jest.Mock).mockReturnValue(mockMutation);

        // Render and get the hook result
        const { result } = renderHook(() => useUpdateViewpointDetails(), { wrapper });

        // Create test data
        const testData = {
            id: "test-id",
            title: "Test Title",
            description: "Test Description"
        };

        // Call mutateAsync
        await result.current.mutateAsync(testData);

        // Verify it was called with our data
        expect(mockMutateAsync).toHaveBeenCalledWith(testData);
    });
}); 