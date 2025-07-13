// Mock dependencies before importing the implementation
jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(),
}));

jest.mock("@/utils/adminUtils", () => ({
  requireSpaceAdmin: jest.fn(),
}));

jest.mock("@/actions/spaces/getSpaceTopicCreationPermission", () => ({
  getSpaceTopicCreationPermission: jest.fn(),
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

// Import the createTopic action after setting up mocks
import { createTopic } from "../createTopic";
import { getUserId } from "@/actions/users/getUserId";
import { requireSpaceAdmin } from "@/utils/adminUtils";
import { getSpaceTopicCreationPermission } from "@/actions/spaces/getSpaceTopicCreationPermission";
import { db } from "@/services/db";
import { topicsTable } from "@/db/tables/topicsTable";

describe("createTopic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw an error if user is not authenticated", async () => {
    (getUserId as jest.Mock).mockResolvedValue(null);

    await expect(
      createTopic("Test Topic", "test-space")
    ).rejects.toThrow("Must be authenticated to create topic");

    expect(getUserId).toHaveBeenCalled();
  });

  it("should allow topic creation when public creation is enabled", async () => {
    (getUserId as jest.Mock).mockResolvedValue("user-123");
    (getSpaceTopicCreationPermission as jest.Mock).mockResolvedValue(true);

    const mockTopic = {
      id: 1,
      name: "Public Topic",
      space: "test-space",
      discourseUrl: "",
      restrictedRationaleCreation: false,
      createdAt: new Date(),
    };

    const insertMock = {
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([mockTopic]),
      }),
    };

    (db.insert as jest.Mock).mockReturnValue(insertMock);

    const result = await createTopic("Public Topic", "test-space");

    expect(getUserId).toHaveBeenCalled();
    expect(getSpaceTopicCreationPermission).toHaveBeenCalledWith("test-space");
    expect(requireSpaceAdmin).not.toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalledWith(topicsTable);
    expect(result).toEqual(mockTopic);
  });

  it("should throw an error if user is not admin", async () => {
    (getUserId as jest.Mock).mockResolvedValue("user-123");
    (getSpaceTopicCreationPermission as jest.Mock).mockResolvedValue(false);
    (requireSpaceAdmin as jest.Mock).mockRejectedValue(new Error("Space admin access required"));

    await expect(
      createTopic("Test Topic", "test-space")
    ).rejects.toThrow("Space admin access required");

    expect(getUserId).toHaveBeenCalled();
    expect(getSpaceTopicCreationPermission).toHaveBeenCalledWith("test-space");
    expect(requireSpaceAdmin).toHaveBeenCalledWith("user-123", "test-space");
  });

  it("should successfully create a topic when user is admin", async () => {
    (getUserId as jest.Mock).mockResolvedValue("user-123");
    (getSpaceTopicCreationPermission as jest.Mock).mockResolvedValue(false);
    (requireSpaceAdmin as jest.Mock).mockResolvedValue(undefined);

    const mockTopic = {
      id: 1,
      name: "Test Topic",
      space: "test-space",
      discourseUrl: "https://example.com",
      restrictedRationaleCreation: false,
      createdAt: new Date(),
    };

    const insertMock = {
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([mockTopic]),
      }),
    };

    (db.insert as jest.Mock).mockReturnValue(insertMock);

    const result = await createTopic("Test Topic", "test-space", "https://example.com", false);

    expect(getUserId).toHaveBeenCalled();
    expect(getSpaceTopicCreationPermission).toHaveBeenCalledWith("test-space");
    expect(requireSpaceAdmin).toHaveBeenCalledWith("user-123", "test-space");
    expect(db.insert).toHaveBeenCalledWith(topicsTable);
    expect(insertMock.values).toHaveBeenCalledWith({
      name: "Test Topic",
      space: "test-space",
      discourseUrl: "https://example.com",
      restrictedRationaleCreation: false,
    });
    expect(result).toEqual(mockTopic);
  });

  it("should create topic with default values", async () => {
    (getUserId as jest.Mock).mockResolvedValue("user-123");
    (getSpaceTopicCreationPermission as jest.Mock).mockResolvedValue(false);
    (requireSpaceAdmin as jest.Mock).mockResolvedValue(undefined);

    const mockTopic = {
      id: 1,
      name: "Test Topic",
      space: "test-space",
      discourseUrl: "",
      restrictedRationaleCreation: false,
      createdAt: new Date(),
    };

    const insertMock = {
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([mockTopic]),
      }),
    };

    (db.insert as jest.Mock).mockReturnValue(insertMock);

    const result = await createTopic("Test Topic", "test-space");

    expect(getUserId).toHaveBeenCalled();
    expect(getSpaceTopicCreationPermission).toHaveBeenCalledWith("test-space");
    expect(requireSpaceAdmin).toHaveBeenCalledWith("user-123", "test-space");
    expect(db.insert).toHaveBeenCalledWith(topicsTable);
    expect(insertMock.values).toHaveBeenCalledWith({
      name: "Test Topic",
      space: "test-space",
      discourseUrl: "",
      restrictedRationaleCreation: false,
    });
    expect(result).toEqual(mockTopic);
  });

  it("should create topic with restricted rationale creation", async () => {
    (getUserId as jest.Mock).mockResolvedValue("user-123");
    (getSpaceTopicCreationPermission as jest.Mock).mockResolvedValue(false);
    (requireSpaceAdmin as jest.Mock).mockResolvedValue(undefined);

    const mockTopic = {
      id: 1,
      name: "Restricted Topic",
      space: "test-space",
      discourseUrl: "",
      restrictedRationaleCreation: true,
      createdAt: new Date(),
    };

    const insertMock = {
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([mockTopic]),
      }),
    };

    (db.insert as jest.Mock).mockReturnValue(insertMock);

    const result = await createTopic("Restricted Topic", "test-space", "", true);

    expect(getUserId).toHaveBeenCalled();
    expect(getSpaceTopicCreationPermission).toHaveBeenCalledWith("test-space");
    expect(requireSpaceAdmin).toHaveBeenCalledWith("user-123", "test-space");
    expect(db.insert).toHaveBeenCalledWith(topicsTable);
    expect(insertMock.values).toHaveBeenCalledWith({
      name: "Restricted Topic",
      space: "test-space",
      discourseUrl: "",
      restrictedRationaleCreation: true,
    });
    expect(result).toEqual(mockTopic);
  });
});