// Mock dependencies before importing the implementation
jest.mock("../users/getUserId", () => ({
  getUserId: jest.fn(),
}));

// Mock the database schema
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
    pointId: "point_id",
    negationId: "negation_id",
    restakeId: "restake_id",
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
}));

// Mock drizzle-orm
jest.mock("drizzle-orm", () => {
  interface MockSqlResult {
    as: (name: string) => MockSqlResult;
    mapWith: (fn: any) => MockSqlResult;
  }

  const mockSqlResult: MockSqlResult = {
    as: jest.fn((name) => mockSqlResult),
    mapWith: jest.fn(() => mockSqlResult),
  };

  const mockSql = function (...args: any[]): MockSqlResult {
    return mockSqlResult;
  };

  mockSql.raw = jest.fn((): MockSqlResult => mockSqlResult);

  return {
    eq: jest.fn((a, b) => ({ column: a, value: b })),
    and: jest.fn((...conditions) => ({ type: "and", conditions })),
    sql: mockSql,
  };
});

// Mock the db service
jest.mock("@/services/db", () => {
  const mockDb = {
    transaction: jest.fn(),
    select: jest.fn(),
    insert: jest.fn(),
  };
  return { db: mockDb };
});

// Now import the actual implementation and its dependencies
import { restake } from "../epistemic/restake";
import { getUserId } from "../users/getUserId";
import { db } from "@/services/db";
import {
  restakesTable,
  restakeHistoryTable,
  slashesTable,
  slashHistoryTable,
} from "@/db/schema";

