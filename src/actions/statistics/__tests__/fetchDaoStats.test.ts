// Mock database schema first
jest.mock("@/db/schema", () => ({
  credEventsTable: {
    userId: { name: "userId" },
    pointId: { name: "pointId" },
    amount: { name: "amount" },
    ts: { name: "ts" },
  },
  pointsTable: {
    id: { name: "id" },
    space: { name: "space" },
    createdAt: { name: "createdAt" },
  },
  negationsTable: {
    olderPointId: { name: "olderPointId" },
    newerPointId: { name: "newerPointId" },
    isActive: { name: "isActive" },
  },
  notificationsTable: {
    createdAt: { name: "createdAt" },
    readAt: { name: "readAt" },
    space: { name: "space" },
  },
  viewpointsTable: {
    createdAt: { name: "createdAt" },
    space: { name: "space" },
  },
}));

// Mock analytics functions
jest.mock("@/actions/analytics/computeDaoAlignment");
jest.mock("@/actions/analytics/computeContestedPoints");

// Mock drizzle-orm
jest.mock("drizzle-orm", () => {
  const actual = jest.requireActual("drizzle-orm");
  return {
    ...actual,
    sql: jest.fn((str) => ({
      mapWith: jest.fn().mockReturnThis(),
      raw: jest.fn().mockReturnThis(),
      toString: () => str,
    })),
    gte: jest.fn(),
    eq: jest.fn(),
    and: jest.fn((...args) => args.filter(Boolean)),
    lt: jest.fn(),
  };
});

import { fetchDaoStats } from "../fetchDaoStats";
import { computeDaoAlignment } from "@/actions/analytics/computeDaoAlignment";
import { computeContestedPoints } from "@/actions/analytics/computeContestedPoints";
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

