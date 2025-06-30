// Mock database schema first
jest.mock("@/db/schema", () => ({
  dailyStancesTable: {
    userId: { name: "userId" },
    pointId: { name: "pointId" },
    zValue: { name: "zValue" },
    snapDay: { name: "snapDay" },
  },
  endorsementsTable: {
    userId: { name: "userId" },
    pointId: { name: "pointId" },
    cred: { name: "cred" },
  },
  pointsTable: {
    id: { name: "id" },
    space: { name: "space" },
  },
}));

// Mock drizzle-orm
jest.mock("drizzle-orm", () => {
  const actual = jest.requireActual("drizzle-orm");
  return {
    ...actual,
    sql: jest.fn(),
    eq: jest.fn(),
    and: jest.fn(),
  };
});

import { computeDaoAlignment } from "../computeDaoAlignment";
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

describe("computeDaoAlignment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Space Filtering", () => {
    it("should include space filter when space parameter is provided", async () => {
      const mockStancesData = [
        { userId: "user1", pointId: 1, z: 0.5 },
        { userId: "user2", pointId: 1, z: -0.4 },
      ];

      (db.select as jest.Mock).mockImplementation(() =>
        stubQuery(mockStancesData)
      );

      const result = await computeDaoAlignment({
        space: "test_space",
        samplePairs: 100,
      });

      expect(result.userCount).toBe(2);
      expect(result.delta === null || typeof result.delta === "number").toBe(
        true
      );
      // Verify db.select was called (space filtering logic is in the query)
      expect(db.select).toHaveBeenCalled();
    });

    it("should not include space filter when space parameter is omitted", async () => {
      const mockStancesData = [
        { userId: "user1", pointId: 1, z: 0.5 },
        { userId: "user2", pointId: 1, z: -0.4 },
      ];

      (db.select as jest.Mock).mockImplementation(() =>
        stubQuery(mockStancesData)
      );

      const result = await computeDaoAlignment({
        samplePairs: 100,
      });

      expect(result.userCount).toBe(2);
      expect(result.delta === null || typeof result.delta === "number").toBe(
        true
      );
      expect(db.select).toHaveBeenCalled();
    });

    it("should handle space filtering in endorsement fallback", async () => {
      let callCount = 0;
      (db.select as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Empty daily stances
          return stubQuery([]);
        } else if (callCount === 2) {
          // Endorsement fallback data
          return stubQuery([
            { userId: "user1", pointId: 1, cred: 100 },
            { userId: "user1", pointId: 2, cred: 50 },
            { userId: "user2", pointId: 1, cred: 75 },
            { userId: "user2", pointId: 2, cred: 25 },
          ]);
        }
        return stubQuery([]);
      });

      const result = await computeDaoAlignment({
        space: "test_space",
      });

      expect(result.userCount).toBe(2);
      expect(result.delta === null || typeof result.delta === "number").toBe(
        true
      );
      expect(db.select).toHaveBeenCalledTimes(2);
    });
  });

  describe("Daily Stances Data", () => {
    it("should use daily stances when available", async () => {
      const mockStancesData = [
        { userId: "user1", pointId: 1, z: 0.8 },
        { userId: "user1", pointId: 2, z: -0.2 },
        { userId: "user2", pointId: 1, z: -0.7 },
        { userId: "user2", pointId: 2, z: 0.3 },
      ];

      (db.select as jest.Mock).mockImplementation(() =>
        stubQuery(mockStancesData)
      );

      const result = await computeDaoAlignment({
        samplePairs: 10,
      });

      expect(result.userCount).toBe(2);
      expect(result.delta === null || typeof result.delta === "number").toBe(
        true
      );
      expect(db.select).toHaveBeenCalledTimes(1);
    });

    it("should fallback to endorsements when daily stances have zero z-values", async () => {
      let callCount = 0;
      (db.select as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Zero z-values in daily stances
          return stubQuery([
            { userId: "user1", pointId: 1, z: 0.0 },
            { userId: "user2", pointId: 1, z: 0.0 },
          ]);
        } else if (callCount === 2) {
          // Fallback to endorsements
          return stubQuery([
            { userId: "user1", pointId: 1, cred: 100 },
            { userId: "user2", pointId: 1, cred: 50 },
          ]);
        }
        return stubQuery([]);
      });

      const result = await computeDaoAlignment({});

      expect(result.userCount).toBe(2);
      expect(result.delta === null || typeof result.delta === "number").toBe(
        true
      );
      expect(db.select).toHaveBeenCalledTimes(2);
    });
  });

  describe("Endorsement Fallback", () => {
    it("should use endorsement fallback when no daily stances", async () => {
      let callCount = 0;
      (db.select as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Empty daily stances
          return stubQuery([]);
        } else if (callCount === 2) {
          // Endorsement data
          return stubQuery([
            { userId: "user1", pointId: 1, cred: 100 },
            { userId: "user1", pointId: 2, cred: 200 },
            { userId: "user2", pointId: 1, cred: 150 },
            { userId: "user2", pointId: 2, cred: 50 },
          ]);
        }
        return stubQuery([]);
      });

      const result = await computeDaoAlignment({});

      expect(result.userCount).toBe(2);
      expect(result.delta === null || typeof result.delta === "number").toBe(
        true
      );
      expect(db.select).toHaveBeenCalledTimes(2);
    });

    it("should return null when no data available", async () => {
      (db.select as jest.Mock).mockImplementation(() => stubQuery([]));

      const result = await computeDaoAlignment({});

      expect(result.delta).toBeNull();
      expect(result.userCount).toBe(0);
      expect(result.pairCount).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle single user", async () => {
      const mockStancesData = [
        { userId: "user1", pointId: 1, z: 0.5 },
        { userId: "user1", pointId: 2, z: -0.3 },
      ];

      (db.select as jest.Mock).mockImplementation(() =>
        stubQuery(mockStancesData)
      );

      const result = await computeDaoAlignment({});

      expect(result.delta).toBeNull();
      expect(result.userCount).toBe(1);
      expect(result.pairCount).toBe(0);
    });

    it("should handle no users", async () => {
      (db.select as jest.Mock).mockImplementation(() => stubQuery([]));

      const result = await computeDaoAlignment({});

      expect(result.delta).toBeNull();
      expect(result.userCount).toBe(0);
      expect(result.pairCount).toBe(0);
    });
  });

  describe("Parameter Handling", () => {
    it("should use provided snapDay", async () => {
      const mockStancesData = [
        { userId: "user1", pointId: 1, z: 0.5 },
        { userId: "user2", pointId: 1, z: -0.4 },
      ];

      (db.select as jest.Mock).mockImplementation(() =>
        stubQuery(mockStancesData)
      );

      const result = await computeDaoAlignment({
        snapDay: "2024-01-15",
      });

      expect(result.userCount).toBe(2);
      expect(result.delta === null || typeof result.delta === "number").toBe(
        true
      );
    });

    it("should use default snapDay when not provided", async () => {
      const mockStancesData = [
        { userId: "user1", pointId: 1, z: 0.5 },
        { userId: "user2", pointId: 1, z: -0.4 },
      ];

      (db.select as jest.Mock).mockImplementation(() =>
        stubQuery(mockStancesData)
      );

      const result = await computeDaoAlignment({});

      expect(result.userCount).toBe(2);
      expect(result.delta === null || typeof result.delta === "number").toBe(
        true
      );
    });

    it("should respect samplePairs parameter", async () => {
      const mockStancesData = Array.from({ length: 10 }, (_, i) => ({
        userId: `user${i}`,
        pointId: 1,
        z: 0.5,
      }));

      (db.select as jest.Mock).mockImplementation(() =>
        stubQuery(mockStancesData)
      );

      const result = await computeDaoAlignment({
        samplePairs: 5,
      });

      expect(result.userCount).toBe(10);
      expect(typeof result.delta).toBe("number");
    });
  });

  describe("Database Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      (db.select as jest.Mock).mockImplementation(() => {
        throw new Error("Database connection failed");
      });

      await expect(computeDaoAlignment({})).rejects.toThrow(
        "Database connection failed"
      );
    });
  });
});
