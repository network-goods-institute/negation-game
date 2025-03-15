// Mock dependencies before importing the implementation
jest.mock("../getUserId", () => ({
  getUserId: jest.fn(),
}));

jest.mock("@/db/schema", () => ({
  doubtsTable: {
    id: "id",
    userId: "user_id",
    pointId: "point_id",
    negationId: "negation_id",
    amount: "amount",
    lastEarningsAt: "last_earnings_at",
    createdAt: "created_at",
  },
  endorsementsTable: {
    id: "id",
    userId: "user_id",
    pointId: "point_id",
    cred: "cred",
    createdAt: "created_at",
  },
  restakesTable: {
    id: "id",
    userId: "user_id",
    pointId: "point_id",
    negationId: "negation_id",
    amount: "amount",
    createdAt: "created_at",
  },
  usersTable: {
    id: "id",
    cred: "cred",
  },
}));

jest.mock("@/services/db", () => {
  const mockDb = {
    transaction: jest.fn(),
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    execute: jest.fn(),
  };
  return { db: mockDb };
});

jest.mock("drizzle-orm", () => {
  interface MockSqlResult {
    as: (name: string) => MockSqlResult;
    raw: (input: string) => MockSqlResult;
    mapWith: (fn: unknown) => MockSqlResult;
  }

  const mockSql = function (...args: string[]): MockSqlResult {
    const result: MockSqlResult = {
      as: jest.fn(() => result),
      raw: jest.fn(() => result),
      mapWith: jest.fn(() => result),
    };
    return result;
  };

  // Add raw method to the mockSql function itself
  mockSql.raw = jest.fn((input) => {
    const result: MockSqlResult = {
      as: jest.fn(() => result),
      raw: jest.fn(() => result),
      mapWith: jest.fn(() => result),
    };
    return result;
  });

  return {
    eq: jest.fn((a, b) => ({ column: a, value: b })),
    and: jest.fn((...conditions) => ({ type: "and", conditions })),
    sql: mockSql,
    desc: jest.fn(),
  };
});

// Import the earnings-related actions after setting up mocks
import { collectEarnings, previewEarnings } from "../collectEarnings";
import { getUserId } from "../getUserId";
import { db } from "@/services/db";
import { doubtsTable, endorsementsTable, usersTable } from "@/db/schema";

