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

jest.mock("@/db/tables/topicPermissionsTable", () => ({
  topicPermissionsTable: {
    topicId: "topic_id",
    userId: "user_id",
    canCreateRationale: "can_create_rationale",
  },
}));

jest.mock("@/db/schema", () => ({
  topicsTable: {
    id: "id",
    name: "name", 
    space: "space",
    discourseUrl: "discourse_url",
    restrictedRationaleCreation: "restricted_rationale_creation",
    createdAt: "created_at",
  },
  topicPermissionsTable: {
    topicId: "topic_id",
    userId: "user_id",
    canCreateRationale: "can_create_rationale",
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

jest.mock("drizzle-zod", () => ({
  createInsertSchema: jest.fn(() => ({})),
  createSelectSchema: jest.fn(() => ({})),
}));

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

// Import the functions after setting up mocks
import { setTopicPermission, canUserCreateRationaleForTopic } from "../manageTopicPermissions";
import { getUserId } from "@/actions/users/getUserId";
import { requireSpaceAdmin } from "@/utils/adminUtils";
import { db } from "@/services/db";
import { topicsTable, topicPermissionsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("manageTopicPermissions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("setTopicPermission", () => {
    it("should throw an error if user is not authenticated", async () => {
      (getUserId as jest.Mock).mockResolvedValue(null);

      await expect(
        setTopicPermission(1, "user-123", true)
      ).rejects.toThrow("Must be authenticated to manage topic permissions");

      expect(getUserId).toHaveBeenCalled();
    });

    it("should throw an error if topic not found", async () => {
      (getUserId as jest.Mock).mockResolvedValue("admin-123");

      const selectMock = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]), // No topic found
          }),
        }),
      };

      (db.select as jest.Mock).mockReturnValue(selectMock);

      await expect(
        setTopicPermission(1, "user-123", true)
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
        setTopicPermission(1, "user-123", true)
      ).rejects.toThrow("Space admin access required");

      expect(getUserId).toHaveBeenCalled();
      expect(requireSpaceAdmin).toHaveBeenCalledWith("user-123", "test-space");
    });

    it("should successfully set topic permission when user is admin", async () => {
      (getUserId as jest.Mock).mockResolvedValue("admin-123");
      (requireSpaceAdmin as jest.Mock).mockResolvedValue(undefined);

      const existingTopic = { space: "test-space" };
      const permission = {
        topicId: 1,
        userId: "user-123",
        canCreateRationale: true,
      };

      const selectMock = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([existingTopic]),
          }),
        }),
      };

      const insertMock = {
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([permission]),
          }),
        }),
      };

      (db.select as jest.Mock).mockReturnValue(selectMock);
      (db.insert as jest.Mock).mockReturnValue(insertMock);

      const result = await setTopicPermission(1, "user-123", true);

      expect(getUserId).toHaveBeenCalled();
      expect(requireSpaceAdmin).toHaveBeenCalledWith("admin-123", "test-space");
      expect(db.select).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalledWith(topicPermissionsTable);
      expect(insertMock.values).toHaveBeenCalledWith({
        topicId: 1,
        userId: "user-123",
        canCreateRationale: true,
      });
      expect(result).toEqual(permission);
    });

    it("should set permission to false", async () => {
      (getUserId as jest.Mock).mockResolvedValue("admin-123");
      (requireSpaceAdmin as jest.Mock).mockResolvedValue(undefined);

      const existingTopic = { space: "test-space" };
      const permission = {
        topicId: 1,
        userId: "user-123",
        canCreateRationale: false,
      };

      const selectMock = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([existingTopic]),
          }),
        }),
      };

      const insertMock = {
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([permission]),
          }),
        }),
      };

      (db.select as jest.Mock).mockReturnValue(selectMock);
      (db.insert as jest.Mock).mockReturnValue(insertMock);

      const result = await setTopicPermission(1, "user-123", false);

      expect(getUserId).toHaveBeenCalled();
      expect(requireSpaceAdmin).toHaveBeenCalledWith("admin-123", "test-space");
      expect(db.select).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalledWith(topicPermissionsTable);
      expect(insertMock.values).toHaveBeenCalledWith({
        topicId: 1,
        userId: "user-123",
        canCreateRationale: false,
      });
      expect(result).toEqual(permission);
    });
  });

  describe("canUserCreateRationaleForTopic", () => {
    it("should return true for open topics", async () => {
      const selectMock = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ restrictedRationaleCreation: false }]),
          }),
        }),
      };

      (db.select as jest.Mock).mockReturnValue(selectMock);

      const result = await canUserCreateRationaleForTopic("user-123", 1);

      expect(result).toBe(true);
      expect(db.select).toHaveBeenCalled();
    });

    it("should return false when topic not found", async () => {
      const selectMock = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]), // No topic found
          }),
        }),
      };

      (db.select as jest.Mock).mockReturnValue(selectMock);

      const result = await canUserCreateRationaleForTopic("user-123", 1);

      expect(result).toBe(false);
      expect(db.select).toHaveBeenCalled();
    });

    it("should return true when user has permission for restricted topic", async () => {
      const selectMockTopic = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ restrictedRationaleCreation: true }]),
          }),
        }),
      };

      const selectMockPermission = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ canCreateRationale: true }]),
          }),
        }),
      };

      (db.select as jest.Mock)
        .mockReturnValueOnce(selectMockTopic)
        .mockReturnValueOnce(selectMockPermission);

      const result = await canUserCreateRationaleForTopic("user-123", 1);

      expect(result).toBe(true);
      expect(db.select).toHaveBeenCalledTimes(2);
    });

    it("should return false when user has no permission for restricted topic", async () => {
      const selectMockTopic = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ restrictedRationaleCreation: true }]),
          }),
        }),
      };

      const selectMockPermission = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]), // No permission found
          }),
        }),
      };

      (db.select as jest.Mock)
        .mockReturnValueOnce(selectMockTopic)
        .mockReturnValueOnce(selectMockPermission);

      const result = await canUserCreateRationaleForTopic("user-123", 1);

      expect(result).toBe(false);
      expect(db.select).toHaveBeenCalledTimes(2);
    });

    it("should return false when user has explicit false permission for restricted topic", async () => {
      const selectMockTopic = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ restrictedRationaleCreation: true }]),
          }),
        }),
      };

      const selectMockPermission = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ canCreateRationale: false }]),
          }),
        }),
      };

      (db.select as jest.Mock)
        .mockReturnValueOnce(selectMockTopic)
        .mockReturnValueOnce(selectMockPermission);

      const result = await canUserCreateRationaleForTopic("user-123", 1);

      expect(result).toBe(false);
      expect(db.select).toHaveBeenCalledTimes(2);
    });
  });
});