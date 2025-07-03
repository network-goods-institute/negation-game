// Mock dependencies before importing the implementation
jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(),
}));

jest.mock("@/utils/adminUtils", () => ({
  requireSpaceAdmin: jest.fn(),
}));

jest.mock("@/db/tables/topicsTable", () => ({
  topicsTable: {
    id: "id",
    name: "name",
    space: "space",
    discourseUrl: "discourse_url",
    restrictedRationaleCreation: "restricted_rationale_creation",
    createdAt: "created_at",
  },
}));

jest.mock("@/services/db", () => {
  // Create a mock DB object with the common query builder methods
  const mockDb: any = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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

// Import the updateTopic action after setting up mocks
import { updateTopic } from "../updateTopic";
import { getUserId } from "@/actions/users/getUserId";
import { requireSpaceAdmin } from "@/utils/adminUtils";
import { db } from "@/services/db";
import { topicsTable } from "@/db/tables/topicsTable";
import { eq } from "drizzle-orm";

describe("updateTopic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw an error if user is not authenticated", async () => {
    (getUserId as jest.Mock).mockResolvedValue(null);

    await expect(
      updateTopic(1, { name: "Updated Topic" })
    ).rejects.toThrow("Must be authenticated to update topic");

    expect(getUserId).toHaveBeenCalled();
  });

  it("should throw an error if topic not found", async () => {
    (getUserId as jest.Mock).mockResolvedValue("user-123");

    const selectMock = {
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]), // No topic found
        }),
      }),
    };

    (db.select as jest.Mock).mockReturnValue(selectMock);

    await expect(
      updateTopic(1, { name: "Updated Topic" })
    ).rejects.toThrow("Topic not found");

    expect(getUserId).toHaveBeenCalled();
    expect(db.select).toHaveBeenCalled();
  });

  it("should throw an error if user is not admin", async () => {
    (getUserId as jest.Mock).mockResolvedValue("user-123");
    (requireSpaceAdmin as jest.Mock).mockRejectedValue(new Error("Space admin access required"));

    const selectMock = {
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([{ space: "test-space" }]),
        }),
      }),
    };

    (db.select as jest.Mock).mockReturnValue(selectMock);

    await expect(
      updateTopic(1, { name: "Updated Topic" })
    ).rejects.toThrow("Space admin access required");

    expect(getUserId).toHaveBeenCalled();
    expect(requireSpaceAdmin).toHaveBeenCalledWith("user-123", "test-space");
  });

  it("should successfully update a topic when user is admin", async () => {
    (getUserId as jest.Mock).mockResolvedValue("user-123");
    (requireSpaceAdmin as jest.Mock).mockResolvedValue(undefined);

    const existingTopic = { space: "test-space" };
    const updatedTopic = {
      id: 1,
      name: "Updated Topic",
      space: "test-space",
      discourseUrl: "https://updated.com",
      restrictedRationaleCreation: true,
      createdAt: new Date(),
    };

    const selectMock = {
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([existingTopic]),
        }),
      }),
    };

    const updateMock = {
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([updatedTopic]),
        }),
      }),
    };

    (db.select as jest.Mock).mockReturnValue(selectMock);
    (db.update as jest.Mock).mockReturnValue(updateMock);

    const result = await updateTopic(1, {
      name: "Updated Topic",
      discourseUrl: "https://updated.com",
      restrictedRationaleCreation: true,
    });

    expect(getUserId).toHaveBeenCalled();
    expect(requireSpaceAdmin).toHaveBeenCalledWith("user-123", "test-space");
    expect(db.select).toHaveBeenCalled();
    expect(db.update).toHaveBeenCalledWith(topicsTable);
    expect(updateMock.set).toHaveBeenCalledWith({
      name: "Updated Topic",
      discourseUrl: "https://updated.com",
      restrictedRationaleCreation: true,
    });
    expect(result).toEqual(updatedTopic);
  });

  it("should update only provided fields", async () => {
    (getUserId as jest.Mock).mockResolvedValue("user-123");
    (requireSpaceAdmin as jest.Mock).mockResolvedValue(undefined);

    const existingTopic = { space: "test-space" };
    const updatedTopic = {
      id: 1,
      name: "Updated Name Only",
      space: "test-space",
      discourseUrl: "https://original.com",
      restrictedRationaleCreation: false,
      createdAt: new Date(),
    };

    const selectMock = {
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([existingTopic]),
        }),
      }),
    };

    const updateMock = {
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([updatedTopic]),
        }),
      }),
    };

    (db.select as jest.Mock).mockReturnValue(selectMock);
    (db.update as jest.Mock).mockReturnValue(updateMock);

    const result = await updateTopic(1, {
      name: "Updated Name Only",
    });

    expect(getUserId).toHaveBeenCalled();
    expect(requireSpaceAdmin).toHaveBeenCalledWith("user-123", "test-space");
    expect(db.select).toHaveBeenCalled();
    expect(db.update).toHaveBeenCalledWith(topicsTable);
    expect(updateMock.set).toHaveBeenCalledWith({
      name: "Updated Name Only",
    });
    expect(result).toEqual(updatedTopic);
  });
});