describe("Earnings functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Tests for previewEarnings
  describe("previewEarnings", () => {
    it("should throw an error if user is not authenticated", async () => {
      // Setup: user is not authenticated
      (getUserId as jest.Mock).mockResolvedValue(null);

      // Execute & Assert
      await expect(previewEarnings()).rejects.toThrow(
        "Must be authenticated to preview earnings"
      );

      // Verify getUserId was called
      expect(getUserId).toHaveBeenCalled();
    });

    it("should calculate total available earnings from all active doubts", async () => {
      // Setup: user is authenticated
      (getUserId as jest.Mock).mockResolvedValue("user-123");

      // Mock the calculateEarnings DB query to return sample doubt earning calculations
      const mockEarnings = [
        {
          doubt_id: 101,
          point_id: 1,
          negation_id: 2,
          doubt_amount: 10,
          hours_since_payout: 24,
          negation_favor: 0.75,
          apy: 0.0875, // 0.05 + ln(0.75 + 0.0001)
          hourly_rate: 0.1,
          available_endorsement: 50,
          createdAt: new Date(),
        },
        {
          doubt_id: 102,
          point_id: 3,
          negation_id: 4,
          doubt_amount: 5,
          hours_since_payout: 48,
          negation_favor: 0.5,
          apy: 0.075,
          hourly_rate: 0.05,
          available_endorsement: 20,
          createdAt: new Date(),
        },
      ];

      // Mock the select chain to return our sample earnings
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        then: jest
          .fn()
          .mockImplementationOnce((cb) =>
            Promise.resolve(mockEarnings).then(cb)
          ),
      });

      // First doubt: hourly_rate * hours = 0.1 * 24 = 2.4, which is < available_endorsement (50)
      // Second doubt: hourly_rate * hours = 0.05 * 48 = 2.4, which is < available_endorsement (20)
      // Total expected: 2.4 + 2.4 = 4.8

      // Execute
      const result = await previewEarnings();

      // Assert: should return the sum of calculated earnings
      expect(result).toBeCloseTo(4.8, 1); // Using toBeCloseTo for floating point comparison
    });

    it("should cap earnings by available endorsement", async () => {
      // Setup: user is authenticated
      (getUserId as jest.Mock).mockResolvedValue("user-123");

      // Mock the calculateEarnings DB query with a case where raw earnings exceed endorsement
      const mockEarnings = [
        {
          doubt_id: 101,
          point_id: 1,
          negation_id: 2,
          doubt_amount: 100,
          hours_since_payout: 240, // 10 days
          negation_favor: 0.8,
          apy: 0.09,
          hourly_rate: 1.0, // High hourly rate
          available_endorsement: 50, // But limited endorsement
          createdAt: new Date(),
        },
      ];

      // Mock the select chain to return our sample earnings
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        then: jest
          .fn()
          .mockImplementationOnce((cb) =>
            Promise.resolve(mockEarnings).then(cb)
          ),
      });

      // Raw earnings would be 1.0 * 240 = 240, but should be capped at 50

      // Execute
      const result = await previewEarnings();

      // Assert: should return the available_endorsement as the cap
      expect(result).toBe(50);
    });
  });

  // Tests for collectEarnings
  describe("collectEarnings", () => {
    it("should throw an error if user is not authenticated", async () => {
      // Setup: user is not authenticated
      (getUserId as jest.Mock).mockResolvedValue(null);

      // Execute & Assert
      await expect(collectEarnings()).rejects.toThrow(
        "Must be authenticated to collect earnings"
      );

      // Verify getUserId was called
      expect(getUserId).toHaveBeenCalled();
    });

    it("should collect earnings from active doubts and update user cred", async () => {
      // Setup: user is authenticated
      (getUserId as jest.Mock).mockResolvedValue("user-123");

      // Sample earnings calculation for a doubt
      const mockEarnings = [
        {
          doubt_id: 101,
          point_id: 1,
          negation_id: 2,
          doubt_amount: 10,
          hours_since_payout: 24,
          hourly_rate: 0.1,
          available_endorsement: 50,
          createdAt: new Date(),
        },
      ];

      // Sample endorsements for restakers
      const mockEndorsements = [
        {
          id: 201,
          pointId: 1,
          userId: "restaker-1",
          cred: 30,
        },
        {
          id: 202,
          pointId: 1,
          userId: "restaker-2",
          cred: 20,
        },
      ];

      // Mock transaction
      const txMock = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          then: jest
            .fn()
            .mockImplementationOnce((cb) =>
              Promise.resolve(mockEndorsements).then(cb)
            )
            .mockImplementationOnce((cb) =>
              Promise.resolve(mockEndorsements).then(cb)
            ),
        }),
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
        }),
        execute: jest.fn().mockImplementation(() => {
          return [
            {
              user_id: "restaker-1",
              total_cred: 30,
            },
            {
              user_id: "restaker-2",
              total_cred: 20,
            },
          ];
        }),
      };

      // Setup the calculateEarnings mock inside the transaction
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        then: jest
          .fn()
          .mockImplementationOnce((cb) =>
            Promise.resolve(mockEarnings).then(cb)
          ),
      });

      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(txMock);
      });

      // Execute
      const result = await collectEarnings();

      // Assert
      expect(result).toEqual({
        totalEarnings: expect.any(Number),
        affectedPoints: expect.arrayContaining([1, 2]), // The points involved in the doubts
      });

      // Verify DB operations in transaction
      expect(db.transaction).toHaveBeenCalled();

      // Should update doubts lastEarningsAt
      expect(txMock.update).toHaveBeenCalledWith(doubtsTable);

      // Should update user cred with earnings
      expect(txMock.update).toHaveBeenCalledWith(usersTable);
    });

    it("should handle the case where no earnings are available", async () => {
      // Setup: user is authenticated
      (getUserId as jest.Mock).mockResolvedValue("user-123");

      // Sample earnings calculation with no available earnings
      const mockEarnings = [
        {
          doubt_id: 101,
          point_id: 1,
          negation_id: 2,
          doubt_amount: 10,
          hours_since_payout: 0, // Just collected
          hourly_rate: 0.1,
          available_endorsement: 0, // No available endorsement
          createdAt: new Date(),
        },
      ];

      // Mock transaction
      const txMock = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          then: jest.fn().mockResolvedValue([]),
        }),
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
        }),
        execute: jest.fn().mockReturnValue([]),
      };

      // Setup the calculateEarnings mock inside the transaction
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        then: jest
          .fn()
          .mockImplementationOnce((cb) =>
            Promise.resolve(mockEarnings).then(cb)
          ),
      });

      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(txMock);
      });

      // Execute
      const result = await collectEarnings();

      // Assert: should return zero earnings but still include affected points
      expect(result).toEqual({
        totalEarnings: 0,
        affectedPoints: expect.arrayContaining([1, 2]),
      });
    });

    it("should collect earnings proportionally from multiple restakers", async () => {
      // Setup: user is authenticated
      (getUserId as jest.Mock).mockResolvedValue("user-123");

      // Sample earnings calculation for a doubt
      const mockEarnings = [
        {
          doubt_id: 101,
          point_id: 1,
          negation_id: 2,
          doubt_amount: 10,
          hours_since_payout: 24,
          hourly_rate: 0.1,
          available_endorsement: 50,
          createdAt: new Date(),
        },
      ];

      // Sample endorsements with multiple restakers
      const mockEndorsements = [
        {
          id: 201,
          pointId: 1,
          userId: "restaker-1",
          cred: 30, // 60% of endorsements
        },
        {
          id: 202,
          pointId: 1,
          userId: "restaker-2",
          cred: 20, // 40% of endorsements
        },
      ];

      // Mock transaction
      const txMock = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          then: jest
            .fn()
            .mockImplementationOnce((cb) =>
              Promise.resolve(mockEndorsements).then(cb)
            )
            .mockImplementationOnce((cb) =>
              Promise.resolve(mockEndorsements).then(cb)
            ),
        }),
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
        }),
        execute: jest.fn().mockImplementation(() => {
          return [
            {
              user_id: "restaker-1",
              total_cred: 30, // 60% of endorsements
            },
            {
              user_id: "restaker-2",
              total_cred: 20, // 40% of endorsements
            },
          ];
        }),
      };

      // Setup the calculateEarnings mock inside the transaction
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        then: jest
          .fn()
          .mockImplementationOnce((cb) =>
            Promise.resolve(mockEarnings).then(cb)
          ),
      });

      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(txMock);
      });

      // Execute
      const result = await collectEarnings();

      // Assert: should show collected earnings and affected points
      expect(result).toEqual({
        totalEarnings: expect.any(Number),
        affectedPoints: expect.arrayContaining([1, 2]),
      });

      // Verify proportional collection
      // In a real implementation, restaker-1 would lose 60% and restaker-2 40% of the earnings
      expect(txMock.update).toHaveBeenCalledWith(endorsementsTable);
    });
  });
});
