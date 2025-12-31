jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(async () => "me"),
}));
jest.mock("@/services/mpAccess", () => ({
  resolveDocAccess: jest.fn(async (_id: string) => ({
    status: "forbidden",
    docId: _id,
    ownerId: "owner",
  })),
  canWriteRole: jest.fn(() => true),
}));

import { getUserId } from "@/actions/users/getUserId";

jest.mock("@/utils/slugResolver", () => ({
  resolveSlugToId: jest.fn(async (value: string) => value),
  isValidSlugOrId: (value: string) => Boolean(value),
}));

const mockDb: any = {
  insert: jest.fn(),
  update: jest.fn(),
  select: jest.fn(),
  transaction: jest.fn(async (callback) => callback(mockDb)),
};

jest.mock("@/services/db", () => ({
  db: mockDb,
}));

const { resolveDocAccess } = require("@/services/mpAccess");

const chainInsert = (row: any) => {
  const chain: any = {
    values: jest.fn(() => chain),
    onConflictDoUpdate: jest.fn(() => ({
      returning: jest.fn(async () => [row]),
    })),
    returning: jest.fn(async () => [row]),
  };
  return chain;
};

const chainUpdate = () => ({
  set: jest.fn(() => ({
    where: jest.fn(() => Promise.resolve()),
  })),
});

const chainSelectRequests = (rows: any[]) => ({
  from: jest.fn(() => ({
    leftJoin: jest.fn(() => ({
      leftJoin: jest.fn(() => ({
        where: jest.fn(() => ({
          orderBy: jest.fn(async () => rows),
        })),
      })),
    })),
  })),
});

const chainSelectRequestById = (rows: any[]) => ({
  from: jest.fn(() => ({
    leftJoin: jest.fn(() => ({
      where: jest.fn(() => ({
        limit: jest.fn(async () => rows),
      })),
    })),
  })),
});

describe("rationale access requests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getUserId as jest.Mock).mockResolvedValue("me");
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.select.mockReset();
    mockDb.transaction.mockImplementation(async (callback: any) => callback(mockDb));
    (resolveDocAccess as jest.Mock).mockResolvedValue({
      status: "forbidden",
      docId: "doc-1",
      ownerId: "owner",
    });
  });

  it("creates an access request when forbidden", async () => {
    mockDb.insert.mockReturnValue(chainInsert({ id: "req-1", status: "pending", requestedRole: "viewer" }));
    const { createAccessRequest } = await import("@/actions/experimental/rationaleAccess");
    const res = await createAccessRequest("doc-1", "viewer");
    expect(res).toEqual({ ok: true, status: "pending" });
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("returns already_has_access when user already has access", async () => {
    (resolveDocAccess as jest.Mock).mockResolvedValue({
      status: "ok",
      docId: "doc-1",
      ownerId: "owner",
      slug: null,
      role: "viewer",
      source: "share",
    });
    const { createAccessRequest } = await import("@/actions/experimental/rationaleAccess");
    const res = await createAccessRequest("doc-1", "viewer");
    expect(res).toEqual({ ok: false, status: "already_has_access" });
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("lists access requests for owners", async () => {
    const rows = [
      {
        id: "req-1",
        docId: "doc-1",
        docTitle: "Board",
        docSlug: "board",
        requesterId: "u1",
        requesterUsername: "requester",
        requestedRole: "viewer",
        status: "pending",
        createdAt: new Date(),
      },
    ];
    mockDb.select.mockReturnValue(chainSelectRequests(rows));
    const { listAccessRequests } = await import("@/actions/experimental/rationaleAccess");
    const res = await listAccessRequests();
    expect(res).toEqual(rows);
  });

  it("approves an access request and grants permissions", async () => {
    mockDb.select.mockReturnValue(chainSelectRequestById([
      {
        id: "req-1",
        docId: "doc-1",
        requesterId: "u1",
        requestedRole: "editor",
        status: "pending",
        ownerId: "me",
      },
    ]));
    mockDb.insert.mockReturnValue({
      values: jest.fn(() => ({
        onConflictDoUpdate: jest.fn(() => Promise.resolve()),
      })),
    });
    mockDb.update.mockReturnValue(chainUpdate());

    const { resolveAccessRequest } = await import("@/actions/experimental/rationaleAccess");
    const res = await resolveAccessRequest({ requestId: "req-1", action: "approve", role: "viewer" });
    expect(res).toEqual({ ok: true, status: "approved", role: "viewer" });
  });
});
