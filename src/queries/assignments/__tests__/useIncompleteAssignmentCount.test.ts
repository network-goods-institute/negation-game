// Mock fetch globally
global.fetch = jest.fn();

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
}));

import { useIncompleteAssignmentCount } from "../useIncompleteAssignmentCount";
import { useQuery } from "@tanstack/react-query";

const mockUseQuery = useQuery as jest.Mock;

describe("useIncompleteAssignmentCount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 0 when no assignments exist", () => {
    mockUseQuery.mockReturnValue({
      data: [],
    });

    const result = useIncompleteAssignmentCount();
    expect(result).toBe(0);
  });

  it("should return count of incomplete assignments only", () => {
    const mockAssignments = [
      {
        id: "1",
        topicId: 1,
        topicName: "Topic 1",
        spaceId: "space1",
        promptMessage: null,
        completed: false,
        createdAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "2",
        topicId: 2,
        topicName: "Topic 2",
        spaceId: "space1",
        promptMessage: "Test prompt",
        completed: true,
        createdAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "3",
        topicId: 3,
        topicName: "Topic 3",
        spaceId: "space1",
        promptMessage: null,
        completed: false,
        createdAt: "2024-01-01T00:00:00Z",
      },
    ];

    mockUseQuery.mockReturnValue({
      data: mockAssignments,
    });

    const result = useIncompleteAssignmentCount();
    expect(result).toBe(2);
  });

  it("should return 0 when all assignments are completed", () => {
    const mockAssignments = [
      {
        id: "1",
        topicId: 1,
        topicName: "Topic 1",
        spaceId: "space1",
        promptMessage: null,
        completed: true,
        createdAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "2",
        topicId: 2,
        topicName: "Topic 2",
        spaceId: "space1",
        promptMessage: "Test prompt",
        completed: true,
        createdAt: "2024-01-01T00:00:00Z",
      },
    ];

    mockUseQuery.mockReturnValue({
      data: mockAssignments,
    });

    const result = useIncompleteAssignmentCount();
    expect(result).toBe(0);
  });

  it("should handle undefined data", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
    });

    const result = useIncompleteAssignmentCount();
    expect(result).toBe(0);
  });
});