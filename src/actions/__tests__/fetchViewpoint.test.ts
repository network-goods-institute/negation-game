// Mock dependencies
jest.mock("@/db/schema", () => ({
  viewpointsTable: {
    id: "id",
    title: "title",
    description: "description",
    graph: "graph",
    createdBy: "created_by",
    createdAt: "created_at",
    space: "space",
    topicId: "topic_id",
    copiedFromId: "copied_from_id",
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
  topicsTable: {
    id: "id",
    name: "name",
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
    topicId: "topic_id",
    copiedFromId: "copied_from_id",
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
  topicsTable,
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
      copiedFromId: null,
      description: "",
      originalPointIds: [],
      graph: { nodes: [], edges: [] },
      createdBy: "",
      createdAt: new Date(0), // Implementation returns new Date(0)
      space: null,
      topic: "",
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
    const mockViewpointDbResult = {
      // Fields as they would come from the database query
      // directly from viewpointsTable or via joins
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
      createdAt: new Date("2023-01-01T12:00:00Z"),
      space: "test-space",
      author: "testuser", // Joined from usersTable.username
      originalPointIds: [1, 2], // Derived by SQL in the action
      views: 42, // Joined from viewpointInteractionsTable.views
      copies: 7, // Joined from viewpointInteractionsTable.copies
      topic: "Test Topic", // Joined from topicsTable.name
      topicId: 1, // From viewpointsTable.topicId
      copiedFromId: null, // From viewpointsTable.copiedFromId
    };

    // Mock the getColumns to return a structure that includes all fields
    // that fetchViewpoint spreads from the main DB result.
    (getColumns as jest.Mock).mockReturnValue({
      id: mockViewpointDbResult.id,
      title: mockViewpointDbResult.title,
      description: mockViewpointDbResult.description, // ensure description is part of the spread
      graph: mockViewpointDbResult.graph,
      createdBy: mockViewpointDbResult.createdBy,
      createdAt: mockViewpointDbResult.createdAt,
      space: mockViewpointDbResult.space,
      topicId: mockViewpointDbResult.topicId,
      copiedFromId: mockViewpointDbResult.copiedFromId,
      // Other fields from viewpointsTable if they were spread directly
    });

    // Mocks for the chained calls for THIS test case
    const mockViewpointThen = jest
      .fn()
      .mockImplementation((callback) =>
        Promise.resolve([mockViewpointDbResult]).then(callback)
      );
    const mockViewpointLimit = jest.fn(() => ({ then: mockViewpointThen }));
    const mockViewpointWhere = jest.fn(() => ({ limit: mockViewpointLimit }));

    const afterTopicsJoinObject = { where: mockViewpointWhere };
    const mockTopicsLeftJoinFn = jest.fn(() => afterTopicsJoinObject);

    const afterInteractionsJoinObject = { leftJoin: mockTopicsLeftJoinFn };
    const mockInteractionsLeftJoinFn = jest.fn(
      () => afterInteractionsJoinObject
    );

    const afterUsersJoinObject = { leftJoin: mockInteractionsLeftJoinFn };
    const mockUsersInnerJoinFn = jest.fn(() => afterUsersJoinObject);

    const mockFromFn = jest.fn(() => ({ innerJoin: mockUsersInnerJoinFn }));

    const mockEndorsementThen = jest.fn().mockImplementation((callback) => {
      const endorsements = [
        { pointId: 1, cred: 100 },
        { pointId: 2, cred: 200 },
      ];
      return Promise.resolve(endorsements).then(callback);
    });

    const mockFavorThen = jest.fn().mockImplementation((callback) => {
      const favorValues = [
        { pointId: 1, favor: 10, eventTime: new Date("2023-01-01") },
        { pointId: 2, favor: 30, eventTime: new Date("2023-01-01") },
      ];
      return Promise.resolve(favorValues).then(callback);
    });

    (db.select as jest.Mock).mockImplementation((selectFields) => {
      // Check for fields that are unique to the main viewpoint query
      if (
        selectFields &&
        selectFields.author &&
        selectFields.topic &&
        selectFields.originalPointIds
      ) {
        return {
          from: mockFromFn,
          innerJoin: mockUsersInnerJoinFn,
          leftJoin: mockInteractionsLeftJoinFn,
          where: mockViewpointWhere,
          limit: mockViewpointLimit,
          then: mockViewpointThen,
        };
      } else if (selectFields && selectFields.pointId && selectFields.cred) {
        return {
          from: jest.fn().mockReturnThis(),
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          then: mockEndorsementThen,
        };
      } else if (selectFields && selectFields.pointId && selectFields.favor) {
        return {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          then: mockFavorThen,
        };
      }
      return {
        from: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue([]),
      };
    });

    (trackViewpointView as jest.Mock).mockResolvedValue(true);

    const result = await fetchViewpoint("test-id");

    expect(result).toEqual({
      // All fields from mockViewpointDbResult are expected to be spread
      ...mockViewpointDbResult,
      // description is explicitly listed in the return, so ensure it's correct
      description: mockViewpointDbResult.description,
      statistics: {
        totalCred: 300, // 100 + 200
        averageFavor: 20, // (10 + 30) / 2
        views: 42, // from mockViewpointDbResult
        copies: 7, // from mockViewpointDbResult
      },
    });

    // Assert the chain of calls for the main query
    expect(mockFromFn).toHaveBeenCalledWith(viewpointsTable);
    expect(mockUsersInnerJoinFn).toHaveBeenCalledWith(
      usersTable,
      eq(usersTable.id, viewpointsTable.createdBy)
    );
    expect(mockInteractionsLeftJoinFn).toHaveBeenCalledWith(
      viewpointInteractionsTable,
      eq(viewpointInteractionsTable.viewpointId, viewpointsTable.id)
    );
    expect(mockTopicsLeftJoinFn).toHaveBeenCalledWith(
      topicsTable,
      eq(viewpointsTable.topicId, topicsTable.id)
    );
    expect(mockViewpointWhere).toHaveBeenCalledWith(
      eq(viewpointsTable.id, "test-id")
    );
    expect(mockViewpointLimit).toHaveBeenCalledWith(1);

    expect(trackViewpointView).toHaveBeenCalledWith("test-id");
  });

  it("should handle missing viewpoint and return null", async () => {
    const mockFrom = jest.fn().mockReturnThis();
    const mockInnerJoin = jest.fn().mockReturnThis();
    const mockLeftJoin = jest.fn().mockReturnThis();
    const mockWhere = jest.fn().mockReturnThis();
    const mockLimit = jest.fn().mockReturnThis();
    const mockThen = jest.fn().mockImplementation((callback) => {
      return Promise.resolve([]).then(callback); // No viewpoint found
    });

    (db.select as jest.Mock).mockReturnValue({
      from: mockFrom,
      innerJoin: mockInnerJoin,
      leftJoin: mockLeftJoin,
      where: mockWhere,
      limit: mockLimit,
      then: mockThen,
    });

    const result = await fetchViewpoint("non-existent-id");
    expect(result).toBeNull();
    expect(trackViewpointView).not.toHaveBeenCalled();
  });

  it("should handle missing statistics and default to zero, topic to null from db, then processed", async () => {
    const mockViewpointDataNoStats = {
      id: "test-id-no-stats",
      title: "No Stats Viewpoint",
      description: "Desc",
      graph: { nodes: [], edges: [] },
      createdBy: "user-456",
      createdAt: new Date("2023-02-01T12:00:00Z"),
      space: "test-space",
      author: "anotheruser", // Joined
      originalPointIds: [], // SQL derived
      copiedFromId: null,
      views: null, // Explicitly null from DB (e.g., no matching interaction record)
      copies: null, // Explicitly null from DB
      topic: null, // Explicitly null from DB (e.g., viewpoint.topicId is null or no matching topic)
      topicId: null, // viewpointsTable.topicId
    };

    (getColumns as jest.Mock).mockReturnValue({
      id: mockViewpointDataNoStats.id,
      title: mockViewpointDataNoStats.title,
      description: mockViewpointDataNoStats.description,
      graph: mockViewpointDataNoStats.graph,
      createdBy: mockViewpointDataNoStats.createdBy,
      createdAt: mockViewpointDataNoStats.createdAt,
      space: mockViewpointDataNoStats.space,
      topicId: mockViewpointDataNoStats.topicId,
      copiedFromId: mockViewpointDataNoStats.copiedFromId,
    });

    // Mocks for the chained calls for THIS test case
    const mockNoStatsViewpointThen = jest
      .fn()
      .mockImplementation((callback) =>
        Promise.resolve([mockViewpointDataNoStats]).then(callback)
      );
    const mockNoStatsViewpointLimit = jest.fn(() => ({
      then: mockNoStatsViewpointThen,
    }));
    const mockNoStatsViewpointWhere = jest.fn(() => ({
      limit: mockNoStatsViewpointLimit,
    }));

    const mockNoStatsAfterTopicsJoinObject = {
      where: mockNoStatsViewpointWhere,
    };
    const mockNoStatsTopicsLeftJoinFn = jest.fn(
      () => mockNoStatsAfterTopicsJoinObject
    );

    const mockNoStatsAfterInteractionsJoinObject = {
      leftJoin: mockNoStatsTopicsLeftJoinFn,
    };
    const mockNoStatsInteractionsLeftJoinFn = jest.fn(
      () => mockNoStatsAfterInteractionsJoinObject
    );

    const mockNoStatsAfterUsersJoinObject = {
      leftJoin: mockNoStatsInteractionsLeftJoinFn,
    };
    const mockNoStatsUsersInnerJoinFn = jest.fn(
      () => mockNoStatsAfterUsersJoinObject
    );

    const mockNoStatsFromFn = jest.fn(() => ({
      innerJoin: mockNoStatsUsersInnerJoinFn,
    }));

    const mockNoStatsEndorsementThen = jest
      .fn()
      .mockImplementation((callback) => Promise.resolve([]).then(callback));
    const mockNoStatsFavorThen = jest
      .fn()
      .mockImplementation((callback) => Promise.resolve([]).then(callback));

    (db.select as jest.Mock).mockImplementation((selectFields) => {
      if (
        selectFields &&
        selectFields.author &&
        selectFields.topic &&
        selectFields.originalPointIds
      ) {
        return {
          from: mockNoStatsFromFn, // Use the chain for this test case
        };
      } else if (selectFields && selectFields.pointId && selectFields.cred) {
        return {
          from: jest.fn().mockReturnThis(),
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          then: mockNoStatsEndorsementThen, // Use endorsement mock for this test
        };
      } else if (selectFields && selectFields.pointId && selectFields.favor) {
        return {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          then: mockNoStatsFavorThen, // Use favor mock for this test
        };
      }
      return {
        from: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue([]),
      };
    });

    (trackViewpointView as jest.Mock).mockResolvedValue(true);

    const result = await fetchViewpoint("test-id-no-stats");

    expect(result).toEqual({
      ...mockViewpointDataNoStats,
      description: mockViewpointDataNoStats.description, // ensure description is passed
      statistics: {
        views: 0, // Defaulted because mockViewpointDataNoStats.views was null
        copies: 0, // Defaulted because mockViewpointDataNoStats.copies was null
        totalCred: 0,
        averageFavor: 0,
      },
    });

    // Assert the chain of calls for this test case's main query
    expect(mockNoStatsFromFn).toHaveBeenCalledWith(viewpointsTable);
    expect(mockNoStatsUsersInnerJoinFn).toHaveBeenCalledWith(
      usersTable,
      eq(usersTable.id, viewpointsTable.createdBy)
    );
    expect(mockNoStatsInteractionsLeftJoinFn).toHaveBeenCalledWith(
      viewpointInteractionsTable,
      eq(viewpointInteractionsTable.viewpointId, viewpointsTable.id)
    );
    expect(mockNoStatsTopicsLeftJoinFn).toHaveBeenCalledWith(
      topicsTable,
      eq(viewpointsTable.topicId, topicsTable.id)
    );
    expect(mockNoStatsViewpointWhere).toHaveBeenCalledWith(
      eq(viewpointsTable.id, "test-id-no-stats")
    );
    expect(mockNoStatsViewpointLimit).toHaveBeenCalledWith(1);
  });
});
