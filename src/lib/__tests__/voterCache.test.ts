import { voterCache } from "../voterCache";
import type { VoterData } from "@/types/voters";

describe("VoterCache", () => {
  beforeEach(() => {
    voterCache.clear();
  });

  describe("set and get", () => {
    it("should store and retrieve voter data", () => {
      const voter: VoterData = {
        id: "user-1",
        username: "Alice",
        avatarUrl: "https://example.com/alice.jpg",
      };

      voterCache.set("user-1", voter);
      const result = voterCache.get("user-1");

      expect(result).toEqual(voter);
    });

    it("should return null for non-existent users", () => {
      const result = voterCache.get("non-existent");
      expect(result).toBeNull();
    });

    it("should return null for expired entries", () => {
      const voter: VoterData = {
        id: "user-1",
        username: "Alice",
        avatarUrl: null,
      };

      voterCache.set("user-1", voter);

      // Mock Date.now to simulate time passing
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 2 * 60 * 1000); // beyond 1 minute cache

      const result = voterCache.get("user-1");
      expect(result).toBeNull();

      // Restore Date.now
      Date.now = originalNow;
    });

    it("should not expire entries before cache duration", () => {
      const voter: VoterData = {
        id: "user-1",
        username: "Alice",
        avatarUrl: null,
      };

      voterCache.set("user-1", voter);

      // Mock Date.now to simulate 30 seconds passing (under the 1 minute cache)
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 30 * 1000);

      const result = voterCache.get("user-1");
      expect(result).toEqual(voter);

      // Restore Date.now
      Date.now = originalNow;
    });
  });

  describe("setMany", () => {
    it("should store multiple voters at once", () => {
      const voters: VoterData[] = [
        { id: "user-1", username: "Alice", avatarUrl: null },
        { id: "user-2", username: "Bob", avatarUrl: "https://example.com/bob.jpg" },
        { id: "user-3", username: "Charlie", avatarUrl: null },
      ];

      voterCache.setMany(voters);

      expect(voterCache.get("user-1")?.username).toBe("Alice");
      expect(voterCache.get("user-2")?.username).toBe("Bob");
      expect(voterCache.get("user-3")?.username).toBe("Charlie");
    });

    it("should handle empty array", () => {
      voterCache.setMany([]);
      expect(voterCache.get("user-1")).toBeNull();
    });
  });

  describe("getMany", () => {
    it("should return cached and missing voters", () => {
      const cachedVoters: VoterData[] = [
        { id: "user-1", username: "Alice", avatarUrl: null },
        { id: "user-2", username: "Bob", avatarUrl: null },
      ];

      voterCache.setMany(cachedVoters);

      const { cached, missing } = voterCache.getMany([
        "user-1",
        "user-2",
        "user-3",
        "user-4",
      ]);

      expect(cached).toHaveLength(2);
      expect(cached.map(v => v.id)).toEqual(["user-1", "user-2"]);
      expect(missing).toEqual(["user-3", "user-4"]);
    });

    it("should return all cached when nothing is missing", () => {
      const voters: VoterData[] = [
        { id: "user-1", username: "Alice", avatarUrl: null },
        { id: "user-2", username: "Bob", avatarUrl: null },
      ];

      voterCache.setMany(voters);

      const { cached, missing } = voterCache.getMany(["user-1", "user-2"]);

      expect(cached).toHaveLength(2);
      expect(missing).toHaveLength(0);
    });

    it("should return all missing when nothing is cached", () => {
      const { cached, missing } = voterCache.getMany(["user-1", "user-2"]);

      expect(cached).toHaveLength(0);
      expect(missing).toEqual(["user-1", "user-2"]);
    });

    it("should handle empty input array", () => {
      const { cached, missing } = voterCache.getMany([]);

      expect(cached).toHaveLength(0);
      expect(missing).toHaveLength(0);
    });

    it("should not return expired entries as cached", () => {
      const voter: VoterData = {
        id: "user-1",
        username: "Alice",
        avatarUrl: null,
      };

      voterCache.set("user-1", voter);

      // Simulate 6 minutes passing
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 6 * 60 * 1000);

      const { cached, missing } = voterCache.getMany(["user-1", "user-2"]);

      expect(cached).toHaveLength(0);
      expect(missing).toEqual(["user-1", "user-2"]);

      // Restore Date.now
      Date.now = originalNow;
    });
  });

  describe("clear", () => {
    it("should remove all entries from cache", () => {
      const voters: VoterData[] = [
        { id: "user-1", username: "Alice", avatarUrl: null },
        { id: "user-2", username: "Bob", avatarUrl: null },
      ];

      voterCache.setMany(voters);
      expect(voterCache.get("user-1")).not.toBeNull();
      expect(voterCache.get("user-2")).not.toBeNull();

      voterCache.clear();

      expect(voterCache.get("user-1")).toBeNull();
      expect(voterCache.get("user-2")).toBeNull();
    });
  });

  describe("overwriting entries", () => {
    it("should overwrite existing entries with new data", () => {
      const voter1: VoterData = {
        id: "user-1",
        username: "Alice",
        avatarUrl: null,
      };

      const voter2: VoterData = {
        id: "user-1",
        username: "Alice Updated",
        avatarUrl: "https://example.com/alice-new.jpg",
      };

      voterCache.set("user-1", voter1);
      expect(voterCache.get("user-1")?.username).toBe("Alice");

      voterCache.set("user-1", voter2);
      expect(voterCache.get("user-1")?.username).toBe("Alice Updated");
      expect(voterCache.get("user-1")?.avatarUrl).toBe("https://example.com/alice-new.jpg");
    });
  });
});
