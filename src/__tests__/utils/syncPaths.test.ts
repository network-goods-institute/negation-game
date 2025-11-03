import { buildRationaleDetailPath, isSyncHost } from "@/utils/hosts/syncPaths";

describe("syncPaths helpers", () => {
  describe("isSyncHost", () => {
    it("matches exact sync.negationgame.com", () => {
      expect(isSyncHost("sync.negationgame.com")).toBe(true);
    });
    it("ignores port and remains true", () => {
      expect(isSyncHost("sync.negationgame.com:443")).toBe(true);
    });
    it("matches any host starting with sync.", () => {
      expect(isSyncHost("sync.example.com")).toBe(true);
    });
    it("returns false for other hosts", () => {
      expect(isSyncHost("play.negationgame.com")).toBe(false);
      expect(isSyncHost("negationgame.com")).toBe(false);
      expect(isSyncHost("")).toBe(false);
      expect(isSyncHost(undefined as any)).toBe(false);
    });

    it("returns false for IPv6 loopback hosts", () => {
      expect(isSyncHost("::1")).toBe(false);
      expect(isSyncHost("[::1]:3000")).toBe(false);
    });
  });

  describe("buildRationaleDetailPath", () => {
    it("uses /board/:id on sync host", () => {
      expect(buildRationaleDetailPath("abc", "sync.negationgame.com")).toBe(
        "/board/abc"
      );
    });

    it("uses /experiment path on non-sync host", () => {
      expect(buildRationaleDetailPath("abc", "play.negationgame.com")).toBe(
        "/experiment/rationale/multiplayer/abc"
      );
    });

    it("encodes id component", () => {
      expect(buildRationaleDetailPath("a b/c", "sync.negationgame.com")).toBe(
        "/board/a%20b%2Fc"
      );
    });

    it("combines slug and id into one segment when provided (sync)", () => {
      expect(
        buildRationaleDetailPath("m-123", "sync.negationgame.com", "my-board")
      ).toBe("/board/my-board_m-123");
    });

    it("encodes slug in combined segment (non-sync)", () => {
      expect(
        buildRationaleDetailPath("m-123", "play.negationgame.com", "a b/c")
      ).toBe("/experiment/rationale/multiplayer/a%20b%2Fc_m-123");
    });
  });
});
