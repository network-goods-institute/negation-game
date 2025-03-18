// Mock dependencies
jest.mock("@/db/schema", () => ({
  viewpointsTable: {
    id: "id",
    graph: "graph",
    createdBy: "created_by",
    space: "space",
  },
  usersTable: {
    id: "id",
    username: "username",
  },
  viewpointInteractionsTable: {
    viewpointId: "viewpoint_id",
    views: "views",
    copies: "copies",
  },
}));

jest.mock("@/db/utils/getColumns", () => ({
  getColumns: jest.fn(() => ({
    id: "id",
    title: "title",
    description: "description",
    graph: "graph",
    createdBy: "created_by",
    createdAt: "created_at",
    space: "space",
  })),
}));

jest.mock("@/services/db", () => ({
  db: {
    select: jest.fn(),
  },
}));

jest.mock("drizzle-orm", () => ({
  eq: jest.fn((a, b) => ({ column: a, value: b })),
  sql: jest.fn(() => ({
    as: jest.fn().mockReturnThis(),
  })),
}));

jest.mock("../trackViewpointView", () => ({
  trackViewpointView: jest.fn(),
}));

// Import after mocking
import { fetchViewpoint } from "../fetchViewpoint";
import { db } from "@/services/db";
import {
  viewpointsTable,
  usersTable,
  viewpointInteractionsTable,
} from "@/db/schema";
import { getColumns } from "@/db/utils/getColumns";
import { trackViewpointView } from "../trackViewpointView";
import { eq, sql } from "drizzle-orm";

describe("fetchViewpoint", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return default data when id is DISABLED", async () => {
    const result = await fetchViewpoint("DISABLED");

    expect(result).toEqual({
      id: "DISABLED",
      title: "",
      author: "",
      description: "",
      originalPointIds: [],
      graph: { nodes: [], edges: [] },
      createdBy: "",
      createdAt: expect.any(Date),
      space: null,
      statistics: {
        views: 0,
        copies: 0,
      },
    });

    expect(db.select).not.toHaveBeenCalled();
    expect(trackViewpointView).not.toHaveBeenCalled();
  });

  it("should return formatted data with statistics when viewpoint is found", async () => {
    // Mock select chain
    const mockFrom = jest.fn().mockReturnThis();
    const mockInnerJoin = jest.fn().mockReturnThis();
    const mockLeftJoin = jest.fn().mockReturnThis();
    const mockWhere = jest.fn().mockReturnThis();
    const mockLimit = jest.fn().mockReturnThis();
    const mockThen = jest.fn().mockImplementation((callback) => {
      const viewpoint = {
        id: "test-id",
        title: "Test Viewpoint",
        description: "Test Description",
        graph: { nodes: [], edges: [] },
        createdBy: "user-123",
        createdAt: new Date(),
        space: "test-space",
        author: "testuser",
        originalPointIds: [1, 2, 3],
        views: 42,
        copies: 7,
      };
      return Promise.resolve([viewpoint]).then(callback);
    });

    (db.select as jest.Mock).mockReturnValue({
      from: mockFrom,
      innerJoin: mockInnerJoin,
      leftJoin: mockLeftJoin,
      where: mockWhere,
      limit: mockLimit,
      then: mockThen,
    });

    // Mock trackViewpointView
    (trackViewpointView as jest.Mock).mockResolvedValue(true);

    // Call the function
    const result = await fetchViewpoint("test-id");

    // Assert
    expect(db.select).toHaveBeenCalled();
    expect(getColumns).toHaveBeenCalledWith(viewpointsTable);
    expect(mockFrom).toHaveBeenCalledWith(viewpointsTable);
    expect(mockInnerJoin).toHaveBeenCalledWith(usersTable, expect.anything());
    expect(mockLeftJoin).toHaveBeenCalledWith(
      viewpointInteractionsTable,
      expect.anything()
    );
    expect(mockWhere).toHaveBeenCalledWith(eq(viewpointsTable.id, "test-id"));
    expect(mockLimit).toHaveBeenCalledWith(1);

    // Check that necessary properties exist
    expect(result).toHaveProperty("id", "test-id");
    expect(result).toHaveProperty("title", "Test Viewpoint");
    expect(result).toHaveProperty("description", "Test Description");
    expect(result).toHaveProperty("author", "testuser");
    expect(result).toHaveProperty("createdBy", "user-123");
    expect(result).toHaveProperty("space", "test-space");

    // Verify statistics specifically
    expect(result).toHaveProperty("statistics");
    expect(result.statistics).toEqual({
      views: 42,
      copies: 7,
    });

    // Verify view was tracked
    expect(trackViewpointView).toHaveBeenCalledWith("test-id");
  });

  it("should handle missing viewpoint and return safe defaults", async () => {
    // Mock select chain
    const mockFrom = jest.fn().mockReturnThis();
    const mockInnerJoin = jest.fn().mockReturnThis();
    const mockLeftJoin = jest.fn().mockReturnThis();
    const mockWhere = jest.fn().mockReturnThis();
    const mockLimit = jest.fn().mockReturnThis();
    const mockThen = jest.fn().mockImplementation((callback) => {
      return Promise.resolve([]).then(callback);
    });

    (db.select as jest.Mock).mockReturnValue({
      from: mockFrom,
      innerJoin: mockInnerJoin,
      leftJoin: mockLeftJoin,
      where: mockWhere,
      limit: mockLimit,
      then: mockThen,
    });

    // Call the function
    const result = await fetchViewpoint("nonexistent-id");

    // Assert
    expect(result).toEqual({
      id: "nonexistent-id",
      title: expect.stringContaining("doesn't exist"),
      author: "",
      description: "",
      originalPointIds: [],
      graph: { nodes: [], edges: [] },
      createdBy: "",
      createdAt: expect.any(Date),
      space: null,
      statistics: {
        views: 0,
        copies: 0,
      },
    });

    // View should not be tracked for nonexistent viewpoint
    expect(trackViewpointView).not.toHaveBeenCalled();
  });

  it("should handle missing statistics and default to zero", async () => {
    // Mock select chain
    const mockFrom = jest.fn().mockReturnThis();
    const mockInnerJoin = jest.fn().mockReturnThis();
    const mockLeftJoin = jest.fn().mockReturnThis();
    const mockWhere = jest.fn().mockReturnThis();
    const mockLimit = jest.fn().mockReturnThis();
    const mockThen = jest.fn().mockImplementation((callback) => {
      const viewpoint = {
        id: "test-id",
        title: "Test Viewpoint",
        description: "Test Description",
        graph: { nodes: [], edges: [] },
        createdBy: "user-123",
        createdAt: new Date(),
        space: "test-space",
        author: "testuser",
        originalPointIds: [1, 2, 3],
        // views and copies not returned (null)
      };
      return Promise.resolve([viewpoint]).then(callback);
    });

    (db.select as jest.Mock).mockReturnValue({
      from: mockFrom,
      innerJoin: mockInnerJoin,
      leftJoin: mockLeftJoin,
      where: mockWhere,
      limit: mockLimit,
      then: mockThen,
    });

    // Mock trackViewpointView
    (trackViewpointView as jest.Mock).mockResolvedValue(true);

    // Call the function
    const result = await fetchViewpoint("test-id");

    // Verify result contains zero statistics
    expect(result.statistics).toEqual({
      views: 0,
      copies: 0,
    });

    // Verify view was tracked
    expect(trackViewpointView).toHaveBeenCalledWith("test-id");
  });
});
