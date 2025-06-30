// Mock database schema first
jest.mock("@/db/schema", () => ({
  dailyStancesTable: {
    pointId: { name: "pointId" },
    zValue: { name: "zValue" },
    snapDay: { name: "snapDay" },
  },
  pointsTable: {
    id: { name: "id" },
    content: { name: "content" },
    space: { name: "space" },
  },
  endorsementsTable: {
    pointId: { name: "pointId" },
    userId: { name: "userId" },
    cred: { name: "cred" },
  },
  pointClustersTable: {
    pointId: { name: "pointId" },
    sign: { name: "sign" },
  },
  negationsTable: {
    olderPointId: { name: "olderPointId" },
    newerPointId: { name: "newerPointId" },
    isActive: { name: "isActive" },
  },
}));

// Mock dailySnapshotJob
jest.mock("@/actions/analytics/dailySnapshotJob", () => ({
  dailySnapshotJob: jest.fn(),
}));

// Mock drizzle-orm
jest.mock("drizzle-orm", () => {
  const actual = jest.requireActual("drizzle-orm");
  const mockSql: any = jest.fn(() => ({
    mapWith: jest.fn().mockReturnThis(),
    raw: jest.fn().mockReturnThis(),
    toString: () => "mocked sql",
  }));
  mockSql.raw = jest.fn((str: string) => str);

  return {
    ...actual,
    sql: mockSql,
    eq: jest.fn(),
    and: jest.fn(),
  };
});

import { computeContestedPoints } from "../computeContestedPoints";
import { dailySnapshotJob } from "../dailySnapshotJob";
import { db } from "@/services/db";

// Generic stub for Drizzle query builder chains
function stubQuery(result: any = []) {
  const chain: any = {};
  const passthrough = jest.fn().mockReturnValue(chain);
  [
    "from",
    "where",
    "leftJoin",
    "groupBy",
    "orderBy",
    "limit",
    "having",
    "innerJoin",
    "select",
  ].forEach((m) => {
    chain[m] = passthrough;
  });
  chain.then = jest.fn((onF, onR) => Promise.resolve(result).then(onF, onR));
  chain[Symbol.toStringTag] = "Promise";
  chain.catch = jest.fn(() => Promise.resolve());
  return chain;
}

jest.mock("@/services/db", () => ({
  db: {
    select: jest.fn(),
  },
}));