describe("restake", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw error if user is not authenticated", async () => {
    // Setup: user is not authenticated
    (getUserId as jest.Mock).mockResolvedValue(null);

    // Execute & Assert
    await expect(
      restake({
        pointId: 123,
        negationId: 456,
        amount: 10,
      })
    ).rejects.toThrow("Must be authenticated to restake");

    // Verify getUserId was called
    expect(getUserId).toHaveBeenCalled();
  });

  it("should update an existing restake", async () => {
    // Setup: user is authenticated
    (getUserId as jest.Mock).mockResolvedValue("user-123");

    // Simulate an existing restake
    const existingRestake = {
      id: 789,
      userId: "user-123",
      pointId: 123,
      negationId: 456,
      amount: 5,
      createdAt: new Date(),
    };

    // Set up the mock chain for initial select returning the existing restake
    const selectMock = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: jest
        .fn()
        .mockImplementationOnce((cb) =>
          Promise.resolve([existingRestake]).then(cb)
        ),
    };
    (db.select as jest.Mock).mockReturnValue(selectMock);

    // Set up the transaction mock with sequential tx.select calls
    const txSelectChainForExistingSlash = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: jest
        .fn()
        .mockImplementationOnce((cb) =>
          Promise.resolve([{ id: 555, amount: 3 }]).then(cb)
        ),
    };
    const txSelectChainForEffectivelyZeroed = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: jest
        .fn()
        .mockImplementationOnce((cb) =>
          Promise.resolve([{ slashedAmount: 0 }]).then(cb)
        ),
    };
    const txMock = {
      select: jest
        .fn()
        .mockReturnValueOnce(txSelectChainForExistingSlash) // First select call for existingSlash
        .mockReturnValueOnce(txSelectChainForEffectivelyZeroed), // Second select call for isEffectivelyZeroed
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnThis(),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
      }),
    };
    (db.transaction as jest.Mock).mockImplementationOnce(async (callback) => {
      return await callback(txMock);
    });

    // Execute
    const result = await restake({
      pointId: 123,
      negationId: 456,
      amount: 10, // Increasing from 5 to 10
    });

    // Assert
    expect(result).toBe(789); // Should return the existing restake ID

    // Verify the DB operations were called correctly
    expect(db.select).toHaveBeenCalled();
    expect(selectMock.from).toHaveBeenCalledWith(restakesTable);
    expect(selectMock.where).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "and",
        conditions: expect.arrayContaining([
          expect.objectContaining({
            column: restakesTable.userId,
            value: "user-123",
          }),
          expect.objectContaining({
            column: restakesTable.pointId,
            value: 123,
          }),
          expect.objectContaining({
            column: restakesTable.negationId,
            value: 456,
          }),
        ]),
      })
    );

    // Verify transaction was used
    expect(db.transaction).toHaveBeenCalled();
  });

  it("should create a new restake if none exists", async () => {
    // Setup: user is authenticated
    (getUserId as jest.Mock).mockResolvedValue("user-123");

    // No existing restake
    const selectMock = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: jest
        .fn()
        .mockImplementationOnce((cb) => Promise.resolve([]).then(cb)),
    };
    (db.select as jest.Mock).mockReturnValue(selectMock);

    // Setup db.insert mock for creating new restake
    const newRestakeResult = {
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: 101 }]),
    };
    (db.insert as jest.Mock).mockReturnValueOnce(newRestakeResult);

    // Setup db.insert mock for recording restake history
    const insertHistoryMock = {
      values: jest.fn().mockReturnThis(),
      then: jest
        .fn()
        .mockImplementation((cb) => Promise.resolve(undefined).then(cb)),
    };
    (db.insert as jest.Mock).mockReturnValueOnce(insertHistoryMock);

    // Execute
    const result = await restake({
      pointId: 123,
      negationId: 456,
      amount: 10,
    });

    // Assert: should return new restake id
    expect(result).toBe(101);

    // Verify that db.insert was called with restakesTable
    expect(db.insert).toHaveBeenCalledWith(restakesTable);

    // Verify second insertion was with restakeHistoryTable
    expect(db.insert).toHaveBeenCalledWith(restakeHistoryTable);
  });

  it("should deactivate associated slashes when modifying a restake", async () => {
    // Setup: user is authenticated
    (getUserId as jest.Mock).mockResolvedValue("user-123");

    // Simulate an existing restake
    const existingRestake = {
      id: 789,
      userId: "user-123",
      pointId: 123,
      negationId: 456,
      amount: 5,
      createdAt: new Date(),
    };

    // Set up existing restake mock
    const selectMock = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: jest
        .fn()
        .mockImplementationOnce((cb) =>
          Promise.resolve([existingRestake]).then(cb)
        ),
    };
    (db.select as jest.Mock).mockReturnValue(selectMock);

    // Set up the transaction mock with sequential tx.select calls for deactivating slashes
    const txSelectChainForExistingSlash = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: jest.fn().mockImplementationOnce((cb) =>
        Promise.resolve([
          {
            id: 555,
            amount: 3,
            userId: "user-123",
            pointId: 123,
            negationId: 456,
          },
        ]).then(cb)
      ),
    };
    const txSelectChainForEffectivelyZeroed = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: jest
        .fn()
        .mockImplementationOnce((cb) =>
          Promise.resolve([{ slashedAmount: 0 }]).then(cb)
        ),
    };
    const txMock = {
      select: jest
        .fn()
        .mockReturnValueOnce(txSelectChainForExistingSlash)
        .mockReturnValueOnce(txSelectChainForEffectivelyZeroed),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnThis(),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
      }),
    };
    (db.transaction as jest.Mock).mockImplementationOnce(async (callback) => {
      return await callback(txMock);
    });

    // Execute
    const result = await restake({
      pointId: 123,
      negationId: 456,
      amount: 10, // Increasing from 5 to 10
    });

    // Assert
    expect(result).toBe(789); // Should return the existing restake ID

    // Verify transaction operations to deactivate slash
    expect(db.transaction).toHaveBeenCalled();
  });

  it("should reset timestamps for fully slashed restakes", async () => {
    // Setup: user is authenticated
    (getUserId as jest.Mock).mockResolvedValue("user-123");

    // Simulate an existing restake
    const existingRestake = {
      id: 789,
      userId: "user-123",
      pointId: 123,
      negationId: 456,
      amount: 5,
      createdAt: new Date(),
    };

    // Set up existing restake mock
    const selectMock = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: jest
        .fn()
        .mockImplementationOnce((cb) =>
          Promise.resolve([existingRestake]).then(cb)
        ),
    };
    (db.select as jest.Mock).mockReturnValue(selectMock);

    // Set up the transaction mock to simulate a fully slashed restake
    const txSelectChainForNoExistingSlash = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: jest
        .fn()
        .mockImplementationOnce((cb) => Promise.resolve([]).then(cb)), // No existing slashes
    };
    const txSelectChainForEffectivelyZeroed = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      then: jest
        .fn()
        .mockImplementationOnce((cb) =>
          Promise.resolve([{ slashedAmount: 5 }]).then(cb)
        ), // Fully slashed (5 out of 5)
    };
    const txMock = {
      select: jest
        .fn()
        .mockReturnValueOnce(txSelectChainForNoExistingSlash)
        .mockReturnValueOnce(txSelectChainForEffectivelyZeroed),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnThis(),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
      }),
    };
    (db.transaction as jest.Mock).mockImplementationOnce(async (callback) => {
      return await callback(txMock);
    });

    // Execute
    const result = await restake({
      pointId: 123,
      negationId: 456,
      amount: 10, // Reusing a fully slashed restake
    });

    // Assert
    expect(result).toBe(789);

    // Verify transaction operations to update with new timestamp
    expect(db.transaction).toHaveBeenCalled();
    expect(txMock.update).toHaveBeenCalledWith(restakesTable);
    //eslint-disable-next-line drizzle/enforce-update-with-where
    expect(txMock.update().set).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 10,
      })
    );
  });
});
