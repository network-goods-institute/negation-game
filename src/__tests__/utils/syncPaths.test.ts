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

    it("accepts slug as well as id", () => {
      expect(
        buildRationaleDetailPath("my-board", "sync.negationgame.com")
      ).toBe("/board/my-board");
    });
  });
});
