// Mock dependencies before importing the implementation
jest.mock("../getUserId", () => ({
  getUserId: jest.fn(),
}));

jest.mock("../getSpace", () => ({
  getSpace: jest.fn(),
}));

// Mock DB schema
jest.mock("@/db/schema", () => ({
  usersTable: {
    id: "id",
    cred: "cred",
  },
  endorsementsTable: {
    id: "id",
    cred: "cred",
    userId: "user_id",
    pointId: "point_id",
    space: "space",
  },
}));

// Mock DB tables
jest.mock("@/db/tables/pointsTable", () => ({
  pointsTable: {
    id: "id",
  },
  insertPointSchema: {
    parse: jest.fn(),
  },
}));

jest.mock("@/db/tables/endorsementsTable", () => ({
  endorsementsTable: {
    id: "id",
    cred: "cred",
    userId: "user_id",
    pointId: "point_id",
    space: "space",
  },
  InsertEndorsement: jest.fn(),
  Endorsement: jest.fn(),
}));

// Mock drizzle-zod before it's used
jest.mock("drizzle-zod", () => ({
  createInsertSchema: jest.fn().mockReturnValue({
    parse: jest.fn(),
  }),
}));

jest.mock("@/services/db", () => {
  const mockDb = {
    transaction: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
  };
  return { db: mockDb };
});

jest.mock("drizzle-orm", () => ({
  eq: jest.fn((a, b) => ({ column: a, value: b })),
  sql: jest.fn((...args) => ({
    as: jest.fn().mockReturnThis(),
    raw: jest.fn().mockReturnThis(),
    mapWith: jest.fn().mockReturnThis(),
  })),
  isTable: jest.fn().mockReturnValue(true),
}));

// Import the endorse action after setting up mocks
import { endorse } from "../endorse";
import { getUserId } from "../getUserId";
import { getSpace } from "../getSpace";
import { db } from "@/services/db";
import { usersTable, endorsementsTable } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

describe("endorse", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw an error if user is not authenticated", async () => {
    (getUserId as jest.Mock).mockResolvedValue(null);

    await expect(endorse({ pointId: 123, cred: 10 })).rejects.toThrow(
      "Must be authenticated to add a point"
    );

    expect(getUserId).toHaveBeenCalled();
  });

  it("should throw an error if cred is not positive", async () => {
    (getUserId as jest.Mock).mockResolvedValue("user-123");

    await expect(endorse({ pointId: 123, cred: 0 })).rejects.toThrow(
      "Cred must be positive"
    );

    await expect(endorse({ pointId: 123, cred: -5 })).rejects.toThrow(
      "Cred must be positive"
    );
  });

  it("should successfully create an endorsement", async () => {
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

    // Mock insert chain
    const insertValues = jest.fn().mockReturnThis();
    const insertReturning = jest.fn().mockResolvedValue([{ id: 456 }]);
    const insert = jest.fn().mockReturnValue({
      values: insertValues,
      returning: insertReturning,
    });

    // Setup transaction mock with proper chaining
    const txMock = {
      update,
      insert,
    };

    (db.transaction as jest.Mock).mockImplementation(async (callback) => {
      return await callback(txMock);
    });

    // Execute
    const result = await endorse({ pointId: 123, cred: 10 });

    // Assert
    expect(result).toBe(456);
    expect(getUserId).toHaveBeenCalled();
    expect(getSpace).toHaveBeenCalled();

    // Verify transaction was used
    expect(db.transaction).toHaveBeenCalled();

    // Verify user cred was updated
    expect(txMock.update).toHaveBeenCalledWith(usersTable);
    expect(updateSet).toHaveBeenCalledWith({
      cred: expect.anything(),
    });
    expect(updateWhere).toHaveBeenCalled();

    // Verify endorsement was inserted
    expect(txMock.insert).toHaveBeenCalledWith(endorsementsTable);
    expect(insertValues).toHaveBeenCalledWith({
      cred: 10,
      userId: "user-123",
      pointId: 123,
      space: "test-space",
    });
    expect(insertReturning).toHaveBeenCalled();
  });

  it("should handle database errors gracefully", async () => {
    (getUserId as jest.Mock).mockResolvedValue("user-123");
    (getSpace as jest.Mock).mockResolvedValue("test-space");

    // Mock transaction to throw an error
    (db.transaction as jest.Mock).mockRejectedValueOnce(
      new Error("Database error")
    );

    // Execute & Assert
    await expect(endorse({ pointId: 123, cred: 10 })).rejects.toThrow(
      "Database error"
    );
  });
});
