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
  pointsTable: {
    id: "id",
  },
  endorsementsTable: {
    pointId: "point_id",
    userId: "user_id",
    cred: "cred",
  },
  pointFavorHistoryView: {
    pointId: "point_id",
    favor: "favor",
    eventTime: "event_time",
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
  and: jest.fn((a, b) => ({ operator: "AND", conditions: [a, b] })),
  desc: jest.fn((col) => ({ column: col, direction: "desc" })),
  inArray: jest.fn((col, vals) => ({ column: col, values: vals })),
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
  pointsTable,
  endorsementsTable,
  pointFavorHistoryView,
} from "@/db/schema";
import { getColumns } from "@/db/utils/getColumns";
import { trackViewpointView } from "../trackViewpointView";
import { eq, sql, and, desc, inArray } from "drizzle-orm";

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
        totalCred: 0,
        averageFavor: 0,
      },
    });

    expect(db.select).not.toHaveBeenCalled();
    expect(trackViewpointView).not.toHaveBeenCalled();
  });

  it("should return formatted data with statistics when viewpoint is found", async () => {
    // Mock select chain for viewpoint
    const mockViewpointFrom = jest.fn().mockReturnThis();
    const mockViewpointInnerJoin = jest.fn().mockReturnThis();
    const mockViewpointLeftJoin = jest.fn().mockReturnThis();
    const mockViewpointWhere = jest.fn().mockReturnThis();
    const mockViewpointLimit = jest.fn().mockReturnThis();
    const mockViewpointThen = jest.fn().mockImplementation((callback) => {
      const viewpoint = {
        id: "test-id",
        title: "Test Viewpoint",
        description: "Test Description",
        graph: {
          nodes: [
            { type: "point", data: { pointId: 1 } },
            { type: "point", data: { pointId: 2 } },
          ],
          edges: [],
        },
        createdBy: "user-123",
        createdAt: new Date(),
        space: "test-space",
        author: "testuser",
        originalPointIds: [1, 2],
        views: 42,
        copies: 7,
      };
      return Promise.resolve([viewpoint]).then(callback);
    });

    // Mock select chain for endorsements
    const mockEndorsementFrom = jest.fn().mockReturnThis();
    const mockEndorsementInnerJoin = jest.fn().mockReturnThis();
    const mockEndorsementWhere = jest.fn().mockReturnThis();
    const mockEndorsementThen = jest.fn().mockImplementation((callback) => {
      const endorsements = [
        { pointId: 1, cred: 200 },
        { pointId: 2, cred: 250 },
      ];
      return Promise.resolve(endorsements).then(callback);
    });

    // Mock select chain for favor values
    const mockFavorFrom = jest.fn().mockReturnThis();
    const mockFavorWhere = jest.fn().mockReturnThis();
    const mockFavorOrderBy = jest.fn().mockReturnThis();
    const mockFavorThen = jest.fn().mockImplementation((callback) => {
      const favorValues = [
        { pointId: 1, favor: 35, eventTime: new Date("2023-01-02") },
        { pointId: 1, favor: 25, eventTime: new Date("2023-01-01") },
        { pointId: 2, favor: 45, eventTime: new Date("2023-01-02") },
        { pointId: 2, favor: 30, eventTime: new Date("2023-01-01") },
      ];
      return Promise.resolve(favorValues).then(callback);
    });

    // Set up mocks to return different chains based on the selected fields
    (db.select as jest.Mock).mockImplementation((fields) => {
      if (fields && fields.author) {
        return {
          from: mockViewpointFrom,
          innerJoin: mockViewpointInnerJoin,
          leftJoin: mockViewpointLeftJoin,
          where: mockViewpointWhere,
          limit: mockViewpointLimit,
          then: mockViewpointThen,
        };
      } else if (fields && fields.pointId && fields.cred) {
        return {
          from: mockEndorsementFrom,
          innerJoin: mockEndorsementInnerJoin,
          where: mockEndorsementWhere,
          then: mockEndorsementThen,
        };
      } else if (fields && fields.pointId && fields.favor) {
        return {
          from: mockFavorFrom,
          where: mockFavorWhere,
          orderBy: mockFavorOrderBy,
          then: mockFavorThen,
        };
      }
      return {
        from: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue([]),
      };
    });

    // Mock trackViewpointView
    (trackViewpointView as jest.Mock).mockResolvedValue(true);

    // Call the function
    const result = await fetchViewpoint("test-id");

    // Assert
    expect(db.select).toHaveBeenCalled();
    expect(getColumns).toHaveBeenCalledWith(viewpointsTable);
    expect(mockViewpointFrom).toHaveBeenCalledWith(viewpointsTable);
    expect(mockViewpointInnerJoin).toHaveBeenCalledWith(
      usersTable,
      expect.anything()
    );
    expect(mockViewpointLeftJoin).toHaveBeenCalledWith(
      viewpointInteractionsTable,
      expect.anything()
    );
    expect(mockViewpointWhere).toHaveBeenCalledWith(
      eq(viewpointsTable.id, "test-id")
    );
    expect(mockViewpointLimit).toHaveBeenCalledWith(1);

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
      totalCred: 450, // 200 + 250
      averageFavor: 40, // (35 + 45) / 2 = 40
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
        totalCred: 0,
        averageFavor: 0,
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
        originalPointIds: [],
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

    // Assert that missing statistics are defaulted to zero
    expect(result.statistics).toEqual({
      views: 0,
      copies: 0,
      totalCred: 0,
      averageFavor: 0,
    });
  });
});
