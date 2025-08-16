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
    isActive: "is_active",
  },
  endorsementsTable: {
    pointId: "point_id",
    userId: "user_id",
    cred: "cred",
  },
  currentPointFavorView: {
    pointId: "point_id",
    favor: "favor",
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

jest.mock("drizzle-orm", () => ({
  eq: jest.fn((a, b) => `eq(${a}, ${b})`),
  desc: jest.fn((column) => `desc(${column})`),
  and: jest.fn((...args) => `and(${args.join(", ")})`),
  inArray: jest.fn((col, vals) => `inArray(${col}, [${vals.join(", ")}])`),
  sql: jest.fn(),
}));

jest.mock("@/db/tables/viewpointsTable", () => ({
  activeViewpointsFilter: "activeViewpointsFilter",
}));

jest.mock("@/services/db", () => ({
  db: {
    select: jest.fn(),
  },
}));

import { fetchViewpoints } from "../viewpoints/fetchViewpoints";
import { db } from "@/services/db";

const mockDb = db as jest.Mocked<typeof db>;

describe("fetchViewpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch viewpoints and calculate stats correctly", async () => {
    const spaceName = "test-space";
    const mockViewpoints = [
      {
        id: "vp1",
        createdBy: "user1",
        graph: { nodes: [{ type: "point", data: { pointId: 1 } }] },
        views: 10,
        copies: 2,
        authorId: "user1",
        authorUsername: "testuser",
        topic: "Test Topic",
        topicId: "topic1",
      },
    ];
    const mockEndorsements = [{ pointId: 1, cred: 100, userId: "user1" }];
    const mockFavorValues = [{ pointId: 1, favor: 80 }];

    const mockViewpointsChain = {
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockResolvedValue(mockViewpoints),
    } as any;

    const mockEndorsementsChain = {
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue(mockEndorsements),
    } as any;

    const mockFavorChain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue(mockFavorValues),
    } as any;

    mockDb.select
      .mockReturnValueOnce(mockViewpointsChain)
      .mockReturnValueOnce(mockEndorsementsChain)
      .mockReturnValueOnce(mockFavorChain);

    const result = await fetchViewpoints(spaceName);

    expect(result[0].statistics.totalCred).toBe(100);
    expect(result[0].statistics.averageFavor).toBe(80);
    expect(result[0].statistics.views).toBe(10);
    expect(result[0].statistics.copies).toBe(2);
  });

  it("should return an empty array if no viewpoints are found", async () => {
    const mockQueryChain = {
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockResolvedValue([]),
    } as any;
    mockDb.select.mockReturnValueOnce(mockQueryChain);

    const result = await fetchViewpoints("empty-space");
    expect(result).toEqual([]);
    expect(mockDb.select).toHaveBeenCalledTimes(1);
  });

  it("should handle viewpoints with no points", async () => {
    const mockViewpoints = [
      {
        id: "vp1",
        createdBy: "user1",
        graph: { nodes: [] },
        views: 10,
        copies: 2,
        authorId: "user1",
        authorUsername: "testuser",
        topic: "Test Topic",
        topicId: "topic1",
      },
    ];
    const mockQueryChain = {
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockResolvedValue(mockViewpoints),
    } as any;
    mockDb.select.mockReturnValueOnce(mockQueryChain);

    const result = await fetchViewpoints("no-points-space");

    expect(result[0].statistics.totalCred).toBe(0);
    expect(result[0].statistics.averageFavor).toBe(0);
    expect(mockDb.select).toHaveBeenCalledTimes(1);
  });

  it("should handle missing interaction data by defaulting to 0", async () => {
    const mockViewpoints = [
      {
        id: "vp1",
        createdBy: "user1",
        graph: { nodes: [] },
        views: null,
        copies: undefined,
        authorId: "user1",
        authorUsername: "testuser",
        topic: "Test Topic",
        topicId: "topic1",
      },
    ];
    const mockQueryChain = {
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockResolvedValue(mockViewpoints),
    } as any;
    mockDb.select.mockReturnValueOnce(mockQueryChain);

    const result = await fetchViewpoints("test-space");

    expect(result[0].statistics.views).toBe(0);
    expect(result[0].statistics.copies).toBe(0);
  });
});
