// Mock dependencies
jest.mock("@/db/schema", () => ({
  viewpointsTable: {
    id: "id",
    createdBy: "created_by",
    space: "space",
    createdAt: "created_at",
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
  desc: jest.fn((column) => ({ column, direction: "desc" })),
}));

// Import after mocking
import { fetchViewpoints } from "../fetchViewpoints";
import { db } from "@/services/db";
import {
  viewpointsTable,
  usersTable,
  viewpointInteractionsTable,
} from "@/db/schema";
import { getColumns } from "@/db/utils/getColumns";
import { eq, desc } from "drizzle-orm";

describe("fetchViewpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch viewpoints with statistics", async () => {
    // Mock the viewpoints data
    const mockViewpoints = [
      {
        id: "viewpoint-1",
        title: "Viewpoint 1",
        description: "Description 1",
        createdBy: "user-1",
        createdAt: new Date(),
        space: "test-space",
        author: "Test User 1",
        views: 100,
        copies: 25,
      },
      {
        id: "viewpoint-2",
        title: "Viewpoint 2",
        description: "Description 2",
        createdBy: "user-2",
        createdAt: new Date(),
        space: "test-space",
        author: "Test User 2",
        views: 50,
        copies: 10,
      },
    ];

    // Mock select chain
    const mockFrom = jest.fn().mockReturnThis();
    const mockInnerJoin = jest.fn().mockReturnThis();
    const mockLeftJoin = jest.fn().mockReturnThis();
    const mockWhere = jest.fn().mockReturnThis();
    const mockOrderBy = jest.fn().mockResolvedValue(mockViewpoints);

    (db.select as jest.Mock).mockReturnValue({
      from: mockFrom,
      innerJoin: mockInnerJoin,
      leftJoin: mockLeftJoin,
      where: mockWhere,
      orderBy: mockOrderBy,
    });

    // Call the function
    const result = await fetchViewpoints("test-space");

    // Verify the query is constructed correctly
    expect(db.select).toHaveBeenCalled();
    expect(getColumns).toHaveBeenCalledWith(viewpointsTable);
    expect(mockFrom).toHaveBeenCalledWith(viewpointsTable);
    expect(mockInnerJoin).toHaveBeenCalledWith(usersTable, expect.anything());
    expect(mockLeftJoin).toHaveBeenCalledWith(
      viewpointInteractionsTable,
      expect.anything()
    );
    expect(mockWhere).toHaveBeenCalledWith(
      eq(viewpointsTable.space, "test-space")
    );
    expect(mockOrderBy).toHaveBeenCalledWith(desc(viewpointsTable.createdAt));

    // Verify result is formatted correctly with statistics
    expect(result).toEqual([
      {
        id: "viewpoint-1",
        title: "Viewpoint 1",
        description: "Description 1",
        createdBy: "user-1",
        createdAt: expect.any(Date),
        space: "test-space",
        author: "Test User 1",
        views: 100,
        copies: 25,
        statistics: {
          views: 100,
          copies: 25,
        },
      },
      {
        id: "viewpoint-2",
        title: "Viewpoint 2",
        description: "Description 2",
        createdBy: "user-2",
        createdAt: expect.any(Date),
        space: "test-space",
        author: "Test User 2",
        views: 50,
        copies: 10,
        statistics: {
          views: 50,
          copies: 10,
        },
      },
    ]);
  });

  it("should handle missing statistics and default to zero", async () => {
    // Mock the viewpoints data with missing statistics
    const mockViewpoints = [
      {
        id: "viewpoint-1",
        title: "Viewpoint 1",
        description: "Description 1",
        createdBy: "user-1",
        createdAt: new Date(),
        space: "test-space",
        author: "Test User 1",
        // No views or copies
      },
      {
        id: "viewpoint-2",
        title: "Viewpoint 2",
        description: "Description 2",
        createdBy: "user-2",
        createdAt: new Date(),
        space: "test-space",
        author: "Test User 2",
        views: null,
        copies: null,
      },
    ];

    // Mock select chain
    const mockFrom = jest.fn().mockReturnThis();
    const mockInnerJoin = jest.fn().mockReturnThis();
    const mockLeftJoin = jest.fn().mockReturnThis();
    const mockWhere = jest.fn().mockReturnThis();
    const mockOrderBy = jest.fn().mockResolvedValue(mockViewpoints);

    (db.select as jest.Mock).mockReturnValue({
      from: mockFrom,
      innerJoin: mockInnerJoin,
      leftJoin: mockLeftJoin,
      where: mockWhere,
      orderBy: mockOrderBy,
    });

    // Call the function
    const result = await fetchViewpoints("test-space");

    // Verify statistics defaults to zero
    expect(result[0].statistics).toEqual({
      views: 0,
      copies: 0,
    });

    expect(result[1].statistics).toEqual({
      views: 0,
      copies: 0,
    });
  });

  it("should handle empty result", async () => {
    // Mock empty result
    const mockViewpoints: any[] = [];

    // Mock select chain
    const mockFrom = jest.fn().mockReturnThis();
    const mockInnerJoin = jest.fn().mockReturnThis();
    const mockLeftJoin = jest.fn().mockReturnThis();
    const mockWhere = jest.fn().mockReturnThis();
    const mockOrderBy = jest.fn().mockResolvedValue(mockViewpoints);

    (db.select as jest.Mock).mockReturnValue({
      from: mockFrom,
      innerJoin: mockInnerJoin,
      leftJoin: mockLeftJoin,
      where: mockWhere,
      orderBy: mockOrderBy,
    });

    // Call the function
    const result = await fetchViewpoints("test-space");

    // Verify empty array is returned
    expect(result).toEqual([]);
  });
});
