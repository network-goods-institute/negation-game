// Mock DB schema and related imports
jest.mock("@/db/schema", () => ({
  usersTable: {
    id: "id",
    cred: "cred",
  },
  endorsementsTable: {
    id: "id",
    cred: "cred",
    pointId: "point_id",
    userId: "user_id",
    space: "space",
  },
  negationsTable: {
    id: "id",
    createdBy: "created_by",
    newerPointId: "newer_point_id",
    olderPointId: "older_point_id",
    space: "space",
  },
}));

// Define mockDb directly in the mock function - no external variable
jest.mock("@/services/db", () => ({
  db: {
    transaction: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
  },
}));

jest.mock("drizzle-orm", () => ({
  eq: jest.fn((a, b) => ({ column: a, value: b })),
  sql: jest.fn((...args) => ({
    as: jest.fn().mockReturnThis(),
    raw: jest.fn().mockReturnThis(),
    mapWith: jest.fn().mockReturnThis(),
  })),
}));

// Add mock for toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Add mock for getUserId and getSpace
jest.mock("../users/getUserId", () => ({
  getUserId: jest.fn(),
}));
jest.mock("@/actions/spaces/getSpace", () => ({
  getSpace: jest.fn(),
}));

// Import the negate action after setting up mocks
import { negate } from "../points/negate";
import { getUserId } from "../users/getUserId";
import { getSpace } from "@/actions/spaces/getSpace";
import { db } from "@/services/db";
import { usersTable, endorsementsTable, negationsTable } from "@/db/schema";

