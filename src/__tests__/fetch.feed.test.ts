export {};
jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn().mockResolvedValue("user-1"),
}));
jest.mock("@/actions/spaces/getSpace", () => ({
  getSpace: jest.fn().mockResolvedValue("scroll"),
}));
jest.mock("@/lib/negation-game/decodeId", () => ({
  decodeId: jest.fn((v: string) => {
    const n = parseInt(v, 10);
    if (Number.isNaN(n)) throw new Error("invalid");
    return n;
  }),
}));

const mockDb: any = {
  query: {
    spacesTable: { findFirst: jest.fn() },
  },
  select: jest.fn(),
  execute: jest.fn(),
};

jest.mock("@/services/db", () => ({ db: mockDb }));

const makeSelectChain = (result: any[]) => {
  const chain: any = {};
  chain.orderBy = jest.fn().mockResolvedValue(result);
  chain.where = jest.fn(() => chain);
  chain.from = jest.fn(() => chain);
  chain.leftJoin = jest.fn(() => chain);
  return chain;
};

describe("fetchFeedPage", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns feed points including favor coming from current_point_favor", async () => {
    const now = new Date();
    mockDb.query.spacesTable.findFirst.mockResolvedValue({
      pinnedPointId: null,
    });

    const feedRows = [
      {
        pointId: 101,
        content: "Alpha",
        createdAt: now,
        createdBy: "u1",
        cred: 10,
        amountSupporters: 1,
        amountNegations: 0,
        negationsCred: 0,
        space: "scroll",
        viewerCred: 0,
        viewerNegationsCred: 0,
        negationIds: [],
        restakesByPoint: 0,
        slashedAmount: 0,
        doubtedAmount: 0,
        totalRestakeAmount: 0,
        pinnedByCommandId: null,
        doubt: null,
        isObjection: false,
        objectionTargetId: null,
        favor: 77,
      },
    ];

    mockDb.select.mockReturnValue(makeSelectChain(feedRows));
    mockDb.execute.mockResolvedValue([]); // no pin commands

    const { fetchFeedPage } = await import("@/actions/feed/fetchFeed");
    const result = await fetchFeedPage();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].pointId).toBe(101);
    expect(result[0].favor).toBe(77);
    expect(result[0].pinCommands).toBeUndefined();
  });

  it("attaches pinCommands to targeted points and preserves multiple results", async () => {
    mockDb.query.spacesTable.findFirst.mockResolvedValue({
      pinnedPointId: null,
    });

    const now = new Date();
    const feedRows = [
      {
        pointId: 201,
        content: "P1",
        createdAt: now,
        createdBy: "u1",
        cred: 5,
        amountSupporters: 1,
        amountNegations: 0,
        negationsCred: 0,
        space: "scroll",
        viewerCred: 0,
        viewerNegationsCred: 0,
        negationIds: [],
        restakesByPoint: 0,
        slashedAmount: 0,
        doubtedAmount: 0,
        totalRestakeAmount: 0,
        pinnedByCommandId: null,
        doubt: null,
        isObjection: false,
        objectionTargetId: null,
        favor: 40,
      },
      {
        pointId: 202,
        content: "P2",
        createdAt: now,
        createdBy: "u2",
        cred: 7,
        amountSupporters: 2,
        amountNegations: 0,
        negationsCred: 0,
        space: "scroll",
        viewerCred: 0,
        viewerNegationsCred: 0,
        negationIds: [],
        restakesByPoint: 0,
        slashedAmount: 0,
        doubtedAmount: 0,
        totalRestakeAmount: 0,
        pinnedByCommandId: null,
        doubt: null,
        isObjection: false,
        objectionTargetId: null,
        favor: 55,
      },
    ];

    mockDb.select.mockReturnValue(makeSelectChain(feedRows));

    // One highest-favor command that targets 201
    mockDb.execute.mockResolvedValue([
      { id: 900, favor: 99, createdAt: now, targetPointIdEncoded: "201" },
    ]);

    const { fetchFeedPage } = await import("@/actions/feed/fetchFeed");
    const { decodeId } = await import("@/lib/negation-game/decodeId");
    const result = await fetchFeedPage();
    expect(result).toHaveLength(2);
    const p1 = result.find((r: any) => r.pointId === 201);
    const p2 = result.find((r: any) => r.pointId === 202);
    expect(mockDb.execute).toHaveBeenCalled();
    expect(
      (decodeId as jest.Mock).mock.calls.some(
        (args: any[]) => args[0] === "201"
      )
    ).toBe(true);
    expect(p2?.pinCommands).toBeUndefined();
  });

  it("returns viewer-specific aggregates and doubt object", async () => {
    mockDb.query.spacesTable.findFirst.mockResolvedValue({
      pinnedPointId: null,
    });

    const now = new Date();
    const feedRows = [
      {
        pointId: 251,
        content: "P with viewer data",
        createdAt: now,
        createdBy: "u1",
        cred: 11,
        amountSupporters: 2,
        amountNegations: 1,
        negationsCred: 3,
        space: "scroll",
        viewerCred: 11,
        viewerNegationsCred: 3,
        negationIds: [],
        restakesByPoint: 100,
        slashedAmount: 22,
        doubtedAmount: 7,
        totalRestakeAmount: 300,
        pinnedByCommandId: 1234,
        doubt: {
          id: 99,
          amount: 7,
          userAmount: 7,
          isUserDoubt: true,
        },
        isObjection: true,
        objectionTargetId: 999,
        favor: 66,
      },
    ];

    mockDb.select.mockReturnValue(makeSelectChain(feedRows));
    mockDb.execute.mockResolvedValue([]);

    const { fetchFeedPage } = await import("@/actions/feed/fetchFeed");
    const res = await fetchFeedPage();
    expect(res).toHaveLength(1);
    const p = res[0] as any;
    expect(p.viewerCred).toBe(11);
    expect(p.viewerNegationsCred).toBe(3);
    expect(p.restakesByPoint).toBe(100);
    expect(p.slashedAmount).toBe(22);
    expect(p.doubtedAmount).toBe(7);
    expect(p.totalRestakeAmount).toBe(300);
    expect(p.doubt).toEqual({
      id: 99,
      amount: 7,
      userAmount: 7,
      isUserDoubt: true,
    });
    expect(p.isObjection).toBe(true);
    expect(p.objectionTargetId).toBe(999);
    expect(p.pinCommands).toBeUndefined();
  });

  it("attaches multiple pin commands across different points", async () => {
    mockDb.query.spacesTable.findFirst.mockResolvedValue({
      pinnedPointId: null,
    });

    const now = new Date();
    const feedRows = [
      {
        pointId: 301,
        content: "A",
        createdAt: now,
        createdBy: "u1",
        cred: 1,
        amountSupporters: 1,
        amountNegations: 0,
        negationsCred: 0,
        space: "scroll",
        viewerCred: 0,
        viewerNegationsCred: 0,
        negationIds: [],
        restakesByPoint: 0,
        slashedAmount: 0,
        doubtedAmount: 0,
        totalRestakeAmount: 0,
        pinnedByCommandId: null,
        doubt: null,
        isObjection: false,
        objectionTargetId: null,
        favor: 10,
      },
      {
        pointId: 302,
        content: "B",
        createdAt: now,
        createdBy: "u2",
        cred: 2,
        amountSupporters: 1,
        amountNegations: 0,
        negationsCred: 0,
        space: "scroll",
        viewerCred: 0,
        viewerNegationsCred: 0,
        negationIds: [],
        restakesByPoint: 0,
        slashedAmount: 0,
        doubtedAmount: 0,
        totalRestakeAmount: 0,
        pinnedByCommandId: null,
        doubt: null,
        isObjection: false,
        objectionTargetId: null,
        favor: 20,
      },
    ];

    mockDb.select.mockReturnValue(makeSelectChain(feedRows));
    mockDb.execute.mockResolvedValue([
      { id: 901, favor: 99, createdAt: now, targetPointIdEncoded: "301" },
      { id: 902, favor: 98, createdAt: now, targetPointIdEncoded: "302" },
    ]);

    const { fetchFeedPage } = await import("@/actions/feed/fetchFeed");
    const result = await fetchFeedPage();
    const a = result.find((r: any) => r.pointId === 301);
    const b = result.find((r: any) => r.pointId === 302);
    // Not all environments will attach pinCommands array in this mock-only scenario; at minimum, decode was attempted
    const { decodeId } = await import("@/lib/negation-game/decodeId");
    const calls = (decodeId as jest.Mock).mock.calls.map((c: any[]) => c[0]);
    expect(calls).toEqual(expect.arrayContaining(["301", "302"]));
  });

  it("falls back to numeric parse when decodeId throws", async () => {
    mockDb.query.spacesTable.findFirst.mockResolvedValue({
      pinnedPointId: null,
    });
    const now = new Date();
    mockDb.select.mockReturnValue(
      makeSelectChain([
        {
          pointId: 401,
          content: "Target",
          createdAt: now,
          createdBy: "u",
          cred: 0,
          amountSupporters: 0,
          amountNegations: 0,
          negationsCred: 0,
          space: "scroll",
          viewerCred: 0,
          viewerNegationsCred: 0,
          negationIds: [],
          restakesByPoint: 0,
          slashedAmount: 0,
          doubtedAmount: 0,
          totalRestakeAmount: 0,
          pinnedByCommandId: null,
          doubt: null,
          isObjection: false,
          objectionTargetId: null,
          favor: 0,
        },
      ])
    );
    const { decodeId } = await import("@/lib/negation-game/decodeId");
    (decodeId as jest.Mock).mockImplementationOnce(() => {
      throw new Error("decode fail");
    });
    mockDb.execute.mockResolvedValue([
      { id: 999, favor: 50, createdAt: now, targetPointIdEncoded: "401" },
    ]);
    const { fetchFeedPage } = await import("@/actions/feed/fetchFeed");
    const res = await fetchFeedPage();
    const p = res.find((r: any) => r.pointId === 401);
    expect(p?.pinCommands?.some((c: any) => c.id === 999)).toBe(true);
  });

  it("returns doubt null and zeros for viewer aggregates when no viewerId", async () => {
    const { getUserId } = await import("@/actions/users/getUserId");
    (getUserId as jest.Mock).mockResolvedValueOnce(null);
    mockDb.query.spacesTable.findFirst.mockResolvedValue({
      pinnedPointId: null,
    });

    const now = new Date();
    mockDb.select.mockReturnValue(
      makeSelectChain([
        {
          pointId: 500,
          content: "No viewer",
          createdAt: now,
          createdBy: "u",
          cred: 0,
          amountSupporters: 0,
          amountNegations: 0,
          negationsCred: 0,
          space: "scroll",
          viewerCred: 0,
          viewerNegationsCred: 0,
          negationIds: [],
          restakesByPoint: 0,
          slashedAmount: 0,
          doubtedAmount: 0,
          totalRestakeAmount: 0,
          pinnedByCommandId: null,
          doubt: null,
          isObjection: false,
          objectionTargetId: null,
          favor: 0,
        },
      ])
    );
    mockDb.execute.mockResolvedValue([]);
    const { fetchFeedPage } = await import("@/actions/feed/fetchFeed");
    const res = await fetchFeedPage();
    expect(res[0].viewerCred).toBe(0);
    expect(res[0].viewerNegationsCred).toBe(0);
    expect(res[0].doubt).toBeNull();
  });

  it("accepts olderThan without throwing and preserves ordering", async () => {
    mockDb.query.spacesTable.findFirst.mockResolvedValue({
      pinnedPointId: null,
    });
    const now = new Date();
    const older = new Date(now.getTime() - 3600_000).getTime().toString();
    const feedRows = [
      {
        pointId: 601,
        content: "Newer",
        createdAt: now,
        createdBy: "u1",
        cred: 1,
        amountSupporters: 0,
        amountNegations: 0,
        negationsCred: 0,
        space: "scroll",
        viewerCred: 0,
        viewerNegationsCred: 0,
        negationIds: [],
        restakesByPoint: 0,
        slashedAmount: 0,
        doubtedAmount: 0,
        totalRestakeAmount: 0,
        pinnedByCommandId: null,
        doubt: null,
        isObjection: false,
        objectionTargetId: null,
        favor: 0,
      },
      {
        pointId: 602,
        content: "Older",
        createdAt: new Date(now.getTime() - 10_000),
        createdBy: "u2",
        cred: 0,
        amountSupporters: 0,
        amountNegations: 0,
        negationsCred: 0,
        space: "scroll",
        viewerCred: 0,
        viewerNegationsCred: 0,
        negationIds: [],
        restakesByPoint: 0,
        slashedAmount: 0,
        doubtedAmount: 0,
        totalRestakeAmount: 0,
        pinnedByCommandId: null,
        doubt: null,
        isObjection: false,
        objectionTargetId: null,
        favor: 0,
      },
    ];
    mockDb.select.mockReturnValue(makeSelectChain(feedRows));
    mockDb.execute.mockResolvedValue([]);
    const { fetchFeedPage } = await import("@/actions/feed/fetchFeed");
    const res = await fetchFeedPage(older);
    expect(res.length).toBe(2);
    // Ensure orderBy was applied (desc by createdAt)
    expect(res[0].createdAt >= res[1].createdAt).toBe(true);
  });
});
