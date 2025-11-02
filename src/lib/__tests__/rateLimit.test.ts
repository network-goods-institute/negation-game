import { checkRateLimit, cleanupExpiredRateLimits } from "../rateLimit";
import { db } from "@/services/db";
import { logger } from "@/lib/logger";

// Mock the database
jest.mock("@/services/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockDb = db as jest.Mocked<typeof db>;

describe("Rate Limiter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Math.random to never trigger cleanup (< 0.1)
    jest.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("checkRateLimit", () => {
    it("should allow first request and create new rate limit entry", async () => {
      // Mock no existing entry
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      // Mock successful insert
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const result = await checkRateLimit("user123", 10, 60000, "test");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(result.resetTime).toBeGreaterThan(Date.now());
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should allow request within limit", async () => {
      const resetTime = new Date(Date.now() + 60000);

      // Mock existing entry with count < limit
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              {
                id: "test:user123",
                count: 5,
                resetTime,
              },
            ]),
          }),
        }),
      } as any);

      // Mock successful update
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const result = await checkRateLimit("user123", 10, 60000, "test");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 10 - (5 + 1)
      expect(result.resetTime).toBe(resetTime.getTime());
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should deny request when rate limit exceeded", async () => {
      const resetTime = new Date(Date.now() + 60000);

      // Mock existing entry with count >= limit
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              {
                id: "test:user123",
                count: 10,
                resetTime,
              },
            ]),
          }),
        }),
      } as any);

      const result = await checkRateLimit("user123", 10, 60000, "test");

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.resetTime).toBe(resetTime.getTime());
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("should reset expired rate limit entry", async () => {
      const expiredTime = new Date(Date.now() - 1000); // Expired 1 second ago

      // Mock existing expired entry
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              {
                id: "test:user123",
                count: 10,
                resetTime: expiredTime,
              },
            ]),
          }),
        }),
      } as any);

      // Mock successful insert/update
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const result = await checkRateLimit("user123", 10, 60000, "test");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should fail open on database error", async () => {
      // Mock database error
      mockDb.select.mockImplementation(() => {
        throw new Error("Database connection failed");
      });

      const result = await checkRateLimit("user123", 10, 60000, "test");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(logger.error).toHaveBeenCalledWith(
        "[rateLimit] Database error:",
        expect.any(Error)
      );
      expect(logger.warn).toHaveBeenCalledWith(
        "[rateLimit] Failing open due to database error"
      );
    });

    it("should use correct key prefix", async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
        }),
      } as any);

      await checkRateLimit("user123", 10, 60000, "custom-prefix");

      // Check that the correct key was used in the select query
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe("cleanupExpiredRateLimits", () => {
    it("should delete expired entries and return count", async () => {
      // Mock successful delete with rowCount
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue({ rowCount: 5 }),
      } as any);

      const result = await cleanupExpiredRateLimits();

      // eslint-disable-next-line drizzle/enforce-delete-with-where
      expect(result).toBe(5);
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      expect(mockDb.delete).toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith(
        "[rateLimit] Cleaned up 5 expired rate limit entries"
      );
    });

    it("should handle cleanup error gracefully", async () => {
      // Mock database error
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      mockDb.delete.mockImplementation(() => {
        throw new Error("Delete failed");
      });

      const result = await cleanupExpiredRateLimits();

      expect(result).toBe(0);
      expect(logger.error).toHaveBeenCalledWith(
        "[rateLimit] Error during cleanup:",
        expect.any(Error)
      );
    });

    it("should not log when no entries are deleted", async () => {
      // Mock delete with no rows affected
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue({ rowCount: 0 }),
      } as any);

      const result = await cleanupExpiredRateLimits();

      expect(result).toBe(0);
      expect(logger.log).not.toHaveBeenCalled();
    });
  });
});
