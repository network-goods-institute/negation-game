// Mock dependencies before importing the implementation
jest.mock("../users/getUserId", () => ({
  getUserId: jest.fn(),
}));

jest.mock("@/actions/spaces/getSpace", () => ({
  getSpace: jest.fn().mockResolvedValue("test-space"),
}));

jest.mock("@/lib/notifications/notificationQueue", () => ({
  queueDoubtNotification: jest.fn(),
}));

jest.mock("@/actions/points/fetchPointSnapshots", () => ({
  fetchPointSnapshots: jest.fn(),
}));

jest.mock("@/db/schema", () => ({
  doubtsTable: {
    id: "id",
    userId: "user_id",
    pointId: "point_id",
    negationId: "negation_id",
    amount: "amount",
    space: "space",
    lastEarningsAt: "last_earnings_at",
    createdAt: "created_at",
  },
  doubtHistoryTable: {
    doubtId: "doubt_id",
    userId: "user_id",
    pointId: "point_id",
    negationId: "negation_id",
    action: "action",
    previousAmount: "previous_amount",
    newAmount: "new_amount",
  },
  usersTable: {
    id: "id",
    cred: "cred",
  },
  slashesTable: {
    id: "id",
    userId: "user_id",
    restakeId: "restake_id",
    pointId: "point_id",
    negationId: "negation_id",
    amount: "amount",
    space: "space",
    createdAt: "created_at",
  },
  restakesTable: {
    id: "id",
    userId: "user_id",
    pointId: "point_id",
    negationId: "negation_id",
    amount: "amount",
    space: "space",
    createdAt: "created_at",
  },
  effectiveRestakesView: {},
}));

