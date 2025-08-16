jest.mock("@/services/db", () => ({
  db: {
    select: jest.fn(),
    query: {
      viewpointsTable: {
        findFirst: jest.fn(),
      },
    },
  },
}));

jest.mock("drizzle-orm", () => ({
  and: jest.fn(),
  eq: jest.fn(),
  inArray: jest.fn(),
}));

jest.mock("@/db/schema", () => ({
  viewpointsTable: {
    id: "vp.id",
    createdBy: "vp.created_by",
    title: "vp.title",
    graph: "vp.graph",
    topicId: "vp.topic_id",
    isActive: "vp.is_active",
  },
  usersTable: {
    id: "u.id",
    username: "u.username",
  },
  endorsementsTable: {
    id: "e.id",
    pointId: "e.point_id",
    userId: "e.user_id",
  },
}));

import { db } from "@/services/db";
import { fetchConsilienceAuthors } from "../fetchConsilienceAuthors";

describe("fetchConsilienceAuthors", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns unique authors by user and dedupes rationales per user", async () => {
    const mockSelect = jest.fn().mockReturnThis();
    const mockFrom = jest.fn().mockReturnThis();
    const mockInnerJoin = jest.fn().mockReturnThis();
    const mockWhere = jest.fn().mockResolvedValue([
      {
        id: "r1",
        createdBy: "user1",
        title: "Rationale 1",
        username: "alice",
        graph: { nodes: [{ type: "point", data: { pointId: 1 } }] },
      },
      {
        id: "r2",
        createdBy: "user1",
        title: "Rationale 2",
        username: "alice",
        graph: { nodes: [{ type: "point", data: { pointId: 2 } }] },
      },
      {
        id: "r3",
        createdBy: "user2",
        title: "Rationale 3",
        username: "bob",
        graph: { nodes: [{ type: "point", data: { pointId: 99 } }] },
      },
    ]);

    (db as any).select = jest.fn(() => ({
      from: mockFrom,
      innerJoin: mockInnerJoin,
      where: mockWhere,
    }));

    (db as any).select.mockReturnValueOnce({
      from: mockFrom,
      innerJoin: mockInnerJoin,
      where: mockWhere,
    });

    const result = await fetchConsilienceAuthors(123);

    expect(result).toHaveLength(2);
    expect(result[0].userId).toBe("user1");
    expect(result[0].rationales.map((r) => r.id)).toEqual(["r1", "r2"]);
  });
});
