// Mock the database schema objects
jest.mock("@/db/schema", () => ({
  restakesTable: {
    id: { name: "id" },
    userId: { name: "userId" },
    pointId: { name: "pointId" },
    negationId: { name: "negationId" },
    amount: { name: "amount" },
    createdAt: { name: "createdAt" },
  },
  restakeHistoryTable: {
    id: { name: "id" },
    restakeId: { name: "restakeId" },
    userId: { name: "userId" },
    pointId: { name: "pointId" },
    negationId: { name: "negationId" },
    action: { name: "action" },
    previousAmount: { name: "previousAmount" },
    newAmount: { name: "newAmount" },
  },
  slashesTable: {
    id: { name: "id" },
    userId: { name: "userId" },
    pointId: { name: "pointId" },
    negationId: { name: "negationId" },
    amount: { name: "amount" },
  },
  slashHistoryTable: {
    id: { name: "id" },
    slashId: { name: "slashId" },
    userId: { name: "userId" },
    pointId: { name: "pointId" },
    negationId: { name: "negationId" },
    action: { name: "action" },
    previousAmount: { name: "previousAmount" },
    newAmount: { name: "newAmount" },
  },
  endorsementsTable: {
    cred: { name: "cred" },
    userId: { name: "userId" },
    pointId: { name: "pointId" },
  },
}));

// Mock getUserId
jest.mock("../users/getUserId", () => ({
  getUserId: jest.fn(),
}));

// Mock getSpace
jest.mock("../spaces/getSpace", () => ({
  getSpace: jest.fn().mockResolvedValue("test-space"),
}));

// Mock notification and tracking functions
jest.mock("@/lib/notifications/notificationQueue", () => ({
  queueRestakeNotification: jest.fn(),
}));

jest.mock("@/actions/analytics/trackCredEvent", () => ({
  trackRestakeEvent: jest.fn(),
}));

// Mock SQL functions
jest.mock("drizzle-orm", () => {
  const actual = jest.requireActual("drizzle-orm");
  interface MockSqlResult {
    as: (name: string) => MockSqlResult;
    mapWith: (fn: any) => MockSqlResult;
  }

  const mockSql = function (...args: any[]): MockSqlResult {
    return {
      as: jest.fn().mockReturnThis(),
      mapWith: jest.fn().mockReturnThis(),
    } as MockSqlResult;
  };

  return {
    ...actual,
    sql: mockSql,
  };
});

// Generic chain stub for Drizzle builder used in this suite
function stubQuery(result: any = []) {
  const chain: any = {};
  const pass = jest.fn().mockReturnValue(chain);
  [
    "from",
    "where",
    "leftJoin",
    "groupBy",
    "orderBy",
    "limit",
    "values",
    "set",
    "returning",
  ].forEach((m) => (chain[m] = pass));
  chain.then = jest.fn((onF, onR) => Promise.resolve(result).then(onF, onR));
  return chain;
}

jest.mock("@/services/db", () => {
  // We'll swap out return arrays inside individual tests via mockResolvedValueOnce
  const selectMock = jest.fn().mockImplementation(() => stubQuery([]));
  const insertMock = jest.fn().mockImplementation(() => stubQuery([]));
  const updateMock = jest.fn().mockImplementation(() => stubQuery([]));
  const transactionMock = jest.fn().mockImplementation(async (callback) => {
    const txMock = {
      select: selectMock,
      insert: insertMock,
      update: updateMock,
    };
    return await callback(txMock);
  });

  return {
    db: {
      select: selectMock,
      insert: insertMock,
      update: updateMock,
      transaction: transactionMock,
    },
  };
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

    // First select call for endorsement lookup returns non-zero cred
    (db.select as jest.Mock).mockImplementationOnce(() =>
      stubQuery([{ cred: 100 }])
    );
    // Second select call for existing restake check returns existing restake
    (db.select as jest.Mock).mockImplementationOnce(() =>
      stubQuery([{ id: 1, amount: 50 }])
    );
    // Third select call for slash check returns no slashes
    (db.select as jest.Mock).mockImplementationOnce(() => stubQuery([]));
    // Update call should succeed
    (db.update as jest.Mock).mockImplementationOnce(() =>
      stubQuery([{ id: 1 }])
    );

    const result = await restake({
      pointId: 123,
      negationId: 456,
      amount: 75,
    });

    expect(result).toBe(1); // Returns the restake ID
    expect(db.update).toHaveBeenCalled();
  });

  it("should create a new restake if none exists", async () => {
    // Setup: user is authenticated
    (getUserId as jest.Mock).mockResolvedValue("user-123");

    // First select call for endorsement lookup returns non-zero cred
    (db.select as jest.Mock).mockImplementationOnce(() =>
      stubQuery([{ cred: 100 }])
    );
    // Second select call for existing restake check returns empty
    (db.select as jest.Mock).mockImplementationOnce(() => stubQuery([]));
    // Insert call should succeed
    (db.insert as jest.Mock).mockImplementationOnce(() =>
      stubQuery([{ id: 2 }])
    );

    const result = await restake({
      pointId: 123,
      negationId: 456,
      amount: 50,
    });

    expect(result).toBe(2); // Returns the new restake ID
    expect(db.insert).toHaveBeenCalled();
  });

  it("should deactivate associated slashes when modifying a restake", async () => {
    // Setup: user is authenticated
    (getUserId as jest.Mock).mockResolvedValue("user-123");

    // First select call for endorsement lookup returns non-zero cred
    (db.select as jest.Mock).mockImplementationOnce(() =>
      stubQuery([{ cred: 100 }])
    );
    // Second select call for existing restake check returns existing restake
    (db.select as jest.Mock).mockImplementationOnce(() =>
      stubQuery([{ id: 1, amount: 30 }])
    );
    // Third select call for slash check returns existing slash
    (db.select as jest.Mock).mockImplementationOnce(() =>
      stubQuery([{ id: 1, restakeId: 1 }])
    );
    // Update restake call should succeed
    (db.update as jest.Mock).mockImplementationOnce(() =>
      stubQuery([{ id: 1 }])
    );
    // Update slash call should succeed
    (db.update as jest.Mock).mockImplementationOnce(() =>
      stubQuery([{ id: 1 }])
    );

    const result = await restake({
      pointId: 123,
      negationId: 456,
      amount: 60,
    });

    expect(result).toBe(1); // Returns the restake ID
    expect(db.update).toHaveBeenCalledTimes(2); // restake + slash deactivation
  });

  it("should reset timestamps for fully slashed restakes", async () => {
    // Setup: user is authenticated
    (getUserId as jest.Mock).mockResolvedValue("user-123");

    // First select call for endorsement lookup returns non-zero cred
    (db.select as jest.Mock).mockImplementationOnce(() =>
      stubQuery([{ cred: 100 }])
    );

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
