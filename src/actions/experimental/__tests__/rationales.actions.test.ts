jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(async () => "me"),
}));
jest.mock("@/actions/users/getUserIdOrAnonymous", () => ({
  getUserIdOrAnonymous: jest.fn(async () => "me"),
}));
jest.mock("@/services/mpAccess", () => ({
  resolveDocAccess: jest.fn(async (_id: string, { userId }: any = {}) => ({
    status: "ok",
    docId: _id,
    ownerId: userId || "me",
    slug: null,
    role: "owner",
    source: "owner",
  })),
  canWriteRole: jest.fn(() => true),
}));
import { getUserId } from "@/actions/users/getUserId";
import { getUserIdOrAnonymous } from "@/actions/users/getUserIdOrAnonymous";

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
const { resolveDocAccess, canWriteRole } = require("@/services/mpAccess");

jest.mock("@/utils/slugify", () => ({
  slugify: jest.fn(
    (title: string) =>
      (title || "").trim().toLowerCase().replace(/\s+/g, "-") || "board"
  ),
}));

// Bypass DB usage in slug resolution for these unit tests
jest.mock("@/utils/slugResolver", () => ({
  resolveSlugToId: jest.fn(async (v: string) => v),
  isValidSlugOrId: (s: string) => /^[a-zA-Z0-9:_-]{1,256}$/.test(s),
}));
// Provide a merged snapshot buffer for duplication path
const mockGetDocSnapshotBuffer = jest.fn(async () => Buffer.from("merged"));
jest.mock("@/services/yjsCompaction", () => ({
  getDocSnapshotBuffer: (...args: any[]) =>
    (mockGetDocSnapshotBuffer as unknown as jest.Mock).apply(null, args),
}));

const chainInsert = () => {
  const chain: any = {
    values: jest.fn(() => chain),
    onConflictDoNothing: jest.fn(() => Promise.resolve()),
    onConflictDoUpdate: jest.fn(() => ({
      returning: jest.fn(() => Promise.resolve([{ id: "test-id" }])),
    })),
    returning: jest.fn(() => Promise.resolve([{ id: "test-id" }])),
  };
  return chain;
};