describe("computeContestedPoints", () => {
  const mockDailySnapshotJob = dailySnapshotJob as jest.MockedFunction<
    typeof dailySnapshotJob
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDailySnapshotJob.mockResolvedValue({
      success: true,
      message: "Snapshot completed",
      stats: { processedUsers: 0, processedPoints: 0 },
    });
  });

  describe("Space Filtering", () => {
    it("should include space filtering when space parameter is provided", async () => {
      const mockStancesData = [
        { pointId: 1, pos: 5, neg: 3 },
        { pointId: 2, pos: 4, neg: 4 },
      ];

      const mockContentData = [
        { id: 1, content: "Point 1 content" },
        { id: 2, content: "Point 2 content" },
      ];

      let callCount = 0;
      (db.select as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return stubQuery(mockStancesData);
        } else if (callCount === 2) {
          return stubQuery(mockContentData);
        }
        return stubQuery([]);
      });

      const result = await computeContestedPoints({
        space: "test_space",
        limit: 10,
      });

      expect(result).toHaveLength(2);
      expect(db.select).toHaveBeenCalled();
    });

    it("should not include space filtering when space parameter is omitted", async () => {
      const mockStancesData = [{ pointId: 1, pos: 5, neg: 3 }];

      const mockContentData = [{ id: 1, content: "Global point content" }];

      let callCount = 0;
      (db.select as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return stubQuery(mockStancesData);
        } else if (callCount === 2) {
          return stubQuery(mockContentData);
        }
        return stubQuery([]);
      });

      const result = await computeContestedPoints({
        limit: 10,
      });

      expect(result).toHaveLength(1);
      expect(db.select).toHaveBeenCalled();
    });
  });

  describe("Limit Parameter", () => {
    it("should use default limit of 50 when not specified", async () => {
      // Generate many contested points to test limit
      const mockStancesData = Array.from({ length: 60 }, (_, i) => ({
        pointId: i + 1,
        pos: 5,
        neg: 3,
      }));

      const mockContentData = Array.from({ length: 60 }, (_, i) => ({
        id: i + 1,
        content: `Point ${i + 1} content`,
      }));

      let callCount = 0;
      (db.select as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return stubQuery(mockStancesData);
        } else if (callCount === 2) {
          return stubQuery(mockContentData);
        }
        return stubQuery([]);
      });

      const result = await computeContestedPoints({});

      expect(result).toHaveLength(50); // Should be limited to default 50
    });

    it("should respect custom limit parameter", async () => {
      const mockStancesData = Array.from({ length: 30 }, (_, i) => ({
        pointId: i + 1,
        pos: 5,
        neg: 3,
      }));

      const mockContentData = Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        content: `Point ${i + 1} content`,
      }));

      let callCount = 0;
      (db.select as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return stubQuery(mockStancesData);
        } else if (callCount === 2) {
          return stubQuery(mockContentData);
        }
        return stubQuery([]);
      });

      const result = await computeContestedPoints({
        limit: 15,
      });

      expect(result).toHaveLength(15);
    });
  });

  describe("Fallback Mechanisms", () => {
    it("should trigger snapshot generation when no daily stances data", async () => {
      let callCount = 0;
      (db.select as jest.Mock).mockImplementation(() => {
        callCount++;
        // All queries return empty to test snapshot trigger
        return stubQuery([]);
      });

      const result = await computeContestedPoints({
        space: "test_space",
      });

      expect(mockDailySnapshotJob).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it("should use fallback mechanisms when daily stances empty", async () => {
      let callCount = 0;
      (db.select as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Empty daily stances
          return stubQuery([]);
        } else if (callCount === 2) {
          // Cluster aggregation returns data
          return stubQuery([{ pointId: 1, pos: 3, neg: 2 }]);
        } else if (callCount === 3) {
          // Content query
          return stubQuery([{ id: 1, content: "Fallback point" }]);
        }
        return stubQuery([]);
      });

      const result = await computeContestedPoints({
        space: "test_space",
      });

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("Fallback point");
    });
  });

  describe("Data Processing", () => {
    it("should calculate contested scores correctly", async () => {
      const mockStancesData = [
        { pointId: 1, pos: 6, neg: 3 }, // 0.5 contested score
        { pointId: 2, pos: 4, neg: 4 }, // 1.0 contested score
      ];

      const mockContentData = [
        { id: 1, content: "Point 1" },
        { id: 2, content: "Point 2" },
      ];

      let callCount = 0;
      (db.select as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return stubQuery(mockStancesData);
        } else if (callCount === 2) {
          return stubQuery(mockContentData);
        }
        return stubQuery([]);
      });

      const result = await computeContestedPoints({});

      expect(result).toHaveLength(2);
      // Should be sorted by contested score descending
      expect(result[0].contestedScore).toBe(1.0);
      expect(result[1].contestedScore).toBe(0.5);
    });

    it("should handle missing content gracefully", async () => {
      const mockStancesData = [
        { pointId: 1, pos: 5, neg: 3 },
        { pointId: 2, pos: 4, neg: 4 },
      ];

      // Missing content for point 2
      const mockContentData = [{ id: 1, content: "Point 1 content" }];

      let callCount = 0;
      (db.select as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return stubQuery(mockStancesData);
        } else if (callCount === 2) {
          return stubQuery(mockContentData);
        }
        return stubQuery([]);
      });

      const result = await computeContestedPoints({});

      expect(result).toHaveLength(2);
      // Verify all results have content (either found or missing placeholder)
      expect(result.every((r) => r.content)).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should return empty array when no contested points exist", async () => {
      (db.select as jest.Mock).mockImplementation(() => stubQuery([]));

      const result = await computeContestedPoints({});

      expect(result).toEqual([]);
    });

    it("should handle database errors gracefully", async () => {
      (db.select as jest.Mock).mockImplementation(() => {
        throw new Error("Database error");
      });

      await expect(computeContestedPoints({})).rejects.toThrow(
        "Database error"
      );
    });
  });

  describe("Parameter Handling", () => {
    it("should handle snapDay parameter", async () => {
      const mockStancesData = [{ pointId: 1, pos: 5, neg: 3 }];

      const mockContentData = [{ id: 1, content: "Point 1 content" }];

      let callCount = 0;
      (db.select as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return stubQuery(mockStancesData);
        } else if (callCount === 2) {
          return stubQuery(mockContentData);
        }
        return stubQuery([]);
      });

      const result = await computeContestedPoints({
        snapDay: "2024-01-15",
      });

      expect(result).toHaveLength(1);
      expect(db.select).toHaveBeenCalled();
    });
  });
});
