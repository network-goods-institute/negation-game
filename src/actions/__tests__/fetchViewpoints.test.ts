// Mock dependencies
jest.mock("@/db/schema", () => ({
  viewpointsTable: {
    id: "id",
    createdBy: "created_by",
    space: "space",
    createdAt: "created_at",
    graph: "graph",
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
  desc: jest.fn((column) => ({ column, direction: "desc" })),
  and: jest.fn((a, b) => ({ operator: "AND", conditions: [a, b] })),
  inArray: jest.fn((col, vals) => ({ column: col, values: vals })),
}));

// Import after mocking
import { fetchViewpoints } from "../fetchViewpoints";
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
import { eq, desc, and, inArray } from "drizzle-orm";

describe("fetchViewpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch viewpoints with calculated statistics", async () => {
    // Mock the viewpoints data
    const mockViewpoints = [
      {
        id: "viewpoint-1",
        title: "Viewpoint 1",
        description: "Description 1",
        graph: {
          nodes: [
            { type: "point", data: { pointId: 1 } },
            { type: "point", data: { pointId: 2 } },
          ],
          edges: [],
        },
        createdBy: "user-1",
        createdAt: new Date(),
        space: "test-space",
        author: "Test User 1",
        views: 100,
        copies: 25,
      },
    ];

    // Mock the endorsements data
    const mockEndorsements = [
      { pointId: 1, cred: 200 },
      { pointId: 2, cred: 250 },
    ];

    // Mock the favor values
    const mockFavorValues = [
      { pointId: 1, favor: 35, eventTime: new Date("2023-01-02") },
      { pointId: 1, favor: 25, eventTime: new Date("2023-01-01") },
      { pointId: 2, favor: 45, eventTime: new Date("2023-01-02") },
      { pointId: 2, favor: 30, eventTime: new Date("2023-01-01") },
    ];

    // Mock select chains for viewpoints
    const mockViewpointsFrom = jest.fn().mockReturnThis();
    const mockViewpointsInnerJoin = jest.fn().mockReturnThis();
    const mockViewpointsLeftJoin = jest.fn().mockReturnThis();
    const mockViewpointsWhere = jest.fn().mockReturnThis();
    const mockViewpointsOrderBy = jest.fn().mockResolvedValue(mockViewpoints);

    // Mock select chain for endorsements
    const mockEndorsementsFrom = jest.fn().mockReturnThis();
    const mockEndorsementsInnerJoin = jest.fn().mockReturnThis();
    const mockEndorsementsWhere = jest.fn().mockResolvedValue(mockEndorsements);

    // Mock select chain for favor values
    const mockFavorFrom = jest.fn().mockReturnThis();
    const mockFavorWhere = jest.fn().mockReturnThis();
    const mockFavorOrderBy = jest.fn().mockResolvedValue(mockFavorValues);

    // Set up mocks to return different chains based on the selected fields
    (db.select as jest.Mock).mockImplementation((fields) => {
      if (fields && fields.author) {
        return {
          from: mockViewpointsFrom,
          innerJoin: mockViewpointsInnerJoin,
          leftJoin: mockViewpointsLeftJoin,
          where: mockViewpointsWhere,
          orderBy: mockViewpointsOrderBy,
        };
      } else if (fields && fields.pointId && fields.cred) {
        return {
          from: mockEndorsementsFrom,
          innerJoin: mockEndorsementsInnerJoin,
          where: mockEndorsementsWhere,
        };
      } else if (fields && fields.pointId && fields.favor) {
        return {
          from: mockFavorFrom,
          where: mockFavorWhere,
          orderBy: mockFavorOrderBy,
        };
      }
      return {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([]),
      };
    });

    // Call the function
    const result = await fetchViewpoints("test-space");

    // Verify the main viewpoints query is constructed correctly
    expect(db.select).toHaveBeenCalled();
    expect(getColumns).toHaveBeenCalledWith(viewpointsTable);
    expect(mockViewpointsFrom).toHaveBeenCalledWith(viewpointsTable);
    expect(mockViewpointsInnerJoin).toHaveBeenCalledWith(
      usersTable,
      expect.anything()
    );
    expect(mockViewpointsLeftJoin).toHaveBeenCalledWith(
      viewpointInteractionsTable,
      expect.anything()
    );
    expect(mockViewpointsWhere).toHaveBeenCalledWith(
      eq(viewpointsTable.space, "test-space")
    );
    expect(mockViewpointsOrderBy).toHaveBeenCalledWith(
      desc(viewpointsTable.createdAt)
    );

    // Verify the endorsements query called with correct parameters
    expect(mockEndorsementsFrom).toHaveBeenCalledWith(pointsTable);
    expect(mockEndorsementsInnerJoin).toHaveBeenCalledWith(
      endorsementsTable,
      expect.anything()
    );
    expect(mockEndorsementsWhere).toHaveBeenCalledWith(
      and(
        inArray(pointsTable.id, [1, 2]),
        eq(endorsementsTable.userId, "user-1")
      )
    );

    // Verify the favor query called with correct parameters
    expect(mockFavorFrom).toHaveBeenCalledWith(pointFavorHistoryView);
    expect(mockFavorWhere).toHaveBeenCalledWith(
      inArray(pointFavorHistoryView.pointId, [1, 2])
    );
    expect(mockFavorOrderBy).toHaveBeenCalledWith(
      desc(pointFavorHistoryView.eventTime)
    );

    // Verify result is formatted correctly with calculated statistics
    expect(result).toEqual([
      {
        id: "viewpoint-1",
        title: "Viewpoint 1",
        description: "Description 1",
        graph: {
          nodes: [
            { type: "point", data: { pointId: 1 } },
            { type: "point", data: { pointId: 2 } },
          ],
          edges: [],
        },
        createdBy: "user-1",
        createdAt: expect.any(Date),
        space: "test-space",
        author: "Test User 1",
        views: 100,
        copies: 25,
        statistics: {
          views: 100,
          copies: 25,
          totalCred: 450, // Sum of 200 + 250
          averageFavor: 40, // (35 + 45) / 2 rounded
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
        graph: { nodes: [], edges: [] },
        createdBy: "user-1",
        createdAt: new Date(),
        space: "test-space",
        author: "Test User 1",
        // No views or copies
      },
    ];

    // Mock select chains
    const mockViewpointsFrom = jest.fn().mockReturnThis();
    const mockViewpointsInnerJoin = jest.fn().mockReturnThis();
    const mockViewpointsLeftJoin = jest.fn().mockReturnThis();
    const mockViewpointsWhere = jest.fn().mockReturnThis();
    const mockViewpointsOrderBy = jest.fn().mockResolvedValue(mockViewpoints);

    // Set up mock to return empty data for endorsements and favor
    (db.select as jest.Mock).mockImplementation((fields) => {
      if (fields && fields.author) {
        return {
          from: mockViewpointsFrom,
          innerJoin: mockViewpointsInnerJoin,
          leftJoin: mockViewpointsLeftJoin,
          where: mockViewpointsWhere,
          orderBy: mockViewpointsOrderBy,
        };
      } else {
        return {
          from: jest.fn().mockReturnThis(),
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([]),
          orderBy: jest.fn().mockResolvedValue([]),
        };
      }
    });

    // Call the function
    const result = await fetchViewpoints("test-space");

    // Verify statistics defaults to zero
    expect(result[0].statistics).toEqual({
      views: 0,
      copies: 0,
      totalCred: 0,
      averageFavor: 0,
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