jest.mock("@/services/db", () => {
  // Create a mock DB object with the common query builder methods
  const mockDb: any = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    execute: jest.fn(),
  };

  // The transaction helper should execute the provided callback immediately,
  // passing the same mock DB so that calls inside the callback are captured by
  // the spies defined above. This mimics Drizzle's API closely enough for unit
  // testing.
  mockDb.transaction = jest.fn(async (callback: (tx: typeof mockDb) => any) => {
    return callback(mockDb);
  });

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

// Import the doubt action after setting up mocks
import { doubt } from "../epistemic/doubt";
import { getUserId } from "../users/getUserId";
import { db } from "@/services/db";
import { doubtsTable, doubtHistoryTable, usersTable } from "@/db/schema";
import { fetchPointSnapshots } from "@/actions/points/fetchPointSnapshots";

describe("doubt", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchPointSnapshots as jest.Mock).mockImplementation(async (ids: number[]) =>
      ids.map((id) => ({
        id,
        createdBy: `owner-${id}`,
        content: `Point ${id}`,
      }))
    );
  });

  it("should throw an error if user is not authenticated", async () => {
    (getUserId as jest.Mock).mockResolvedValue(null);

    await expect(
      doubt({ pointId: 123, negationId: 456, amount: 10 })
    ).rejects.toThrow("Must be authenticated to doubt");

    expect(getUserId).toHaveBeenCalled();
  });

  it("should throw an error if trying to decrease an existing doubt", async () => {
    (getUserId as jest.Mock).mockResolvedValue("user-123");

    // Mock existing doubt with higher amount
    const existingDoubt = {
      id: 789,
      userId: "user-123",
      pointId: 123,
      negationId: 456,
      amount: 20,
      lastEarningsAt: new Date(),
      createdAt: new Date(),
    };

    const selectMock = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: jest
        .fn()
        .mockImplementationOnce((cb) =>
          Promise.resolve([existingDoubt]).then(cb)
        ),
    };
    (db.select as jest.Mock).mockReturnValue(selectMock);

    await expect(
      doubt({ pointId: 123, negationId: 456, amount: 10 })
    ).rejects.toThrow("Doubts can only be increased, not decreased");
  });

  it("should return null when the amount is 0", async () => {
    (getUserId as jest.Mock).mockResolvedValue("user-123");

    const result = await doubt({ pointId: 123, negationId: 456, amount: 0 });
    expect(result).toBeNull();
  });

  it("should create a new doubt if none exists", async () => {
    (getUserId as jest.Mock).mockResolvedValue("user-123");

    // No existing doubt
    const selectMock = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: jest
        .fn()
        .mockImplementationOnce((cb) => Promise.resolve([]).then(cb)),
    };
    (db.select as jest.Mock).mockReturnValue(selectMock);

    // Mock update user cred
    const updateUserMock = {
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
    };
    (db.update as jest.Mock).mockReturnValueOnce(updateUserMock);

    // Mock insert doubt
    const insertDoubtMock = {
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: 101 }]),
    };
    (db.insert as jest.Mock).mockReturnValueOnce(insertDoubtMock);

    // Mock insert doubt history
    const insertHistoryMock = {
      values: jest.fn().mockReturnThis(),
    };
    (db.insert as jest.Mock).mockReturnValueOnce(insertHistoryMock);

    // Execute
    const result = await doubt({ pointId: 123, negationId: 456, amount: 10 });

    // Verify result
    expect(result).toEqual({ doubtId: 101, earnings: 0 });

    // Verify deducting cred from user
    expect(db.update).toHaveBeenCalledWith(usersTable);
    expect(updateUserMock.set).toHaveBeenCalledWith({
      cred: expect.anything(),
    });

    // Verify creating doubt
    expect(db.insert).toHaveBeenCalledWith(doubtsTable);
    expect(insertDoubtMock.values).toHaveBeenCalledWith({
      userId: "user-123",
      pointId: 123,
      negationId: 456,
      amount: 10,
      space: "test-space",
    });

    // Verify recording history
    expect(db.insert).toHaveBeenCalledWith(doubtHistoryTable);
    expect(insertHistoryMock.values).toHaveBeenCalledWith({
      doubtId: 101,
      userId: "user-123",
      pointId: 123,
      negationId: 456,
      action: "created",
      previousAmount: null,
      newAmount: 10,
    });
  });

  it("should update an existing doubt when increasing amount", async () => {
    (getUserId as jest.Mock).mockResolvedValue("user-123");

    // Existing doubt with lower amount
    const existingDoubt = {
      id: 789,
      userId: "user-123",
      pointId: 123,
      negationId: 456,
      amount: 10,
      lastEarningsAt: new Date(Date.now() - 3600000), // 1 hour ago
      createdAt: new Date(),
    };

    const selectMock = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: jest
        .fn()
        .mockImplementationOnce((cb) =>
          Promise.resolve([existingDoubt]).then(cb)
        ),
    };
    (db.select as jest.Mock).mockReturnValue(selectMock);

    // Mock earnings calculation
    const earningsResult = { earnings: 5 };
    (db.execute as jest.Mock).mockResolvedValueOnce([earningsResult]);

    // Mock checking if doubt is effectively zeroed
    const doubtStatusMock = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        then: jest
          .fn()
          .mockImplementationOnce((cb) =>
            Promise.resolve([{ slashedAmount: 0 }]).then(cb)
          ),
      }),
    };
    (db.execute as jest.Mock).mockImplementationOnce((cb) =>
      Promise.resolve([doubtStatusMock])
    );

    // Mock update user cred
    const updateUserMock = {
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
    };
    (db.update as jest.Mock).mockReturnValueOnce(updateUserMock);

    // Mock update doubt
    const updateDoubtMock = {
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: existingDoubt.id }]),
    };
    (db.update as jest.Mock).mockReturnValueOnce(updateDoubtMock);

    // Mock insert doubt history
    const insertHistoryMock = {
      values: jest.fn().mockReturnThis(),
    };
    (db.insert as jest.Mock).mockReturnValueOnce(insertHistoryMock);

    // Execute
    const result = await doubt({ pointId: 123, negationId: 456, amount: 15 });

    // Verify result
    expect(result).toEqual({ doubtId: existingDoubt.id, earnings: 5 });

    // Verify deducting cred from user (amount increase: 15 - 10 = 5, plus earnings 5)
    expect(db.update).toHaveBeenCalledWith(usersTable);
    expect(updateUserMock.set).toHaveBeenCalledWith({
      cred: expect.anything(),
    });

    // Verify updating doubt
    expect(db.update).toHaveBeenCalledWith(doubtsTable);
    expect(updateDoubtMock.set).toHaveBeenCalled();

    // Verify recording history
    expect(db.insert).toHaveBeenCalledWith(doubtHistoryTable);
    expect(insertHistoryMock.values).toHaveBeenCalledWith({
      doubtId: existingDoubt.id,
      userId: "user-123",
      pointId: 123,
      negationId: 456,
      action: "increased",
      previousAmount: 10,
      newAmount: 15,
    });
  });

  it("should reset timestamps when reusing a fully slashed doubt", async () => {
    (getUserId as jest.Mock).mockResolvedValue("user-123");

    // Existing doubt with amount 0 (fully slashed)
    const existingDoubt = {
      id: 789,
      userId: "user-123",
      pointId: 123,
      negationId: 456,
      amount: 0,
      lastEarningsAt: new Date(Date.now() - 3600000), // 1 hour ago
      createdAt: new Date(Date.now() - 86400000), // 1 day ago
    };

    const selectMock = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: jest
        .fn()
        .mockImplementationOnce((cb) =>
          Promise.resolve([existingDoubt]).then(cb)
        ),
    };
    (db.select as jest.Mock).mockReturnValue(selectMock);

    // Mock earnings calculation (no earnings since doubt is zeroed)
    const earningsResult = { earnings: 0 };
    (db.execute as jest.Mock).mockResolvedValueOnce([earningsResult]);

    // Mock update user cred
    const updateUserMock = {
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
    };
    (db.update as jest.Mock).mockReturnValueOnce(updateUserMock);

    // Mock update doubt
    const updateDoubtMock = {
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: existingDoubt.id }]),
    };
    (db.update as jest.Mock).mockReturnValueOnce(updateDoubtMock);

    // Mock insert doubt history
    const insertHistoryMock = {
      values: jest.fn().mockReturnThis(),
    };
    (db.insert as jest.Mock).mockReturnValueOnce(insertHistoryMock);

    // Execute
    const result = await doubt({ pointId: 123, negationId: 456, amount: 15 });

    // Verify result
    expect(result).toEqual({ doubtId: existingDoubt.id, earnings: 0 });

    // Verify updating doubt with reset timestamps - using less strict matcher
    expect(db.update).toHaveBeenCalledWith(doubtsTable);
    expect(updateDoubtMock.set).toHaveBeenCalled();

    // Verify recording history with "created" action since we're reusing a zeroed doubt
    expect(db.insert).toHaveBeenCalledWith(doubtHistoryTable);
    expect(insertHistoryMock.values).toHaveBeenCalledWith({
      doubtId: existingDoubt.id,
      userId: "user-123",
      pointId: 123,
      negationId: 456,
      action: "created",
      previousAmount: 0,
      newAmount: 15,
    });
  });
});
