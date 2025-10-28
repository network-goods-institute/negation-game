jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(async () => "me"),
}));
import { getUserId } from "@/actions/users/getUserId";

const mockDb: any = {
  execute: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  select: jest.fn(),
  transaction: jest.fn((callback) => callback(mockDb)),
};

jest.mock("@/services/db", () => ({
  db: mockDb,
}));

jest.mock("@/utils/slugify", () => ({
  slugify: jest.fn(
    (title: string) =>
      (title || "").trim().toLowerCase().replace(/\s+/g, "-") || "board"
  ),
}));

const chainInsert = () => {
  const chain: any = {
    values: jest.fn(() => chain),
    onConflictDoNothing: jest.fn(() => Promise.resolve()),
  };
  return chain;
};

const chainUpdate = () => {
  const chain: any = {
    set: jest.fn(() => ({ where: jest.fn(() => Promise.resolve()) })),
  };
  return chain;
};

const chainDelete = () => ({ where: jest.fn(() => Promise.resolve()) });

const ownerSelectChain = (ownerId: string | null) => ({
  from: jest.fn(() => ({
    where: jest.fn(() => ({ limit: jest.fn(async () => [{ ownerId }]) })),
  })),
});

describe("rationales actions", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (getUserId as unknown as jest.Mock).mockResolvedValue("me");
  });

  it("listMyRationales returns rows from db.execute", async () => {
    const rows = [
      {
        id: "a",
        title: "Mine",
        ownerId: "me",
        updatedAt: new Date(),
        createdAt: new Date(),
        lastOpenAt: new Date(),
      },
    ];
    mockDb.execute.mockResolvedValueOnce(rows);
    const { listMyRationales } = await import(
      "@/actions/experimental/rationales"
    );
    const res = await listMyRationales();
    expect(res).toEqual(rows);
    expect(mockDb.execute).toHaveBeenCalled();
  });

  it("listOwnedRationales returns rows from db.execute", async () => {
    const rows = [
      {
        id: "a",
        title: "Mine",
        ownerId: "me",
        updatedAt: new Date(),
        createdAt: new Date(),
        lastOpenAt: new Date(),
      },
    ];
    mockDb.execute.mockResolvedValueOnce(rows);
    const { listOwnedRationales } = await import(
      "@/actions/experimental/rationales"
    );
    const res = await listOwnedRationales();
    expect(res).toEqual(rows);
    expect(mockDb.execute).toHaveBeenCalled();
  });

  it("listVisitedRationales returns rows from db.execute", async () => {
    const rows = [
      {
        id: "b",
        title: "Shared",
        ownerId: "other",
        updatedAt: new Date(),
        createdAt: new Date(),
        lastOpenAt: new Date(),
      },
    ];
    mockDb.execute.mockResolvedValueOnce(rows);
    const { listVisitedRationales } = await import(
      "@/actions/experimental/rationales"
    );
    const res = await listVisitedRationales();
    expect(res).toEqual(rows);
    expect(mockDb.execute).toHaveBeenCalled();
  });

  it("renameRationale allows owner", async () => {
    mockDb.select.mockImplementation(() => ownerSelectChain("me"));
    mockDb.update.mockReturnValue(chainUpdate());
    const { renameRationale } = await import(
      "@/actions/experimental/rationales"
    );
    await expect(renameRationale("doc1", "New Title")).resolves.toEqual({
      ok: true,
    });
  });

  it("deleteRationale allows owner and deletes", async () => {
    mockDb.select.mockImplementation(() => ownerSelectChain("me"));
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    mockDb.delete.mockReturnValue(chainDelete());
    const { deleteRationale } = await import(
      "@/actions/experimental/rationales"
    );
    await expect(deleteRationale("doc1")).resolves.toEqual({ ok: true });
  });

  it("deleteRationale forbids non-owner", async () => {
    mockDb.select.mockImplementation(() => ownerSelectChain("other"));
    const { deleteRationale } = await import(
      "@/actions/experimental/rationales"
    );
    await expect(deleteRationale("doc1")).rejects.toThrow(/Forbidden/);
  });

  it("createRationale returns id and default title", async () => {
    mockDb.insert.mockReturnValue(chainInsert());
    mockDb.update = jest.fn(() => ({
      where: jest.fn(() => Promise.resolve()),
    }));
    mockDb.select = jest.fn(() => ({
      from: () => ({ where: () => ({ limit: async () => [] }) }),
    }));
    const { createRationale } = await import(
      "@/actions/experimental/rationales"
    );
    const res = await createRationale({});
    expect(res.id).toMatch(/^m-/);
    expect(res.title).toBe("Untitled");
  });

  it("duplicateRationale duplicates board with copy of title", async () => {
    mockDb.execute.mockResolvedValueOnce([{}]);
    mockDb.select.mockImplementation(() => ({
      from: () => ({ where: () => ({ limit: async () => [], orderBy: () => [] }) }),
    }));
    mockDb.select
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({ limit: async () => [] }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({ limit: async () => [{ title: "Original", nodeTitle: "NodeT" }] }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            orderBy: () => [
              { updateBin: Buffer.from("a"), userId: "u1", createdAt: new Date() },
            ],
          }),
        }),
      }));
    mockDb.insert.mockReturnValue(chainInsert());
    mockDb.update.mockReturnValue(chainUpdate());
    const { duplicateRationale } = await import(
      "@/actions/experimental/rationales"
    );
    const out = await duplicateRationale("doc-1");
    expect(out.id).toMatch(/^m-/);
    expect(out.title).toBe("Original (Copy)");
    expect(mockDb.transaction).toHaveBeenCalled();
  });

  it("duplicateRationale forbids when no access", async () => {
    mockDb.execute.mockResolvedValueOnce([]);
    const { duplicateRationale } = await import(
      "@/actions/experimental/rationales"
    );
    await expect(duplicateRationale("doc-1")).rejects.toThrow(/Forbidden/);
  });

  it("recordOpen backfills owner if missing and upserts access", async () => {
    // call1: owner check (null)
    // call2: access check ([])
    // call3: final doc row
    let sel = 0;
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            sel++;
            if (sel === 1) return [{ ownerId: null }];
            if (sel === 2) return [];
            return [
              {
                id: "doc-record",
                title: "New Board",
                ownerId: "connormcmk",
              },
            ];
          },
        }),
      }),
    }));
    mockDb.update.mockReturnValue(chainUpdate());
    mockDb.insert.mockReturnValue(chainInsert());
    const { recordOpen } = await import("@/actions/experimental/rationales");
    const out = await recordOpen("doc-record");
    expect(out.id).toBe("doc-record");
    expect(["connormcmk", "me"]).toContain(out.ownerId);
    expect(mockDb.insert).toHaveBeenCalled();
  });
});
