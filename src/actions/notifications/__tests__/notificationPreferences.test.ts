// Mock dependencies before importing the implementation
jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(),
}));

jest.mock("@/db/schema", () => ({
  notificationPreferencesTable: {
    userId: "user_id",
    endorsementNotifications: "endorsement_notifications",
    negationNotifications: "negation_notifications",
    restakeNotifications: "restake_notifications",
    rationaleNotifications: "rationale_notifications",
    messageNotifications: "message_notifications",
    scrollProposalNotifications: "scroll_proposal_notifications",
    digestFrequency: "digest_frequency",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
}));

jest.mock("@/services/db", () => {
  const mockDb = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  };
  return { db: mockDb };
});

jest.mock("drizzle-orm", () => ({
  eq: jest.fn((a, b) => ({ column: a, value: b })),
}));

import { getNotificationPreferences } from "../getNotificationPreferences";
import { updateNotificationPreferences } from "../updateNotificationPreferences";
import { getUserId } from "@/actions/users/getUserId";
import { db } from "@/services/db";
import { notificationPreferencesTable } from "@/db/schema";

describe("Notification Preferences", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getNotificationPreferences", () => {
    it("should throw error if user is not authenticated", async () => {
      (getUserId as jest.Mock).mockResolvedValue(null);

      await expect(getNotificationPreferences()).rejects.toThrow(
        "Must be authenticated to get notification preferences"
      );
    });

    it("should return existing preferences if found", async () => {
      (getUserId as jest.Mock).mockResolvedValue("user-123");

      const existingPrefs = {
        userId: "user-123",
        endorsementNotifications: true,
        negationNotifications: false,
        restakeNotifications: true,
        rationaleNotifications: true,
        messageNotifications: true,
        scrollProposalNotifications: false,
        digestFrequency: "weekly",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const selectMock = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existingPrefs]),
      };
      (db.select as jest.Mock).mockReturnValue(selectMock);

      const result = await getNotificationPreferences();

      expect(result).toEqual(existingPrefs);
      expect(db.select).toHaveBeenCalled();
      expect(selectMock.from).toHaveBeenCalledWith(
        notificationPreferencesTable
      );
    });

    it("should create default preferences if none exist", async () => {
      (getUserId as jest.Mock).mockResolvedValue("user-123");

      const selectMock = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]), // No existing preferences
      };
      (db.select as jest.Mock).mockReturnValue(selectMock);

      const defaultPrefs = {
        userId: "user-123",
        endorsementNotifications: true,
        negationNotifications: true,
        restakeNotifications: true,
        rationaleNotifications: true,
        messageNotifications: true,
        scrollProposalNotifications: false,
        digestFrequency: "daily",
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      };

      const insertMock = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([defaultPrefs]),
      };
      (db.insert as jest.Mock).mockReturnValue(insertMock);

      const result = await getNotificationPreferences();

      expect(result).toEqual(defaultPrefs);
      expect(db.insert).toHaveBeenCalledWith(notificationPreferencesTable);
      expect(insertMock.values).toHaveBeenCalledWith(defaultPrefs);
    });
  });

  describe("updateNotificationPreferences", () => {
    it("should throw error if user is not authenticated", async () => {
      (getUserId as jest.Mock).mockResolvedValue(null);

      await expect(
        updateNotificationPreferences({ endorsementNotifications: false })
      ).rejects.toThrow(
        "Must be authenticated to update notification preferences"
      );
    });

    it("should update existing preferences", async () => {
      (getUserId as jest.Mock).mockResolvedValue("user-123");

      const existingPrefs = {
        userId: "user-123",
        endorsementNotifications: true,
        negationNotifications: true,
        restakeNotifications: true,
        rationaleNotifications: true,
        messageNotifications: true,
        scrollProposalNotifications: false,
        digestFrequency: "daily",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const selectMock = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existingPrefs]),
      };
      (db.select as jest.Mock).mockReturnValue(selectMock);

      const updatedPrefs = {
        ...existingPrefs,
        endorsementNotifications: false,
        updatedAt: expect.any(Date),
      };

      const updateMock = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([updatedPrefs]),
      };
      (db.update as jest.Mock).mockReturnValue(updateMock);

      const result = await updateNotificationPreferences({
        endorsementNotifications: false,
      });

      expect(result).toEqual(updatedPrefs);
      expect(db.update).toHaveBeenCalledWith(notificationPreferencesTable);
      expect(updateMock.set).toHaveBeenCalledWith({
        endorsementNotifications: false,
        updatedAt: expect.any(Date),
      });
    });

    it("should create preferences with updates if none exist", async () => {
      (getUserId as jest.Mock).mockResolvedValue("user-123");

      const selectMock = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]), // No existing preferences
      };
      (db.select as jest.Mock).mockReturnValue(selectMock);

      const newPrefs = {
        userId: "user-123",
        endorsementNotifications: true,
        negationNotifications: true,
        restakeNotifications: true,
        rationaleNotifications: true,
        messageNotifications: true,
        scrollProposalNotifications: true, // Updated value
        digestFrequency: "daily",
        updatedAt: expect.any(Date),
      };

      const insertMock = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([newPrefs]),
      };
      (db.insert as jest.Mock).mockReturnValue(insertMock);

      const result = await updateNotificationPreferences({
        scrollProposalNotifications: true,
      });

      expect(result).toEqual(newPrefs);
      expect(db.insert).toHaveBeenCalledWith(notificationPreferencesTable);
      expect(insertMock.values).toHaveBeenCalledWith(newPrefs);
    });
  });
});
