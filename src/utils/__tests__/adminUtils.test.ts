import {
  isUserSiteAdmin,
  isUserSpaceAdmin,
  requireSiteAdmin,
  requireSpaceAdmin,
} from "../adminUtils";

jest.mock("@/services/db", () => ({
  db: {
    select: jest.fn(),
  },
}));

jest.mock("@/db/schema", () => ({
  usersTable: {
    siteAdmin: "site_admin",
    id: "id",
  },
  spaceAdminsTable: {
    userId: "user_id",
    spaceId: "space_id",
  },
}));

describe("adminUtils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("isUserSiteAdmin", () => {
    it("should return true when user is site admin", async () => {
      const mockDb = await import("@/services/db");
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ siteAdmin: true }]),
          }),
        }),
      });
      mockDb.db.select = mockSelect;

      const result = await isUserSiteAdmin("user123");

      expect(result).toBe(true);
      expect(mockSelect).toHaveBeenCalledWith({ siteAdmin: "site_admin" });
    });

    it("should return false when user is not site admin", async () => {
      const mockDb = await import("@/services/db");
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ siteAdmin: false }]),
          }),
        }),
      });
      mockDb.db.select = mockSelect;

      const result = await isUserSiteAdmin("user123");

      expect(result).toBe(false);
    });

    it("should return false when user not found", async () => {
      const mockDb = await import("@/services/db");
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });
      mockDb.db.select = mockSelect;

      const result = await isUserSiteAdmin("user123");

      expect(result).toBe(false);
    });
  });

  describe("isUserSpaceAdmin", () => {
    it("should return true when user is site admin", async () => {
      const mockDb = await import("@/services/db");
      const mockSelect = jest.fn().mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ siteAdmin: true }]),
          }),
        }),
      });
      mockDb.db.select = mockSelect;

      const result = await isUserSpaceAdmin("user123", "space1");

      expect(result).toBe(true);
    });

    it("should return true when user is space admin", async () => {
      const mockDb = await import("@/services/db");
      const mockSelect = jest
        .fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{ siteAdmin: false }]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest
                .fn()
                .mockResolvedValue([{ userId: "user123", spaceId: "space1" }]),
            }),
          }),
        });
      mockDb.db.select = mockSelect;

      const result = await isUserSpaceAdmin("user123", "space1");

      expect(result).toBe(true);
    });

    it("should return false when user is neither site nor space admin", async () => {
      const mockDb = await import("@/services/db");
      const mockSelect = jest
        .fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{ siteAdmin: false }]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        });
      mockDb.db.select = mockSelect;

      const result = await isUserSpaceAdmin("user123", "space1");

      expect(result).toBe(false);
    });
  });

  describe("requireSiteAdmin", () => {
    it("should not throw when user is site admin", async () => {
      const mockDb = await import("@/services/db");
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ siteAdmin: true }]),
          }),
        }),
      });
      mockDb.db.select = mockSelect;

      await expect(requireSiteAdmin("user123")).resolves.not.toThrow();
    });

    it("should throw when user is not site admin", async () => {
      const mockDb = await import("@/services/db");
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ siteAdmin: false }]),
          }),
        }),
      });
      mockDb.db.select = mockSelect;

      await expect(requireSiteAdmin("user123")).rejects.toThrow(
        "Site admin access required"
      );
    });
  });

  describe("requireSpaceAdmin", () => {
    it("should not throw when user is space admin", async () => {
      const mockDb = await import("@/services/db");
      const mockSelect = jest
        .fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{ siteAdmin: false }]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest
                .fn()
                .mockResolvedValue([{ userId: "user123", spaceId: "space1" }]),
            }),
          }),
        });
      mockDb.db.select = mockSelect;

      await expect(
        requireSpaceAdmin("user123", "space1")
      ).resolves.not.toThrow();
    });

    it("should throw when user is not space admin", async () => {
      const mockDb = await import("@/services/db");
      const mockSelect = jest
        .fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{ siteAdmin: false }]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        });
      mockDb.db.select = mockSelect;

      await expect(requireSpaceAdmin("user123", "space1")).rejects.toThrow(
        "Space admin access required"
      );
    });
  });
});
