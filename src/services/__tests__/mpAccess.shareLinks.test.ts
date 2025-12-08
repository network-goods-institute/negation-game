jest.mock("@/services/db", () => {
  const makeQuery = (rows: any[]) => ({
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn(async () => rows),
  });

  let shareLinkRows: any[] = [];

  const db = {
    select: jest.fn((selection: any) => {
      if (selection && "ownerId" in selection) {
        return makeQuery([{ id: "doc-1", ownerId: "owner-1", slug: "doc-slug" }]);
      }
      if (selection && "requireLogin" in selection && "token" in selection) {
        return makeQuery(shareLinkRows);
      }
      if (selection && Object.keys(selection).length === 1 && "role" in selection) {
        return makeQuery([]); // permissions
      }
      return makeQuery([]);
    }),
    insert: jest.fn(() => ({
      values: jest.fn().mockReturnThis(),
      onConflictDoUpdate: jest.fn().mockReturnThis(),
    })),
    __setShareLinkRows: (rows: any[]) => {
      shareLinkRows = rows;
    },
  };

  return { db };
});

jest.mock("@/utils/slugResolver", () => ({
  resolveSlugToId: jest.fn(async (id: string) => id),
  isValidSlugOrId: () => true,
}));

describe("resolveDocAccess share links", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("allows anonymous edit when share link does not require login", async () => {
    const { db } = require("@/services/db");
    db.__setShareLinkRows([
      {
        id: "link-1",
        role: "editor",
        requireLogin: false,
        expiresAt: null,
        disabledAt: null,
      },
    ]);
    const { resolveDocAccess } = require("@/services/mpAccess");

    const res = await resolveDocAccess("doc-1", { userId: null, shareToken: "sl-abc123456789012345678" });
    expect(res).toEqual({
      status: "ok",
      docId: "doc-1",
      ownerId: "owner-1",
      slug: "doc-slug",
      role: "editor",
      source: "share",
      shareLinkId: "link-1",
      requiresAuthForWrite: false,
    });
  });

  it("returns requiresAuth true for anonymous user without permissions", async () => {
    const { db } = require("@/services/db");
    db.__setShareLinkRows([]);
    const { resolveDocAccess } = require("@/services/mpAccess");

    const res = await resolveDocAccess("doc-1", { userId: null });
    expect(res).toEqual({
      status: "forbidden",
      docId: "doc-1",
      requiresAuth: true,
    });
  });

  it("returns requiresAuth false for authenticated user without permissions", async () => {
    const { db } = require("@/services/db");
    db.__setShareLinkRows([]);
    const { resolveDocAccess } = require("@/services/mpAccess");

    const res = await resolveDocAccess("doc-1", { userId: "user-123" });
    expect(res).toEqual({
      status: "forbidden",
      docId: "doc-1",
      requiresAuth: false,
    });
  });

  it("returns forbidden without requiresAuth for invalid share token format", async () => {
    const { db } = require("@/services/db");
    db.__setShareLinkRows([]);
    const { resolveDocAccess } = require("@/services/mpAccess");

    const res = await resolveDocAccess("doc-1", { userId: "user-123", shareToken: "invalid-token" });
    expect(res).toEqual({
      status: "forbidden",
      docId: "doc-1",
    });
    expect(res.requiresAuth).toBeUndefined();
  });

  it("returns requiresAuth true when share link requires login and user is anonymous", async () => {
    const { db } = require("@/services/db");
    db.__setShareLinkRows([
      {
        id: "link-1",
        role: "viewer",
        requireLogin: true,
        expiresAt: null,
        disabledAt: null,
      },
    ]);
    const { resolveDocAccess } = require("@/services/mpAccess");

    const res = await resolveDocAccess("doc-1", { userId: null, shareToken: "sl-abc123456789012345678" });
    expect(res).toEqual({
      status: "forbidden",
      docId: "doc-1",
      requiresAuth: true,
    });
  });
});
