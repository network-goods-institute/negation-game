jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(),
}));

jest.mock("@/utils/adminUtils", () => ({
  requireSpaceAdmin: jest.fn(),
}));

jest.mock("@/services/db", () => {
  const mockDb: any = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    execute: jest.fn(),
  };
  mockDb.transaction = jest.fn(async (callback: (tx: typeof mockDb) => any) => {
    return callback(mockDb);
  });
  return { db: mockDb };
});

jest.mock("nanoid", () => ({
  nanoid: jest.fn(() => "test-id-123"),
}));

import {
  assignRationaleToUser,
  removeRationaleAssignment,
  fetchTopicAssignments,
  fetchUserAssignments,
  markAssignmentCompleted,
} from "../manageRationaleAssignments";
import { getUserId } from "@/actions/users/getUserId";
import { requireSpaceAdmin } from "@/utils/adminUtils";
import { db } from "@/services/db";

const mockGetUserId = getUserId as jest.Mock;
const mockRequireSpaceAdmin = requireSpaceAdmin as jest.Mock;

describe("manageRationaleAssignments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("assignRationaleToUser", () => {
    it("should create a new assignment when none exists", async () => {
      mockGetUserId.mockResolvedValue("admin-123");
      mockRequireSpaceAdmin.mockResolvedValue(undefined);

      const mockTopic = { space: "test-space" };
      const selectMock = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockTopic]),
          }),
        }),
      };
      (db.select as jest.Mock).mockReturnValue(selectMock);

      // Mock existing assignment check (no existing assignment)
      const existingSelectMock = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]), // No existing assignment
          }),
        }),
      };
      (db.select as jest.Mock)
        .mockReturnValueOnce(selectMock)
        .mockReturnValueOnce(existingSelectMock);

      const mockAssignment = {
        id: "test-id-123",
        topicId: 1,
        userId: "user-456",
        spaceId: "test-space",
        assignedBy: "admin-123",
        promptMessage: "Test prompt",
      };

      const insertMock = {
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockAssignment]),
        }),
      };
      (db.insert as jest.Mock).mockReturnValue(insertMock);

      const result = await assignRationaleToUser(1, "user-456", "Test prompt");

      expect(mockGetUserId).toHaveBeenCalled();
      expect(mockRequireSpaceAdmin).toHaveBeenCalledWith(
        "admin-123",
        "test-space"
      );
      expect(db.insert).toHaveBeenCalled();
      expect(result).toEqual(mockAssignment);
    });

    it("should update existing assignment when one exists", async () => {
      mockGetUserId.mockResolvedValue("admin-123");
      mockRequireSpaceAdmin.mockResolvedValue(undefined);

      const mockTopic = { space: "test-space" };
      const selectMock = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockTopic]),
          }),
        }),
      };

      const existingAssignment = { id: "existing-123" };
      const existingSelectMock = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([existingAssignment]),
          }),
        }),
      };

      (db.select as jest.Mock)
        .mockReturnValueOnce(selectMock)
        .mockReturnValueOnce(existingSelectMock);

      const updatedAssignment = {
        id: "existing-123",
        promptMessage: "Updated prompt",
        assignedBy: "admin-123",
      };

      const updateMock = {
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updatedAssignment]),
          }),
        }),
      };
      (db.update as jest.Mock).mockReturnValue(updateMock);

      const result = await assignRationaleToUser(
        1,
        "user-456",
        "Updated prompt"
      );

      expect(db.update).toHaveBeenCalled();
      expect(result).toEqual(updatedAssignment);
    });

    it("should throw error when user is not authenticated", async () => {
      mockGetUserId.mockResolvedValue(null);

      await expect(assignRationaleToUser(1, "user-456")).rejects.toThrow(
        "Must be authenticated to assign rationales"
      );
    });

    it("should throw error when topic is not found", async () => {
      mockGetUserId.mockResolvedValue("admin-123");

      const selectMock = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]), // No topic found
          }),
        }),
      };
      (db.select as jest.Mock).mockReturnValue(selectMock);

      await expect(assignRationaleToUser(999, "user-456")).rejects.toThrow(
        "Topic not found"
      );
    });
  });

  describe("removeRationaleAssignment", () => {
    it("should successfully remove an assignment", async () => {
      mockGetUserId.mockResolvedValue("admin-123");
      mockRequireSpaceAdmin.mockResolvedValue(undefined);

      const mockTopic = { space: "test-space" };
      const selectMock = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockTopic]),
          }),
        }),
      };
      (db.select as jest.Mock).mockReturnValue(selectMock);

      const deleteMock = {
        where: jest.fn().mockResolvedValue(undefined),
      };
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      (db.delete as jest.Mock).mockReturnValue(deleteMock);

      const result = await removeRationaleAssignment(1, "user-456");

      expect(mockRequireSpaceAdmin).toHaveBeenCalledWith(
        "admin-123",
        "test-space"
      );
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      expect(db.delete).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it("should throw error when user is not authenticated", async () => {
      mockGetUserId.mockResolvedValue(null);

      await expect(removeRationaleAssignment(1, "user-456")).rejects.toThrow(
        "Must be authenticated to remove assignments"
      );
    });
  });

  describe("fetchTopicAssignments", () => {
    it("should fetch assignments for a space", async () => {
      mockGetUserId.mockResolvedValue("admin-123");
      mockRequireSpaceAdmin.mockResolvedValue(undefined);

      const mockAssignments = [
        {
          id: "assignment-1",
          topicId: 1,
          topicName: "Test Topic",
          userId: "user-456",
          promptMessage: "Test prompt",
          completed: false,
          completedAt: null,
          createdAt: new Date(),
        },
      ];

      const selectMock = {
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockResolvedValue(mockAssignments),
            }),
          }),
        }),
      };
      (db.select as jest.Mock).mockReturnValue(selectMock);

      const result = await fetchTopicAssignments("test-space");

      expect(mockRequireSpaceAdmin).toHaveBeenCalledWith(
        "admin-123",
        "test-space"
      );
      expect(result).toEqual(mockAssignments);
    });

    it("should throw error when user is not authenticated", async () => {
      mockGetUserId.mockResolvedValue(null);

      await expect(fetchTopicAssignments("test-space")).rejects.toThrow(
        "Must be authenticated to view assignments"
      );
    });
  });

  describe("fetchUserAssignments", () => {
    it("should fetch assignments for a user", async () => {
      const mockAssignments = [
        {
          id: "assignment-1",
          topicId: 1,
          topicName: "Test Topic",
          spaceId: "test-space",
          promptMessage: "Test prompt",
          completed: false,
          createdAt: new Date(),
        },
      ];

      const selectMock = {
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockResolvedValue(mockAssignments),
            }),
          }),
        }),
      };
      (db.select as jest.Mock).mockReturnValue(selectMock);

      const result = await fetchUserAssignments("user-456");

      expect(result).toEqual(mockAssignments);
    });
  });

  describe("markAssignmentCompleted", () => {
    it("should mark assignment as completed", async () => {
      mockGetUserId.mockResolvedValue("user-456");

      const completedAssignment = {
        id: "assignment-1",
        completed: true,
        completedAt: expect.any(Date),
      };

      const updateMock = {
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([completedAssignment]),
          }),
        }),
      };
      (db.update as jest.Mock).mockReturnValue(updateMock);

      const result = await markAssignmentCompleted("assignment-1");

      expect(result).toEqual(completedAssignment);
    });

    it("should throw error when user is not authenticated", async () => {
      mockGetUserId.mockResolvedValue(null);

      await expect(markAssignmentCompleted("assignment-1")).rejects.toThrow(
        "Must be authenticated to complete assignments"
      );
    });
  });
});