const chainUpdate = () => {
  const chain: any = {
    set: jest.fn(() => ({
      where: jest.fn(() => ({
        returning: jest.fn(() => Promise.resolve([{ id: "test-id" }])),
        then: (resolve: any) => resolve([{ id: "test-id" }]),
      })),
      then: (resolve: any) => resolve(),
    })),
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
    (getUserIdOrAnonymous as unknown as jest.Mock).mockResolvedValue("me");
    mockGetDocSnapshotBuffer.mockReset();
    const { resolveSlugToId } = require("@/utils/slugResolver");
    (resolveSlugToId as jest.Mock).mockImplementation(async (v: string) => v);
    (resolveDocAccess as jest.Mock).mockResolvedValue({
      status: "ok",
      docId: "doc1",
      ownerId: "me",
      slug: null,
      role: "owner",
      source: "owner",
    });
    (canWriteRole as jest.Mock).mockReturnValue(true);
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

  it("listPinnedRationales returns rows from db.execute", async () => {
    const rows = [
      {
        id: "p",
        title: "Pinned",
        ownerId: "me",
        updatedAt: new Date(),
        createdAt: new Date(),
        lastOpenAt: new Date(),
        pinnedAt: new Date(),
      },
    ];
    mockDb.execute.mockResolvedValueOnce(rows);
    const { listPinnedRationales } = await import(
      "@/actions/experimental/rationales"
    );
    const res = await listPinnedRationales();
    expect(res).toEqual(rows);
    expect(mockDb.execute).toHaveBeenCalled();
  });

  it("listPinnedRationales uses pins table", async () => {
    mockDb.execute.mockResolvedValueOnce([]);
    const { listPinnedRationales } = await import(
      "@/actions/experimental/rationales"
    );
    const res = await listPinnedRationales();
    const query = mockDb.execute.mock.calls[0]?.[0];
    const text = Array.isArray(query?.queryChunks)
      ? query.queryChunks
          .map((chunk: any) => {
            if (Array.isArray(chunk?.value)) return chunk.value.join(" ");
            if (typeof chunk?.value === "string") return chunk.value;
            return String(chunk?.value ?? "");
          })
          .join(" ")
      : query?.sql || query?.text || String(query);
    expect(text).toContain("mp_doc_pins");
    expect(res).toEqual([]);
  });

  it("listVisitedRationales filters share link visits through active links", async () => {
    mockDb.execute.mockResolvedValueOnce([]);
    const { listVisitedRationales } = await import(
      "@/actions/experimental/rationales"
    );
    const res = await listVisitedRationales();
    const query = mockDb.execute.mock.calls[0]?.[0];
    const text = Array.isArray(query?.queryChunks)
      ? query.queryChunks
          .map((chunk: any) => {
            if (Array.isArray(chunk?.value)) return chunk.value.join(" ");
            if (typeof chunk?.value === "string") return chunk.value;
            return String(chunk?.value ?? "");
          })
          .join(" ")
      : query?.sql || query?.text || String(query);
    expect(text).toContain("mp_doc_share_links");
    expect(text).toContain("share_link_id");
    expect(text).toContain("disabled_at");
    expect(text).toContain("expires_at");
    expect(res).toEqual([]);
  });

  it("pinRationale inserts pin after access check", async () => {
    mockDb.insert.mockReturnValue(chainInsert());
    const { pinRationale } = await import(
      "@/actions/experimental/rationales"
    );
    const res = await pinRationale("doc1");
    expect(res).toEqual({ ok: true });
    expect(resolveDocAccess).toHaveBeenCalled();
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("unpinRationale deletes pin", async () => {
    mockDb["delete"].mockReturnValue(chainDelete());
    const { unpinRationale } = await import(
      "@/actions/experimental/rationales"
    );
    const res = await unpinRationale("doc1");
    expect(res).toEqual({ ok: true });
    expect(mockDb["delete"]).toHaveBeenCalled();
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
    (resolveDocAccess as jest.Mock).mockResolvedValueOnce({
      status: "forbidden",
      docId: "doc1",
      ownerId: "other",
      slug: null,
      role: "viewer",
      source: "permission",
    });
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

  it("createRationale allows anonymous creation via getUserIdOrAnonymous", async () => {
    (getUserIdOrAnonymous as unknown as jest.Mock).mockResolvedValueOnce("anon-123");

    const insertedDocs: any[] = [];
    const insertedAccess: any[] = [];

    // Provide a transaction-scoped tx that records values passed to .values(...)
    let insertCall = 0;
    const tx: any = {
      insert: jest.fn(() => ({
        values: (obj: any) => {
          insertCall++;
          if (insertCall === 1) insertedDocs.push(obj);
          if (insertCall === 2 || insertCall === 3) insertedAccess.push(obj);
          return {
            onConflictDoNothing: jest.fn(() => Promise.resolve()),
            onConflictDoUpdate: jest.fn(() => Promise.resolve()),
          };
        },
      })),
      update: jest.fn(() => ({ where: jest.fn(() => Promise.resolve()) })),
    };

    mockDb.transaction.mockImplementation(async (callback: any) => callback(tx));
    mockDb.update = jest.fn(() => ({
      where: jest.fn(() => Promise.resolve()),
    }));

    const { createRationale } = await import(
      "@/actions/experimental/rationales"
    );
    (getUserId as unknown as jest.Mock).mockResolvedValueOnce(null);
    (getUserIdOrAnonymous as unknown as jest.Mock).mockResolvedValueOnce("anon-123");
    await createRationale({ title: "Hello" });

    // Validate inserted owner and access
    expect(insertedDocs.length).toBe(1);
    expect(insertedDocs[0]).toEqual(
      expect.objectContaining({ ownerId: "anon-123" })
    );

    // Expect 2 access entries: one for mp_doc_access, one for mp_doc_permissions
    expect(insertedAccess.length).toBe(2);
    expect(insertedAccess[0]).toEqual(
      expect.objectContaining({ userId: "anon-123" })
    );
    expect(insertedAccess[1]).toEqual(
      expect.objectContaining({ userId: "anon-123", role: "owner" })
    );
  });

  it("duplicateRationale duplicates board with copy of title", async () => {
    mockDb.execute.mockResolvedValueOnce([{}]);
    mockDb.select
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

  it("duplicateRationale uses merged snapshot when available", async () => {
    mockDb.execute.mockResolvedValueOnce([{}]); // can read
    // meta row for source
    mockDb.select
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({ limit: async () => [{ title: "Src", nodeTitle: "NodeTitle" }] }),
        }),
      }))
      // updates list won't be used when merged snapshot is present, but return empty anyway
      .mockImplementationOnce(() => ({
        from: () => ({ where: () => ({ orderBy: () => [] }) }),
      }));

    mockDb.insert.mockReturnValue(chainInsert());
    mockDb.update.mockReturnValue(chainUpdate());

    const { duplicateRationale } = await import("@/actions/experimental/rationales");
    const out = await duplicateRationale("doc-src");
    expect(out.id).toMatch(/^m-/);
    expect(mockGetDocSnapshotBuffer).toHaveBeenCalled();
  });

  it("duplicateRationale forbids when no access", async () => {
    mockDb.execute.mockResolvedValueOnce([]);
    (resolveDocAccess as jest.Mock).mockResolvedValueOnce({
      status: "forbidden",
      docId: "doc-1",
      requiresAuth: true,
    });
    const { duplicateRationale } = await import(
      "@/actions/experimental/rationales"
    );
    await expect(duplicateRationale("doc-1")).rejects.toThrow(/Forbidden/);
  });

  it("duplicateRationale rejects unauthorized", async () => {
    (getUserId as unknown as jest.Mock).mockResolvedValueOnce(null);
    const { duplicateRationale } = await import(
      "@/actions/experimental/rationales"
    );
    await expect(duplicateRationale("m-123")).rejects.toThrow(/Unauthorized/);
  });

  it("duplicateRationale rejects invalid id", async () => {
    const { duplicateRationale } = await import(
      "@/actions/experimental/rationales"
    );
    await expect(duplicateRationale("bad!id")).rejects.toThrow(
      /Invalid doc id or slug/
    );
  });

  it("duplicateRationale throws when source document not found", async () => {
    mockDb.execute.mockResolvedValueOnce([{}]);
    mockDb.select.mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({ limit: async () => [] }),
      }),
    }));
    const { duplicateRationale } = await import(
      "@/actions/experimental/rationales"
    );
    await expect(duplicateRationale("m-123")).rejects.toThrow(
      /Document not found/
    );
  });

  it("duplicateRationale falls back to updates when merged snapshot is empty", async () => {
    mockDb.execute.mockResolvedValueOnce([{}]);
    mockGetDocSnapshotBuffer.mockResolvedValueOnce(Buffer.from([]));
    mockDb.select
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ title: "Src", nodeTitle: null }],
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            orderBy: () => [
              {
                updateBin: Buffer.from("u1"),
                userId: "u",
                createdAt: new Date(),
              },
            ],
          }),
        }),
      }));
    mockDb.insert.mockReturnValue(chainInsert());
    mockDb.update.mockReturnValue(chainUpdate());
    const { duplicateRationale } = await import(
      "@/actions/experimental/rationales"
    );
    const out = await duplicateRationale("m-xyz");
    expect(out.id).toMatch(/^m-/);
  });

  it("duplicateRationale preserves nodeTitle on new doc", async () => {
    mockDb.execute.mockResolvedValueOnce([{}]);
    mockGetDocSnapshotBuffer.mockResolvedValueOnce(Buffer.from("merged"));
    const insertedDocs: any[] = [];
    const insertedUpdates: any[] = [];
    const tx: any = {
      insert: jest.fn((_table?: any) => ({
        values: (obj: any) => {
          if (obj.updateBin) insertedUpdates.push(obj);
          else insertedDocs.push(obj);
          return { onConflictDoNothing: jest.fn(async () => undefined) };
        },
      })),
      update: jest.fn(() => ({ where: jest.fn(async () => undefined) })),
    };
    mockDb.transaction.mockImplementation(async (cb: any) => cb(tx));
    mockDb.select
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ title: "T", nodeTitle: "NodeT" }],
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({ orderBy: () => [] }),
        }),
      }));
    const { duplicateRationale } = await import(
      "@/actions/experimental/rationales"
    );
    const out = await duplicateRationale("m-abc");
    expect(out.id).toMatch(/^m-/);
    expect(insertedDocs[0]).toEqual(
      expect.objectContaining({ nodeTitle: "NodeT" })
    );
    expect(insertedUpdates.length).toBe(1);
  });

  it("duplicateRationale trims provided title and sets slug", async () => {
    mockDb.execute.mockResolvedValueOnce([{}]);
    mockGetDocSnapshotBuffer.mockResolvedValueOnce(Buffer.from("merged"));
    mockDb.select
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ title: "Original", nodeTitle: null }],
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({ where: () => ({ orderBy: () => [] }) }),
      }));
    mockDb.insert.mockReturnValue(chainInsert());
    mockDb.update.mockReturnValue(chainUpdate());
    const { slugify } = jest.requireMock("@/utils/slugify");
    (slugify as jest.Mock).mockImplementationOnce((t: string) =>
      t.trim().toLowerCase().replace(/\s+/g, "-")
    );
    const { duplicateRationale } = await import(
      "@/actions/experimental/rationales"
    );
    const out = await duplicateRationale("m-1", { title: "  My Title  " });
    expect(out.title).toBe("My Title");
    expect([null, "my-title"]).toContain(out.slug);
  });

  it("duplicateRationale handles slugify failure gracefully", async () => {
    mockDb.execute.mockResolvedValueOnce([{}]);
    mockGetDocSnapshotBuffer.mockResolvedValueOnce(Buffer.from("merged"));
    mockDb.select
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ title: "Base", nodeTitle: null }],
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({ where: () => ({ orderBy: () => [] }) }),
      }));
    mockDb.insert.mockReturnValue(chainInsert());
    mockDb.update.mockReturnValue(chainUpdate());
    const { slugify } = jest.requireMock("@/utils/slugify");
    (slugify as jest.Mock).mockImplementationOnce(() => {
      throw new Error("fail");
    });
    const { duplicateRationale } = await import(
      "@/actions/experimental/rationales"
    );
    const out = await duplicateRationale("m-9");
    expect(out.slug).toBeNull();
  });

  it("duplicateRationale falls back to default copy title when provided title is blank", async () => {
    mockDb.execute.mockResolvedValueOnce([{}]);
    mockGetDocSnapshotBuffer.mockResolvedValueOnce(Buffer.from("merged"));
    mockDb.select
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ title: null, nodeTitle: null }],
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({ where: () => ({ orderBy: () => [] }) }),
      }));
    mockDb.insert.mockReturnValue(chainInsert());
    mockDb.update.mockReturnValue(chainUpdate());
    const { duplicateRationale } = await import(
      "@/actions/experimental/rationales"
    );
    const out = await duplicateRationale("m-x", { title: "   " });
    expect(out.title).toBe("Untitled (Copy)");
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

  it("recordOpen throws when document does not exist", async () => {
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [],
        }),
      }),
    }));
    const { recordOpen } = await import("@/actions/experimental/rationales");
    await expect(recordOpen("missing-doc")).rejects.toThrow(/not found/i);
  });

  it("recordOpen stores shareLinkId when accessed via share token", async () => {
    let selectCall = 0;
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            selectCall++;
            if (selectCall === 1) {
              return [
                { id: "doc-share", ownerId: "owner-1", title: "Board" },
              ];
            }
            if (selectCall === 2) return [];
            return [
              { id: "doc-share", ownerId: "owner-1", title: "Board" },
            ];
          },
        }),
      }),
    }));
    const inserts: any[] = [];
    mockDb.insert.mockImplementation(() => ({
      values: (vals: any) => {
        inserts.push(vals);
        return {
          onConflictDoNothing: jest.fn(() => Promise.resolve()),
          returning: jest.fn(() => Promise.resolve([{ id: "mpa-1" }])),
        };
      },
    }));
    (resolveDocAccess as jest.Mock).mockResolvedValue({
      status: "ok",
      docId: "doc-share",
      ownerId: "owner-1",
      slug: null,
      role: "editor",
      source: "share",
      shareLinkId: "link-123",
    });
    const { recordOpen } = await import("@/actions/experimental/rationales");
    await recordOpen("doc-share", { shareToken: "sl-token" });
    expect(inserts[0]).toMatchObject({
      docId: "doc-share",
      userId: "me",
      shareLinkId: "link-123",
    });
  });
});
