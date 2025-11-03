import {
  isSyncHost,
  isRootOrSyncHost,
  buildRationaleDetailPath,
  buildRationaleIndexPath,
} from "@/utils/hosts/syncPaths";

describe("syncPaths", () => {
  describe("isSyncHost", () => {
    test("returns true for sync.negationgame.com", () => {
      expect(isSyncHost("sync.negationgame.com")).toBe(true);
    });

    test("returns true for sync subdomain with port", () => {
      expect(isSyncHost("sync.negationgame.com:3000")).toBe(true);
    });

    test("returns true for sync.localhost", () => {
      expect(isSyncHost("sync.localhost")).toBe(true);
    });

    test("returns false for play.negationgame.com", () => {
      expect(isSyncHost("play.negationgame.com")).toBe(false);
    });

    test("returns false for negationgame.com", () => {
      expect(isSyncHost("negationgame.com")).toBe(false);
    });

    test("returns false for scroll.negationgame.com", () => {
      expect(isSyncHost("scroll.negationgame.com")).toBe(false);
    });

    test("returns false for localhost", () => {
      expect(isSyncHost("localhost")).toBe(false);
    });

    test("returns false for null", () => {
      expect(isSyncHost(null)).toBe(false);
    });

    test("returns false for undefined", () => {
      expect(isSyncHost(undefined)).toBe(false);
    });

    test("returns false for empty string", () => {
      expect(isSyncHost("")).toBe(false);
    });
  });

  describe("isRootOrSyncHost", () => {
    test("returns true for negationgame.com", () => {
      expect(isRootOrSyncHost("negationgame.com")).toBe(true);
    });

    test("returns true for sync.negationgame.com", () => {
      expect(isRootOrSyncHost("sync.negationgame.com")).toBe(true);
    });

    test("returns true for localhost", () => {
      expect(isRootOrSyncHost("localhost")).toBe(true);
    });

    test("returns true for localhost:3000", () => {
      expect(isRootOrSyncHost("localhost:3000")).toBe(true);
    });

    test("returns true for ::1", () => {
      expect(isRootOrSyncHost("::1")).toBe(true);
    });

    test("returns true for [::1]:3000", () => {
      expect(isRootOrSyncHost("[::1]:3000")).toBe(true);
    });

    test("returns true for sync.localhost", () => {
      expect(isRootOrSyncHost("sync.localhost")).toBe(true);
    });

    test("returns false for play.negationgame.com", () => {
      expect(isRootOrSyncHost("play.negationgame.com")).toBe(false);
    });

    test("returns false for scroll.negationgame.com", () => {
      expect(isRootOrSyncHost("scroll.negationgame.com")).toBe(false);
    });

    test("returns false for global.negationgame.com", () => {
      expect(isRootOrSyncHost("global.negationgame.com")).toBe(false);
    });

    test("returns false for null", () => {
      expect(isRootOrSyncHost(null)).toBe(false);
    });

    test("returns false for undefined", () => {
      expect(isRootOrSyncHost(undefined)).toBe(false);
    });

    test("returns false for empty string", () => {
      expect(isRootOrSyncHost("")).toBe(false);
    });

    test("handles case insensitivity", () => {
      expect(isRootOrSyncHost("NegationGame.com")).toBe(true);
      expect(isRootOrSyncHost("SYNC.negationgame.com")).toBe(true);
      expect(isRootOrSyncHost("LocalHost")).toBe(true);
    });
  });

  describe("buildRationaleDetailPath", () => {
    describe("for root or sync hosts", () => {
      test("returns /board/:id for negationgame.com", () => {
        const path = buildRationaleDetailPath("abc123", "negationgame.com");
        expect(path).toBe("/board/abc123");
      });

      test("returns /board/:id for sync.negationgame.com", () => {
        const path = buildRationaleDetailPath("abc123", "sync.negationgame.com");
        expect(path).toBe("/board/abc123");
      });

      test("returns /board/:id for localhost", () => {
        const path = buildRationaleDetailPath("abc123", "localhost");
        expect(path).toBe("/board/abc123");
      });

      test("returns /board/:id for localhost:3000", () => {
        const path = buildRationaleDetailPath("abc123", "localhost:3000");
        expect(path).toBe("/board/abc123");
      });

      test("returns /board/:id for ::1", () => {
        const path = buildRationaleDetailPath("abc123", "::1");
        expect(path).toBe("/board/abc123");
      });

      test("returns /board/:id for [::1]:3000", () => {
        const path = buildRationaleDetailPath("abc123", "[::1]:3000");
        expect(path).toBe("/board/abc123");
      });

      test("returns /board/:slug_:id when slug is provided", () => {
        const path = buildRationaleDetailPath("abc123", "negationgame.com", "my-board");
        expect(path).toBe("/board/my-board_abc123");
      });

      test("returns /board/:id when slug is empty string", () => {
        const path = buildRationaleDetailPath("abc123", "negationgame.com", "");
        expect(path).toBe("/board/abc123");
      });

      test("returns /board/:id when slug is only whitespace", () => {
        const path = buildRationaleDetailPath("abc123", "negationgame.com", "   ");
        expect(path).toBe("/board/abc123");
      });

      test("encodes special characters in slug", () => {
        const path = buildRationaleDetailPath("abc123", "negationgame.com", "my board name");
        expect(path).toBe("/board/my%20board%20name_abc123");
      });

      test("encodes special characters in id", () => {
        const path = buildRationaleDetailPath("abc 123", "negationgame.com");
        expect(path).toBe("/board/abc%20123");
      });
    });

    describe("for other hosts", () => {
      test("returns /experiment/rationale/multiplayer/:id for play.negationgame.com", () => {
        const path = buildRationaleDetailPath("abc123", "play.negationgame.com");
        expect(path).toBe("/experiment/rationale/multiplayer/abc123");
      });

      test("returns /experiment/rationale/multiplayer/:id for scroll.negationgame.com", () => {
        const path = buildRationaleDetailPath("abc123", "scroll.negationgame.com");
        expect(path).toBe("/experiment/rationale/multiplayer/abc123");
      });

      test("returns /experiment/rationale/multiplayer/:slug_:id when slug is provided", () => {
        const path = buildRationaleDetailPath("abc123", "play.negationgame.com", "my-board");
        expect(path).toBe("/experiment/rationale/multiplayer/my-board_abc123");
      });

      test("returns /experiment/rationale/multiplayer/:id when host is null", () => {
        const path = buildRationaleDetailPath("abc123", null);
        expect(path).toBe("/experiment/rationale/multiplayer/abc123");
      });

      test("returns /experiment/rationale/multiplayer/:id when host is undefined", () => {
        const path = buildRationaleDetailPath("abc123", undefined);
        expect(path).toBe("/experiment/rationale/multiplayer/abc123");
      });

      test("returns /experiment/rationale/multiplayer/:id when host is empty string", () => {
        const path = buildRationaleDetailPath("abc123", "");
        expect(path).toBe("/experiment/rationale/multiplayer/abc123");
      });
    });
  });

  describe("buildRationaleIndexPath", () => {
    describe("for root or sync hosts", () => {
      test("returns / for negationgame.com", () => {
        const path = buildRationaleIndexPath("negationgame.com");
        expect(path).toBe("/");
      });

      test("returns / for sync.negationgame.com", () => {
        const path = buildRationaleIndexPath("sync.negationgame.com");
        expect(path).toBe("/");
      });

      test("returns / for localhost", () => {
        const path = buildRationaleIndexPath("localhost");
        expect(path).toBe("/");
      });

      test("returns / for localhost:3000", () => {
        const path = buildRationaleIndexPath("localhost:3000");
        expect(path).toBe("/");
      });

      test("returns / for ::1", () => {
        const path = buildRationaleIndexPath("::1");
        expect(path).toBe("/");
      });

      test("returns / for [::1]:3000", () => {
        const path = buildRationaleIndexPath("[::1]:3000");
        expect(path).toBe("/");
      });
    });

    describe("for other hosts", () => {
      test("returns /experiment/rationale/multiplayer for play.negationgame.com", () => {
        const path = buildRationaleIndexPath("play.negationgame.com");
        expect(path).toBe("/experiment/rationale/multiplayer");
      });

      test("returns /experiment/rationale/multiplayer for scroll.negationgame.com", () => {
        const path = buildRationaleIndexPath("scroll.negationgame.com");
        expect(path).toBe("/experiment/rationale/multiplayer");
      });

      test("returns /experiment/rationale/multiplayer when host is null", () => {
        const path = buildRationaleIndexPath(null);
        expect(path).toBe("/experiment/rationale/multiplayer");
      });

      test("returns /experiment/rationale/multiplayer when host is undefined", () => {
        const path = buildRationaleIndexPath(undefined);
        expect(path).toBe("/experiment/rationale/multiplayer");
      });

      test("returns /experiment/rationale/multiplayer when host is empty string", () => {
        const path = buildRationaleIndexPath("");
        expect(path).toBe("/experiment/rationale/multiplayer");
      });
    });
  });

  describe("Integration scenarios", () => {
    test("building paths for sync.negationgame.com with slug", () => {
      const indexPath = buildRationaleIndexPath("sync.negationgame.com");
      const detailPath = buildRationaleDetailPath("xyz789", "sync.negationgame.com", "my-cool-board");

      expect(indexPath).toBe("/");
      expect(detailPath).toBe("/board/my-cool-board_xyz789");
    });

    test("building paths for play.negationgame.com with slug", () => {
      const indexPath = buildRationaleIndexPath("play.negationgame.com");
      const detailPath = buildRationaleDetailPath("xyz789", "play.negationgame.com", "my-cool-board");

      expect(indexPath).toBe("/experiment/rationale/multiplayer");
      expect(detailPath).toBe("/experiment/rationale/multiplayer/my-cool-board_xyz789");
    });

    test("building paths for negationgame.com (root) with slug", () => {
      const indexPath = buildRationaleIndexPath("negationgame.com");
      const detailPath = buildRationaleDetailPath("xyz789", "negationgame.com", "my-cool-board");

      expect(indexPath).toBe("/");
      expect(detailPath).toBe("/board/my-cool-board_xyz789");
    });

    test("building paths for unknown host defaults to long paths", () => {
      const indexPath = buildRationaleIndexPath("unknown.example.com");
      const detailPath = buildRationaleDetailPath("xyz789", "unknown.example.com", "test");

      expect(indexPath).toBe("/experiment/rationale/multiplayer");
      expect(detailPath).toBe("/experiment/rationale/multiplayer/test_xyz789");
    });
  });
});
