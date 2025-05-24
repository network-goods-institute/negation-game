// Mock dependencies before importing the implementation
jest.mock("../users/getUserId", () => ({
  getUserId: jest.fn(),
}));

jest.mock("@/db/schema", () => ({
  restakesTable: {
    id: "id",
    userId: "user_id",
    pointId: "point_id",
    negationId: "negation_id",
    amount: "amount",
    createdAt: "created_at",
  },
  restakeHistoryTable: {
    restakeId: "restake_id",
    userId: "user_id",
    pointId: "point_id",
    negationId: "negation_id",
    action: "action",
    previousAmount: "previous_amount",
    newAmount: "new_amount",
  },
  slashesTable: {
    id: "id",
    userId: "user_id",
    restakeId: "restake_id",
    pointId: "point_id",
    negationId: "negation_id",
    amount: "amount",
    createdAt: "created_at",
  },
  slashHistoryTable: {
    slashId: "slash_id",
    userId: "user_id",
    pointId: "point_id",
    negationId: "negation_id",
    action: "action",
    previousAmount: "previous_amount",
    newAmount: "new_amount",
  },
  doubtsTable: {},
  doubtHistoryTable: {},
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

  return {
    eq: jest.fn((a, b) => ({ column: a, value: b })),
    and: jest.fn((...conditions) => ({ type: "and", conditions })),
    sql: mockSql,
    desc: jest.fn(),
  };
});

// Import the slash action after setting up mocks
import { slash } from "../epistemic/slash";
import { getUserId } from "../users/getUserId";
import { db } from "@/services/db";
import {
  restakesTable,
  slashesTable,
  slashHistoryTable,
  restakeHistoryTable,
} from "@/db/schema";

describe("slash", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw an error if user is not authenticated", async () => {
    (getUserId as jest.Mock).mockResolvedValue(null);

    await expect(
      slash({ pointId: 123, negationId: 456, amount: 10 })
    ).rejects.toThrow("Must be authenticated to slash");

    expect(getUserId).toHaveBeenCalled();
  });

  it("should throw an error if no active restake is found to slash", async () => {
    (getUserId as jest.Mock).mockResolvedValue("user-123");

    // Setup transaction mock
    const txMock = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        then: jest
          .fn()
          .mockImplementationOnce((cb) => Promise.resolve([]).then(cb)),
      }),
      execute: jest.fn(),
    };
    (db.transaction as jest.Mock).mockImplementationOnce(
      async (callback) => await callback(txMock)
    );

    await expect(
      slash({ pointId: 123, negationId: 456, amount: 10 })
    ).rejects.toThrow("No active restake found to slash");
  });

  it("should update an existing slash if found", async () => {
    (getUserId as jest.Mock).mockResolvedValue("user-123");

    // Simulate active restake exists and existing slash
    const activeRestake = {
      id: 789,
      userId: "user-123",
      pointId: 123,
      negationId: 456,
      amount: 50,
      createdAt: new Date(),
    };

    const existingSlash = {
      id: 555,
      amount: 20,
      createdAt: new Date(),
    };

    // Setup transaction mock
    const txMock = {
      select: jest
        .fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          then: jest
            .fn()
            .mockImplementationOnce((cb) =>
              Promise.resolve([activeRestake]).then(cb)
            ),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          then: jest
            .fn()
            .mockImplementationOnce((cb) =>
              Promise.resolve([existingSlash]).then(cb)
            ),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          then: jest
            .fn()
            .mockImplementationOnce((cb) =>
              Promise.resolve([{ createdAt: new Date() }]).then(cb)
            ),
        }),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnThis(),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
      }),
      execute: jest
        .fn()
        .mockImplementationOnce(() => Promise.resolve([]))
        .mockImplementationOnce(() =>
          Promise.resolve([{ created_at: new Date() }])
        ),
    };
    (db.transaction as jest.Mock).mockImplementationOnce(
      async (callback) => await callback(txMock)
    );

    // Call the slash action
    const result = await slash({ pointId: 123, negationId: 456, amount: 30 });
    expect(result).toBe(existingSlash.id);
  });

  it("should create a new slash if none exists", async () => {
    (getUserId as jest.Mock).mockResolvedValue("user-123");

    // Simulate active restake exists but no existing slash
    const activeRestake = {
      id: 789,
      userId: "user-123",
      pointId: 123,
      negationId: 456,
      amount: 50,
      createdAt: new Date(),
    };

    // Setup transaction mock
    const txMock = {
      select: jest
        .fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          then: jest
            .fn()
            .mockImplementationOnce((cb) =>
              Promise.resolve([activeRestake]).then(cb)
            ),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          then: jest
            .fn()
            .mockImplementationOnce((cb) => Promise.resolve([]).then(cb)),
        }),
      insert: jest
        .fn()
        .mockReturnValueOnce({
          values: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([{ id: 101 }]),
        })
        .mockReturnValueOnce({
          values: jest.fn().mockReturnThis(),
        }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
      }),
      execute: jest.fn().mockImplementation(() => Promise.resolve([])),
    };
    (db.transaction as jest.Mock).mockImplementationOnce(
      async (callback) => await callback(txMock)
    );

    // Call the slash action
    const result = await slash({ pointId: 123, negationId: 456, amount: 30 });
    expect(result).toBe(101);
  });
});
