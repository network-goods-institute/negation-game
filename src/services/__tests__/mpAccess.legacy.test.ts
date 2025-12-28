jest.mock("@/services/db", () => {
  const makeQuery = (rows: any[]) => ({
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn(async () => rows),
  });

  let docRows: any[] = [];

  const db = {
    select: jest.fn((selection: any) => {
      if (selection && "createdAt" in selection && "ownerId" in selection) {
        return makeQuery(docRows);
      }
      if (selection && Object.keys(selection).length === 1 && "role" in selection) {
        return makeQuery([]); // permissions
      }
      return makeQuery([]);
    }),
    __setDocRows: (rows: any[]) => {
      docRows = rows;
    },
  };

  return { db };
});

jest.mock("@/utils/slugResolver", () => ({
  resolveSlugToId: jest.fn(async (id: string) => id),
  isValidSlugOrId: () => true,
}));

describe("resolveDocAccess legacy public boards", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("grants editor access to anonymous users for legacy boards (created before Dec 8, 2025)", async () => {
    const { db } = require("@/services/db");
    db.__setDocRows([
      {
        id: "legacy-board-1",
        ownerId: "owner-1",
        slug: "legacy-slug",
        createdAt: new Date("2025-12-07T00:00:00Z"), // Before cutoff
      },
    ]);
    const { resolveDocAccess } = require("@/services/mpAccess");

    const res = await resolveDocAccess("legacy-board-1", { userId: null });
    expect(res).toEqual({
      status: "ok",
      docId: "legacy-board-1",
      ownerId: "owner-1",
      slug: "legacy-slug",
      role: "editor",
      source: "share",
    });
  });

  it("grants editor access to authenticated non-owners for legacy boards", async () => {
    const { db } = require("@/services/db");
    db.__setDocRows([
      {
        id: "legacy-board-2",
        ownerId: "owner-1",
        slug: "legacy-slug-2",
        createdAt: new Date("2025-11-01T00:00:00Z"), // Before cutoff
      },
    ]);
    const { resolveDocAccess } = require("@/services/mpAccess");

    const res = await resolveDocAccess("legacy-board-2", { userId: "some-other-user" });
    expect(res).toEqual({
      status: "ok",
      docId: "legacy-board-2",
      ownerId: "owner-1",
      slug: "legacy-slug-2",
      role: "editor",
      source: "share",
    });
  });

  it("grants owner access to actual owner for legacy boards", async () => {
    const { db } = require("@/services/db");
    db.__setDocRows([
      {
        id: "legacy-board-3",
        ownerId: "owner-1",
        slug: "legacy-slug-3",
        createdAt: new Date("2025-12-01T00:00:00Z"), // Before cutoff
      },
    ]);
    const { resolveDocAccess } = require("@/services/mpAccess");

    const res = await resolveDocAccess("legacy-board-3", { userId: "owner-1" });
    expect(res).toEqual({
      status: "ok",
      docId: "legacy-board-3",
      ownerId: "owner-1",
      slug: "legacy-slug-3",
      role: "owner",
      source: "owner",
    });
  });

  it("does NOT grant public access to boards created after Dec 8, 2025 12:57:38 UTC", async () => {
    const { db } = require("@/services/db");
    db.__setDocRows([
      {
        id: "new-board-1",
        ownerId: "owner-1",
        slug: "new-slug",
        createdAt: new Date("2025-12-08T12:57:39Z"), // After cutoff (1 second after)
      },
    ]);
    const { resolveDocAccess } = require("@/services/mpAccess");

    const res = await resolveDocAccess("new-board-1", { userId: null });
    expect(res).toEqual({
      status: "forbidden",
      docId: "new-board-1",
      requiresAuth: true,
    });
  });

  it("grants public access to boards created exactly at the cutoff time (edge case)", async () => {
    const { db } = require("@/services/db");
    db.__setDocRows([
      {
        id: "edge-board",
        ownerId: "owner-1",
        slug: "edge-slug",
        createdAt: new Date("2025-12-08T12:57:37Z"), // 1 second before cutoff
      },
    ]);
    const { resolveDocAccess } = require("@/services/mpAccess");

    const res = await resolveDocAccess("edge-board", { userId: null });
    expect(res).toEqual({
      status: "ok",
      docId: "edge-board",
      ownerId: "owner-1",
      slug: "edge-slug",
      role: "editor",
      source: "share",
    });
  });

  it("grants editor access to anon- prefixed users for legacy boards", async () => {
    const { db } = require("@/services/db");
    db.__setDocRows([
      {
        id: "legacy-board-4",
        ownerId: "owner-1",
        slug: "legacy-slug-4",
        createdAt: new Date("2025-10-15T00:00:00Z"), // Before cutoff
      },
    ]);
    const { resolveDocAccess } = require("@/services/mpAccess");

    const res = await resolveDocAccess("legacy-board-4", { userId: "anon-xyz123" });
    expect(res).toEqual({
      status: "ok",
      docId: "legacy-board-4",
      ownerId: "owner-1",
      slug: "legacy-slug-4",
      role: "editor",
      source: "share",
    });
  });
});