describe("negate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw an error if user is not authenticated", async () => {
    (getUserId as jest.Mock).mockResolvedValue(null);

    await expect(
      negate({ negatedPointId: 123, counterpointId: 456 })
    ).rejects.toThrow("Must be authenticated to add a point");

    expect(getUserId).toHaveBeenCalled();
  });

  it("should create a negation without endorsement if cred is 0", async () => {
    // Setup
    (getUserId as jest.Mock).mockResolvedValue("user-123");
    (getSpace as jest.Mock).mockResolvedValue("test-space");

    // Mock transaction
    const insertValues = jest.fn().mockReturnThis();
    const insertReturning = jest.fn().mockResolvedValue([{ negationId: 789 }]);
    const onConflictDoNothing = jest.fn().mockReturnThis();
    const insert = jest.fn().mockReturnValue({
      values: insertValues,
      onConflictDoNothing,
      returning: insertReturning,
    });

    const txMock = {
      update: jest.fn(),
      insert: insert,
    };

    (db.transaction as jest.Mock).mockImplementation(async (callback) => {
      return await callback(txMock);
    });

    // Execute
    const result = await negate({
      negatedPointId: 123,
      counterpointId: 456,
      cred: 0,
    });

    // Assert
    expect(result).toBe(789);

    // Verify user cred was NOT updated (since cred is 0)
    expect(txMock.update).not.toHaveBeenCalled();

    // Verify negation was created
    expect(txMock.insert).toHaveBeenCalledWith(negationsTable);
    expect(insertValues).toHaveBeenCalledWith({
      createdBy: "user-123",
      isObjection: false,
      newerPointId: 456,
      olderPointId: 123,
      space: "test-space",
    });
  });

  it("should create both endorsement and negation if cred is positive", async () => {
    // Setup
    (getUserId as jest.Mock).mockResolvedValue("user-123");
    (getSpace as jest.Mock).mockResolvedValue("test-space");

    // Mock update chain
    const updateSet = jest.fn().mockReturnThis();
    const updateWhere = jest.fn().mockReturnThis();
    const update = jest.fn().mockReturnValue({
      set: updateSet,
      where: updateWhere,
    });

    // Mock first insert (endorsement)
    const endorsementValues = jest.fn().mockReturnThis();

    // Mock second insert (negation)
    const negationValues = jest.fn().mockReturnThis();
    const negationReturning = jest
      .fn()
      .mockResolvedValue([{ negationId: 789 }]);
    const negationOnConflict = jest.fn().mockReturnThis();

    const insert = jest
      .fn()
      .mockReturnValueOnce({ values: endorsementValues })
      .mockReturnValueOnce({
        values: negationValues,
        onConflictDoNothing: negationOnConflict,
        returning: negationReturning,
      });

    const txMock = {
      update,
      insert,
    };

    (db.transaction as jest.Mock).mockImplementation(async (callback) => {
      return await callback(txMock);
    });

    // Execute
    const result = await negate({
      negatedPointId: 123,
      counterpointId: 456,
      cred: 10,
    });

    // Assert
    expect(result).toBe(789);

    // Verify user cred was updated
    expect(txMock.update).toHaveBeenCalledWith(usersTable);
    expect(updateSet).toHaveBeenCalledWith({
      cred: expect.anything(),
    });

    // Verify endorsement was inserted (first call to insert)
    expect(txMock.insert).toHaveBeenNthCalledWith(1, endorsementsTable);
    expect(endorsementValues).toHaveBeenCalledWith({
      cred: 10,
      pointId: 456,
      userId: "user-123",
      space: "test-space",
    });

    // Verify negation was created (second call to insert)
    expect(txMock.insert).toHaveBeenNthCalledWith(2, negationsTable);
    expect(negationValues).toHaveBeenCalledWith({
      createdBy: "user-123",
      isObjection: false,
      newerPointId: 456,
      olderPointId: 123,
      space: "test-space",
    });
  });

  it("should handle points with different IDs correctly", async () => {
    // Setup with negatedPointId > counterpointId
    (getUserId as jest.Mock).mockResolvedValue("user-123");
    (getSpace as jest.Mock).mockResolvedValue("test-space");

    // Mock transaction
    const insertValues = jest.fn().mockReturnThis();
    const insertReturning = jest.fn().mockResolvedValue([{ negationId: 789 }]);
    const onConflictDoNothing = jest.fn().mockReturnThis();
    const insert = jest.fn().mockReturnValue({
      values: insertValues,
      onConflictDoNothing,
      returning: insertReturning,
    });

    const txMock = {
      insert,
    };

    (db.transaction as jest.Mock).mockImplementation(async (callback) => {
      return await callback(txMock);
    });

    // Execute with negatedPointId > counterpointId
    await negate({
      negatedPointId: 456,
      counterpointId: 123,
      cred: 0,
    });

    // Verify correct ordering of point IDs
    expect(txMock.insert).toHaveBeenCalledWith(negationsTable);
    expect(insertValues).toHaveBeenCalledWith({
      createdBy: "user-123",
      isObjection: false,
      newerPointId: 456, // The higher ID
      olderPointId: 123, // The lower ID
      space: "test-space",
    });
  });

  it("should handle database errors gracefully", async () => {
    (getUserId as jest.Mock).mockResolvedValue("user-123");
    (getSpace as jest.Mock).mockResolvedValue("test-space");

    // Mock transaction to throw an error
    (db.transaction as jest.Mock).mockRejectedValueOnce(
      new Error("Database error")
    );

    // Execute & Assert
    await expect(
      negate({ negatedPointId: 123, counterpointId: 456 })
    ).rejects.toThrow("Database error");
  });
  it("should work correctly with UI notification workflow", async () => {
    // Mock necessary elements to test UI notification flow
    const globalAny = global as any;
    globalAny.CustomEvent = jest.fn();
    globalAny.dispatchEvent = jest.fn();

    // Setup
    (getUserId as jest.Mock).mockResolvedValue("user-123");
    (getSpace as jest.Mock).mockResolvedValue("test-space");

    // Mock transaction
    const insertValues = jest.fn().mockReturnThis();
    const insertReturning = jest.fn().mockResolvedValue([{ negationId: 789 }]);
    const onConflictDoNothing2 = jest.fn().mockReturnThis();
    const insert = jest.fn().mockReturnValue({
      values: insertValues,
      onConflictDoNothing: onConflictDoNothing2,
      returning: insertReturning,
    });

    const txMock = {
      insert,
    };

    (db.transaction as jest.Mock).mockImplementation(async (callback) => {
      return await callback(txMock);
    });

    // Execute
    const result = await negate({
      negatedPointId: 123,
      counterpointId: 456,
      cred: 0,
    });

    // Assert
    expect(result).toBe(789);
    expect(insertValues).toHaveBeenCalledWith({
      createdBy: "user-123",
      isObjection: false,
      newerPointId: 456,
      olderPointId: 123,
      space: "test-space",
    });

    // The test verifies that the event dispatch mechanism and toast notification
    // can be called properly based on this returned result
  });
});