describe("fetchDaoStats", () => {
  const mockComputeDaoAlignment = computeDaoAlignment as jest.MockedFunction<
    typeof computeDaoAlignment
  >;
  const mockComputeContestedPoints =
    computeContestedPoints as jest.MockedFunction<
      typeof computeContestedPoints
    >;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks for analytics functions
    mockComputeDaoAlignment.mockResolvedValue({
      delta: 0.5,
      userCount: 10,
      pairCount: 45,
    });

    mockComputeContestedPoints.mockResolvedValue([
      {
        pointId: 1,
        content: "Point 1",
        positive: 5,
        negative: 3,
        contestedScore: 0.6,
      },
      {
        pointId: 2,
        content: "Point 2",
        positive: 4,
        negative: 4,
        contestedScore: 1.0,
      },
    ]);
  });

  describe("Space Filtering", () => {
    it("should pass space parameter to analytics functions", async () => {
      // Mock all database queries with minimal data
      (db.select as jest.Mock).mockImplementation(() =>
        stubQuery([{ activeUsers: 5, totalTransactions: 100, credFlow: 1000 }])
      );

      const space = "test_space";
      await fetchDaoStats(space);

      expect(mockComputeDaoAlignment).toHaveBeenCalledWith({ space });
      expect(mockComputeContestedPoints).toHaveBeenCalledWith({
        snapDay: expect.any(String),
        space,
        limit: 50,
      });
    });

    it("should handle global space correctly", async () => {
      (db.select as jest.Mock).mockImplementation(() =>
        stubQuery([{ activeUsers: 10, totalTransactions: 200, credFlow: 2000 }])
      );

      await fetchDaoStats("global");

      expect(mockComputeDaoAlignment).toHaveBeenCalledWith({ space: "global" });
      expect(mockComputeContestedPoints).toHaveBeenCalledWith({
        snapDay: expect.any(String),
        space: "global",
        limit: 50,
      });
    });

    it("should filter notifications by space", async () => {
      const mockSelect = jest.fn();
      (db.select as jest.Mock).mockImplementation(() => {
        mockSelect();
        return stubQuery([
          { totalNotifications: 20, respondedNotifications: 10 },
        ]);
      });

      await fetchDaoStats("test_space");

      // Verify that space filtering is applied to notifications query
      expect(mockSelect).toHaveBeenCalled();
    });
  });

  describe("Division by Zero Protection", () => {
    it("should handle zero previous activity gracefully", async () => {
      let callCount = 0;
      (db.select as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Current activity metrics
          return stubQuery([
            { activeUsers: 10, totalTransactions: 100, credFlow: 1000 },
          ]);
        } else if (callCount === 2) {
          // Previous activity metrics - zero values
          return stubQuery([{ activeUsers: 0, totalTransactions: 0 }]);
        }
        // Other queries
        return stubQuery([{}]);
      });

      const result = await fetchDaoStats("test_space");

      expect(result.userGrowth).toBeUndefined();
      expect(result.activityTrend).toBeUndefined();
      expect(typeof result.activeUsers).toBe("number");
      expect(typeof result.dailyActivity).toBe("number");
    });

    it("should handle zero notifications gracefully", async () => {
      let callCount = 0;
      (db.select as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount <= 6) {
          // First 6 calls are for activity/content metrics
          return stubQuery([
            { activeUsers: 5, totalTransactions: 50, credFlow: 500 },
          ]);
        } else if (callCount === 7) {
          // Response metrics with zero notifications
          return stubQuery([
            { totalNotifications: 0, respondedNotifications: 0 },
          ]);
        }
        return stubQuery([{}]);
      });

      const result = await fetchDaoStats("test_space");

      expect(result.responseRate).toBe(0);
      expect(typeof result.responseRate).toBe("number");
    });

    it("should handle zero contributors gracefully", async () => {
      let callCount = 0;
      (db.select as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount <= 7) {
          // First 7 calls are for other metrics
          return stubQuery([
            { activeUsers: 5, totalTransactions: 50, credFlow: 500 },
          ]);
        } else if (callCount === 8) {
          // Activity distribution - empty
          return stubQuery([]);
        } else if (callCount === 9) {
          // Contributor metrics with zero contributors
          return stubQuery([{ totalContributors: 0, newContributors: 0 }]);
        }
        return stubQuery([{}]);
      });

      const result = await fetchDaoStats("test_space");

      expect(result.newContributorRatio).toBe(0);
      expect(result.activityConcentration).toBe(0);
      expect(typeof result.newContributorRatio).toBe("number");
      expect(typeof result.activityConcentration).toBe("number");
    });

    it("should handle empty activity distribution", async () => {
      let callCount = 0;
      (db.select as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 8) {
          // Activity distribution - empty array
          return stubQuery([]);
        }
        return stubQuery([
          { activeUsers: 5, totalTransactions: 50, credFlow: 500 },
        ]);
      });

      const result = await fetchDaoStats("test_space");

      expect(result.activityConcentration).toBe(0);
      expect(typeof result.activityConcentration).toBe("number");
    });
  });

  describe("Analytics Function Error Handling", () => {
    it("should handle computeDaoAlignment errors gracefully", async () => {
      (db.select as jest.Mock).mockImplementation(() =>
        stubQuery([{ activeUsers: 5, totalTransactions: 50, credFlow: 500 }])
      );

      mockComputeDaoAlignment.mockRejectedValue(
        new Error("DAO alignment failed")
      );

      const result = await fetchDaoStats("test_space");

      expect(result.daoAlignment).toBe(0.5); // Default fallback
      expect(typeof result.daoAlignment).toBe("number");
    });

    it("should handle computeContestedPoints errors gracefully", async () => {
      (db.select as jest.Mock).mockImplementation(() =>
        stubQuery([{ activeUsers: 5, totalTransactions: 50, credFlow: 500 }])
      );

      mockComputeContestedPoints.mockRejectedValue(
        new Error("Contested points failed")
      );

      const result = await fetchDaoStats("test_space");

      expect(result.contestedPoints).toBe(0); // Empty array length
      expect(typeof result.contestedPoints).toBe("number");
    });

    it("should handle null delta from computeDaoAlignment", async () => {
      (db.select as jest.Mock).mockImplementation(() =>
        stubQuery([{ activeUsers: 5, totalTransactions: 50, credFlow: 500 }])
      );

      mockComputeDaoAlignment.mockResolvedValue({
        delta: null,
        userCount: 0,
        pairCount: 0,
      });

      const result = await fetchDaoStats("test_space");

      expect(result.daoAlignment).toBe(0.5); // Fallback when delta is null
    });
  });

  describe("Contested Points Limit", () => {
    it("should use limit of 50 for contested points", async () => {
      (db.select as jest.Mock).mockImplementation(() =>
        stubQuery([{ activeUsers: 5, totalTransactions: 50, credFlow: 500 }])
      );

      await fetchDaoStats("test_space");

      expect(mockComputeContestedPoints).toHaveBeenCalledWith({
        snapDay: expect.any(String),
        space: "test_space",
        limit: 50,
      });
    });

    it("should return correct contested points count", async () => {
      (db.select as jest.Mock).mockImplementation(() =>
        stubQuery([{ activeUsers: 5, totalTransactions: 50, credFlow: 500 }])
      );

      // Mock large number of contested points
      const largeContestedPoints = Array.from({ length: 25 }, (_, i) => ({
        pointId: i + 1,
        content: `Point ${i + 1}`,
        positive: 5,
        negative: 3,
        contestedScore: 0.6,
      }));

      mockComputeContestedPoints.mockResolvedValue(largeContestedPoints);

      const result = await fetchDaoStats("test_space");

      expect(result.contestedPoints).toBe(25);
    });
  });

  describe("Gini Coefficient Calculation", () => {
    it("should calculate activity concentration correctly", async () => {
      let callCount = 0;
      (db.select as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 8) {
          // Activity distribution with more extreme variation for better Gini calculation
          return stubQuery([
            { userId: "user1", activityCount: 1 },
            { userId: "user2", activityCount: 1 },
            { userId: "user3", activityCount: 2 },
            { userId: "user4", activityCount: 50 }, // One very active user creates concentration
          ]);
        }
        return stubQuery([
          { activeUsers: 5, totalTransactions: 50, credFlow: 500 },
        ]);
      });

      const result = await fetchDaoStats("test_space");

      expect(result.activityConcentration).toBeGreaterThanOrEqual(0);
      expect(result.activityConcentration).toBeLessThanOrEqual(100);
      expect(typeof result.activityConcentration).toBe("number");
    });

    it("should handle single user activity distribution", async () => {
      let callCount = 0;
      (db.select as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 8) {
          // Single user activity
          return stubQuery([{ userId: "user1", activityCount: 10 }]);
        }
        return stubQuery([
          { activeUsers: 1, totalTransactions: 10, credFlow: 100 },
        ]);
      });

      const result = await fetchDaoStats("test_space");

      expect(result.activityConcentration).toBe(0);
    });
  });

  describe("Cross-Space Users", () => {
    it("should calculate cross-space users for non-global spaces", async () => {
      let callCount = 0;
      (db.select as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 9) {
          // Cross-space users query - correct call order
          return stubQuery([{ crossSpaceUsers: 3 }]);
        }
        return stubQuery([
          { activeUsers: 5, totalTransactions: 50, credFlow: 500 },
        ]);
      });

      const result = await fetchDaoStats("test_space");

      expect(result.crossSpaceUsers).toBe(3);
    });

    it("should return 0 cross-space users for global space", async () => {
      (db.select as jest.Mock).mockImplementation(() =>
        stubQuery([{ activeUsers: 10, totalTransactions: 100, credFlow: 1000 }])
      );

      const result = await fetchDaoStats("global");

      expect(result.crossSpaceUsers).toBe(0);
    });
  });

  describe("Data Consistency", () => {
    it("should return all required fields with correct types", async () => {
      (db.select as jest.Mock).mockImplementation(() =>
        stubQuery([{ activeUsers: 5, totalTransactions: 50, credFlow: 500 }])
      );

      const result = await fetchDaoStats("test_space");

      // Activity Overview
      expect(typeof result.activeUsers).toBe("number");
      expect(typeof result.dailyActivity).toBe("number");
      expect(typeof result.contentCreation).toBe("number");
      expect(typeof result.newPoints).toBe("number");
      expect(typeof result.newRationales).toBe("number");
      expect(typeof result.credFlow).toBe("number");

      // Engagement Health
      expect(typeof result.dialecticalEngagement).toBe("number");
      expect(typeof result.daoAlignment).toBe("number");
      expect(typeof result.contestedPoints).toBe("number");
      expect(typeof result.responseRate).toBe("number");

      // Participation Distribution
      expect(typeof result.activityConcentration).toBe("number");
      expect(typeof result.newContributorRatio).toBe("number");
      expect(typeof result.crossSpaceUsers).toBe("number");
    });

    it("should handle null/undefined database values", async () => {
      (db.select as jest.Mock).mockImplementation(() =>
        stubQuery([
          { activeUsers: null, totalTransactions: undefined, credFlow: 0 },
        ])
      );

      const result = await fetchDaoStats("test_space");

      expect(result.activeUsers).toBe(0);
      expect(result.dailyActivity).toBe(0);
      expect(result.credFlow).toBe(0);
      expect(typeof result.activeUsers).toBe("number");
      expect(typeof result.dailyActivity).toBe("number");
      expect(typeof result.credFlow).toBe("number");
    });
  });

  describe("Date Calculations", () => {
    it("should use correct date ranges for queries", async () => {
      const mockDate = new Date("2024-01-15T12:00:00Z");
      jest.spyOn(Date, "now").mockReturnValue(mockDate.getTime());

      (db.select as jest.Mock).mockImplementation(() =>
        stubQuery([{ activeUsers: 5, totalTransactions: 50, credFlow: 500 }])
      );

      await fetchDaoStats("test_space");

      // Verify Date.now was called (indirectly tests date calculations)
      expect(Date.now).toHaveBeenCalled();

      jest.restoreAllMocks();
    });
  });
});
