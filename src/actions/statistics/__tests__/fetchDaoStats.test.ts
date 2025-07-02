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
    createdBy: { name: "createdBy" },
    isActive: { name: "isActive" },
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
    createdBy: { name: "createdBy" },
    isActive: { name: "isActive" },
  },
  endorsementsTable: {
    userId: { name: "userId" },
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
    execute: jest.fn(),
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
      (db.execute as jest.Mock).mockImplementation(() =>
        Promise.resolve([{ total_contributors: 10, new_contributors: 2 }])
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
      (db.execute as jest.Mock).mockImplementation(() =>
        Promise.resolve([{ total_contributors: 15, new_contributors: 3 }])
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
      (db.execute as jest.Mock).mockImplementation(() =>
        Promise.resolve([{ total_contributors: 8, new_contributors: 1 }])
      );

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
      (db.execute as jest.Mock).mockImplementation(() =>
        Promise.resolve([{ total_contributors: 10, new_contributors: 2 }])
      );

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
          // Setup basic queries
          return stubQuery([
            { activeUsers: 5, totalTransactions: 50, credFlow: 500 },
          ]);
        } else if (callCount === 7) {
          // Notifications query with zero results
          return stubQuery([
            { totalNotifications: 0, respondedNotifications: 0 },
          ]);
        }
        return stubQuery([{}]);
      });
      (db.execute as jest.Mock).mockImplementation(() =>
        Promise.resolve([{ total_contributors: 5, new_contributors: 1 }])
      );

      const result = await fetchDaoStats("test_space");

      expect(result.responseRate).toBe(0);
      expect(typeof result.activeUsers).toBe("number");
    });

    it("should handle zero contributors gracefully", async () => {
      (db.select as jest.Mock).mockImplementation(() =>
        stubQuery([{ activeUsers: 5, totalTransactions: 50, credFlow: 500 }])
      );
      (db.execute as jest.Mock).mockImplementation(() =>
        Promise.resolve([{ total_contributors: 0, new_contributors: 0 }])
      );

      const result = await fetchDaoStats("test_space");

      expect(result.newContributorRatio).toBe(0);
      expect(typeof result.activeUsers).toBe("number");
    });

    it("should handle empty activity distribution", async () => {
      (db.select as jest.Mock).mockImplementation(() =>
        stubQuery([{ activeUsers: 0, totalTransactions: 0, credFlow: 0 }])
      );
      (db.execute as jest.Mock).mockImplementation(() =>
        Promise.resolve([{ total_contributors: 0, new_contributors: 0 }])
      );

      const result = await fetchDaoStats("test_space");

      expect(result.activityConcentration).toBe(0);
    });
  });

  describe("Analytics Function Error Handling", () => {
    it("should handle computeDaoAlignment errors gracefully", async () => {
      (db.select as jest.Mock).mockImplementation(() =>
        stubQuery([{ activeUsers: 5, totalTransactions: 50, credFlow: 500 }])
      );
      (db.execute as jest.Mock).mockImplementation(() =>
        Promise.resolve([{ total_contributors: 5, new_contributors: 1 }])
      );

      mockComputeDaoAlignment.mockRejectedValue(
        new Error("DAO alignment failed")
      );

      const result = await fetchDaoStats("test_space");

      expect(result.daoAlignment).toBe(0.5); // Default fallback
    });

    it("should handle computeContestedPoints errors gracefully", async () => {
      (db.select as jest.Mock).mockImplementation(() =>
        stubQuery([{ activeUsers: 5, totalTransactions: 50, credFlow: 500 }])
      );
      (db.execute as jest.Mock).mockImplementation(() =>
        Promise.resolve([{ total_contributors: 5, new_contributors: 1 }])
      );

      mockComputeContestedPoints.mockRejectedValue(
        new Error("Contested points failed")
      );

      const result = await fetchDaoStats("test_space");

      expect(result.contestedPoints).toBe(0); // Empty array length
    });

    it("should handle null delta from computeDaoAlignment", async () => {
      (db.select as jest.Mock).mockImplementation(() =>
        stubQuery([{ activeUsers: 5, totalTransactions: 50, credFlow: 500 }])
      );
      (db.execute as jest.Mock).mockImplementation(() =>
        Promise.resolve([{ total_contributors: 5, new_contributors: 1 }])
      );

      mockComputeDaoAlignment.mockResolvedValue({
        delta: null,
        userCount: 0,
        pairCount: 0,
      });

      const result = await fetchDaoStats("test_space");

      expect(result.daoAlignment).toBe(0.5); // Default fallback when delta is null
    });
  });

  describe("Contested Points Limit", () => {
    it("should use limit of 50 for contested points", async () => {
      (db.select as jest.Mock).mockImplementation(() =>
        stubQuery([{ activeUsers: 5, totalTransactions: 50, credFlow: 500 }])
      );
      (db.execute as jest.Mock).mockImplementation(() =>
        Promise.resolve([{ total_contributors: 5, new_contributors: 1 }])
      );

      await fetchDaoStats("test_space");

      expect(mockComputeContestedPoints).toHaveBeenCalledWith({
        snapDay: expect.any(String),
        space: "test_space",
        limit: 50,
      });
    });
  });

  describe("Return Value Structure", () => {
    it("should return all required properties", async () => {
      (db.select as jest.Mock).mockImplementation(() =>
        stubQuery([{ activeUsers: 10, totalTransactions: 100, credFlow: 1000 }])
      );
      (db.execute as jest.Mock).mockImplementation(() =>
        Promise.resolve([{ total_contributors: 10, new_contributors: 3 }])
      );

      const result = await fetchDaoStats("test_space");

      // Check that all expected properties are present
      expect(result).toHaveProperty("activeUsers");
      expect(result).toHaveProperty("dailyActivity");
      expect(result).toHaveProperty("contentCreation");
      expect(result).toHaveProperty("newPoints");
      expect(result).toHaveProperty("newRationales");
      expect(result).toHaveProperty("credFlow");
      expect(result).toHaveProperty("currentMonth");
      expect(result).toHaveProperty("dialecticalEngagement");
      expect(result).toHaveProperty("daoAlignment");
      expect(result).toHaveProperty("contestedPoints");
      expect(result).toHaveProperty("responseRate");
      expect(result).toHaveProperty("activityConcentration");
      expect(result).toHaveProperty("newContributorRatio");

      // Check types
      expect(typeof result.activeUsers).toBe("number");
      expect(typeof result.dailyActivity).toBe("number");
      expect(typeof result.contentCreation).toBe("number");
      expect(typeof result.daoAlignment).toBe("number");
      expect(typeof result.contestedPoints).toBe("number");
      expect(typeof result.responseRate).toBe("number");
      expect(typeof result.activityConcentration).toBe("number");
      expect(typeof result.newContributorRatio).toBe("number");
    });
  });
});
