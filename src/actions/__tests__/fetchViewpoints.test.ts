jest.mock("@/db/schema", () => ({
  viewpointsTable: {
    id: "id",
    createdBy: "created_by",
    space: "space",
    createdAt: "created_at",
    graph: "graph",
    topicId: "topic_id",
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
  getColumns: jest.fn().mockReturnValue({
    id: "viewpoint_id_col",
    title: "title_col",
    description: "description_col",
    graph: "graph_col",
    createdBy: "created_by_col",
    createdAt: "created_at_col",
    space: "space_col",
    topicId: "topic_id_col",
  }),
}));

jest.mock("@/services/db");

jest.mock("drizzle-orm", () => ({
  eq: jest.fn((a, b) => `eq(${a}, ${b})`),
  desc: jest.fn((column) => `desc(${column})`),
  and: jest.fn((...args) => `and(${args.join(", ")})`),
  inArray: jest.fn((col, vals) => `inArray(${col}, [${vals.join(", ")}])`),
}));

jest.mock("../utils/calculateViewpointStats", () => ({
  calculateViewpointStats: jest.fn(),
}));

import { fetchViewpoints } from "../viewpoints/fetchViewpoints";
import { db } from "@/services/db";
import {
  viewpointsTable,
  usersTable,
  viewpointInteractionsTable,
  pointsTable,
  endorsementsTable,
  pointFavorHistoryView,
  topicsTable,
} from "@/db/schema";
import { getColumns } from "@/db/utils/getColumns";
import { eq, desc, and, inArray } from "drizzle-orm";
import { calculateViewpointStats } from "../utils/calculateViewpointStats";

const mockOrderBy = jest.fn();
const mockWhere = jest.fn(() => ({ orderBy: mockOrderBy }));
const mockLeftJoinTopics = jest.fn(() => ({ where: mockWhere }));
const mockLeftJoinInteractions = jest.fn(() => ({
  leftJoin: mockLeftJoinTopics,
}));
const mockInnerJoin = jest.fn(() => ({ leftJoin: mockLeftJoinInteractions }));
const mockFrom = jest.fn(() => ({ innerJoin: mockInnerJoin }));
const mockSelect = jest.fn(() => ({ from: mockFrom }));

describe("fetchViewpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (db as any).select = mockSelect;
    (calculateViewpointStats as jest.Mock).mockReset();
  });

  it("should fetch viewpoints and call calculateViewpointStats", async () => {
    const mockRawViewpoints = [
      {
        id: "vp-1",
        title: "VP 1",
        description: "Desc 1",
        graph: {
          nodes: [{ id: "n1", type: "point", data: { pointId: 101 } }],
          edges: [],
        },
        createdBy: "user-1",
        createdAt: new Date("2024-01-01"),
        space: "test-space",
        authorId: "user-1",
        authorUsername: "User One",
        views: 10,
        copies: 1,
        topic: "Topic Alpha",
        topicId: 1,
      },
      {
        id: "vp-2",
        title: "VP 2",
        description: "Desc 2",
        graph: {
          nodes: [{ id: "n2", type: "point", data: { pointId: 102 } }],
          edges: [],
        },
        createdBy: "user-2",
        createdAt: new Date("2024-01-02"),
        space: "test-space",
        authorId: "user-2",
        authorUsername: "User Two",
        views: 20,
        copies: 2,
        topic: "Topic Beta",
        topicId: 2,
      },
    ];

    const mockStats1 = { totalCred: 100, averageFavor: 50 };
    const mockStats2 = { totalCred: 200, averageFavor: 60 };

    mockOrderBy.mockResolvedValue(mockRawViewpoints);
    (calculateViewpointStats as jest.Mock)
      .mockResolvedValueOnce(mockStats1)
      .mockResolvedValueOnce(mockStats2);

    const spaceName = "test-space";
    const result = await fetchViewpoints(spaceName);

    expect(mockSelect).toHaveBeenCalledWith({
      ...(getColumns(viewpointsTable) as object),
      authorId: usersTable.id,
      authorUsername: usersTable.username,
      views: viewpointInteractionsTable.views,
      copies: viewpointInteractionsTable.copies,
      topic: topicsTable.name,
    });
    expect(mockFrom).toHaveBeenCalledWith(viewpointsTable);
    expect(mockInnerJoin).toHaveBeenCalledWith(
      usersTable,
      eq(usersTable.id, viewpointsTable.createdBy)
    );
    expect(mockLeftJoinInteractions).toHaveBeenCalledWith(
      viewpointInteractionsTable,
      eq(viewpointInteractionsTable.viewpointId, viewpointsTable.id)
    );
    expect(mockLeftJoinTopics).toHaveBeenCalledWith(
      topicsTable,
      eq(viewpointsTable.topicId, topicsTable.id)
    );
    expect(mockWhere).toHaveBeenCalledWith(
      eq(viewpointsTable.space, spaceName)
    );
    expect(mockOrderBy).toHaveBeenCalledWith(desc(viewpointsTable.createdAt));

    expect(calculateViewpointStats).toHaveBeenCalledTimes(2);
    expect(calculateViewpointStats).toHaveBeenCalledWith({
      graph: mockRawViewpoints[0].graph,
      createdBy: mockRawViewpoints[0].createdBy,
    });
    expect(calculateViewpointStats).toHaveBeenCalledWith({
      graph: mockRawViewpoints[1].graph,
      createdBy: mockRawViewpoints[1].createdBy,
    });

    expect(result).toEqual([
      {
        ...mockRawViewpoints[0],
        statistics: {
          views: 10,
          copies: 1,
          ...mockStats1,
        },
      },
      {
        ...mockRawViewpoints[1],
        statistics: {
          views: 20,
          copies: 2,
          ...mockStats2,
        },
      },
    ]);
  });

  it("should handle missing interaction data and default stats to zero", async () => {
    const mockRawViewpoints = [
      {
        id: "vp-3",
        title: "VP 3",
        description: "Desc 3",
        graph: {
          nodes: [{ id: "n3", type: "point", data: { pointId: 103 } }],
          edges: [],
        },
        createdBy: "user-3",
        createdAt: new Date("2024-01-03"),
        space: "test-space-empty",
        authorId: "user-3",
        authorUsername: "User Three",
        views: null,
        copies: undefined,
        topic: "Topic Gamma",
        topicId: 3,
      },
    ];

    const mockStats = { totalCred: 50, averageFavor: 25 };

    mockOrderBy.mockResolvedValue(mockRawViewpoints);
    (calculateViewpointStats as jest.Mock).mockResolvedValue(mockStats);

    const spaceName = "test-space-empty";
    const result = await fetchViewpoints(spaceName);

    expect(mockSelect).toHaveBeenCalledWith({
      ...(getColumns(viewpointsTable) as object),
      authorId: usersTable.id,
      authorUsername: usersTable.username,
      views: viewpointInteractionsTable.views,
      copies: viewpointInteractionsTable.copies,
      topic: topicsTable.name,
    });
    expect(mockFrom).toHaveBeenCalledWith(viewpointsTable);
    expect(mockInnerJoin).toHaveBeenCalledWith(usersTable, expect.any(String));
    expect(mockLeftJoinInteractions).toHaveBeenCalledWith(
      viewpointInteractionsTable,
      expect.any(String)
    );
    expect(mockLeftJoinTopics).toHaveBeenCalledWith(
      topicsTable,
      expect.any(String)
    );
    expect(mockWhere).toHaveBeenCalledWith(
      eq(viewpointsTable.space, spaceName)
    );
    expect(mockOrderBy).toHaveBeenCalledWith(desc(viewpointsTable.createdAt));

    expect(calculateViewpointStats).toHaveBeenCalledTimes(1);
    expect(calculateViewpointStats).toHaveBeenCalledWith({
      graph: mockRawViewpoints[0].graph,
      createdBy: mockRawViewpoints[0].createdBy,
    });

    expect(result).toEqual([
      {
        ...mockRawViewpoints[0],
        statistics: {
          views: 0,
          copies: 0,
          ...mockStats,
        },
      },
    ]);
  });

  it("should return an empty array if no viewpoints are found", async () => {
    mockOrderBy.mockResolvedValue([]);
    (calculateViewpointStats as jest.Mock).mockResolvedValue({
      totalCred: 0,
      averageFavor: 0,
    });

    const spaceName = "empty-space";
    const result = await fetchViewpoints(spaceName);

    expect(mockSelect).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalledWith(viewpointsTable);
    expect(mockInnerJoin).toHaveBeenCalled();
    expect(mockLeftJoinInteractions).toHaveBeenCalled();
    expect(mockLeftJoinTopics).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalledWith(
      eq(viewpointsTable.space, spaceName)
    );
    expect(mockOrderBy).toHaveBeenCalled();

    expect(calculateViewpointStats).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
