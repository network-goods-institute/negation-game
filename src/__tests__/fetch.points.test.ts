export {};
jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn().mockResolvedValue("user-1"),
}));
jest.mock("@/actions/spaces/getSpace", () => ({
  getSpace: jest.fn().mockResolvedValue("scroll"),
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
  chain.where = jest.fn().mockResolvedValue(result);
  chain.leftJoin = jest.fn(() => chain);
  chain.from = jest.fn(() => chain);
  return chain;
};

describe("fetchPoints", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns points with favor and pinned metadata", async () => {
    mockDb.query.spacesTable.findFirst.mockResolvedValue({ pinnedPointId: 7 });
    mockDb.execute.mockResolvedValue([{ id: 9001 }]); // highest favor command id

    const rows = [
      {
        pointId: 7,
        content: "Pinned X",
        createdAt: new Date(),
        createdBy: "u1",
        cred: 5,
        amountSupporters: 1,
        amountNegations: 0,
        negationsCred: 0,
        space: "scroll",
        favor: 88,
        isPinned: true,
        isCommand: false,
        pinnedByCommandId: 9001,
        viewerCred: 0,
        viewerNegationsCred: 0,
        restakesByPoint: 0,
        slashedAmount: 0,
        doubtedAmount: 0,
        totalRestakeAmount: 0,
        doubt: null,
        isObjection: false,
        objectionTargetId: null,
        objectionContextId: null,
      },
    ];

    mockDb.select.mockReturnValue(makeSelectChain(rows));

    const { fetchPoints } = await import("@/actions/points/fetchPoints");
    const result = await fetchPoints([7]);
    expect(result).toHaveLength(1);
    expect(result[0].pointId).toBe(7);
    expect(result[0].isPinned).toBe(true);
    expect(result[0].pinnedByCommandId).toBe(9001);
    expect(result[0].favor).toBe(88);
  });

  it("returns multiple points and keeps favor values per point", async () => {
    mockDb.query.spacesTable.findFirst.mockResolvedValue({ pinnedPointId: 7 });
    mockDb.execute.mockResolvedValue([{ id: 9001 }]);

    const rows = [
      {
        pointId: 7,
        content: "Pinned A",
        createdAt: new Date(),
        createdBy: "u1",
        cred: 5,
        amountSupporters: 1,
        amountNegations: 0,
        negationsCred: 0,
        space: "scroll",
        favor: 88,
        isPinned: true,
        isCommand: false,
        pinnedByCommandId: 9001,
        viewerCred: 0,
        viewerNegationsCred: 0,
        restakesByPoint: 0,
        slashedAmount: 0,
        doubtedAmount: 0,
        totalRestakeAmount: 0,
        doubt: null,
        isObjection: false,
        objectionTargetId: null,
        objectionContextId: null,
      },
      {
        pointId: 8,
        content: "Other",
        createdAt: new Date(),
        createdBy: "u2",
        cred: 3,
        amountSupporters: 1,
        amountNegations: 0,
        negationsCred: 0,
        space: "scroll",
        favor: 42,
        isPinned: false,
        isCommand: false,
        pinnedByCommandId: null,
        viewerCred: 0,
        viewerNegationsCred: 0,
        restakesByPoint: 0,
        slashedAmount: 0,
        doubtedAmount: 0,
        totalRestakeAmount: 0,
        doubt: null,
        isObjection: false,
        objectionTargetId: null,
        objectionContextId: null,
      },
    ];

    mockDb.select.mockReturnValue(makeSelectChain(rows));

    const { fetchPoints } = await import("@/actions/points/fetchPoints");
    const result = await fetchPoints([7, 8]);
    expect(result).toHaveLength(2);
    const a = result.find((r: any) => r.pointId === 7);
    const b = result.find((r: any) => r.pointId === 8);
    expect(a?.favor).toBe(88);
    expect(b?.favor).toBe(42);
  });

  it("excludes pinned point from isPinned=false rows and sets pinnedByCommandId only for pinned", async () => {
    mockDb.query.spacesTable.findFirst.mockResolvedValue({ pinnedPointId: 42 });
    mockDb.execute.mockResolvedValue([{ id: 7001 }]);

    const rows = [
      {
        pointId: 42,
        content: "Pinned",
        createdAt: new Date(),
        createdBy: "u",
        cred: 0,
        amountSupporters: 0,
        amountNegations: 0,
        negationsCred: 0,
        space: "scroll",
        favor: 10,
        isPinned: true,
        isCommand: false,
        pinnedByCommandId: 7001,
        viewerCred: 0,
        viewerNegationsCred: 0,
        restakesByPoint: 0,
        slashedAmount: 0,
        doubtedAmount: 0,
        totalRestakeAmount: 0,
        doubt: null,
        isObjection: false,
        objectionTargetId: null,
        objectionContextId: null,
      },
      {
        pointId: 43,
        content: "Not pinned",
        createdAt: new Date(),
        createdBy: "v",
        cred: 0,
        amountSupporters: 0,
        amountNegations: 0,
        negationsCred: 0,
        space: "scroll",
        favor: 9,
        isPinned: false,
        isCommand: false,
        pinnedByCommandId: null,
        viewerCred: 0,
        viewerNegationsCred: 0,
        restakesByPoint: 0,
        slashedAmount: 0,
        doubtedAmount: 0,
        totalRestakeAmount: 0,
        doubt: null,
        isObjection: false,
        objectionTargetId: null,
        objectionContextId: null,
      },
    ];

    mockDb.select.mockReturnValue(makeSelectChain(rows));
    const { fetchPoints } = await import("@/actions/points/fetchPoints");
    const result = await fetchPoints([42, 43]);
    const pinned = result.find((r: any) => r.pointId === 42)!;
    const other = result.find((r: any) => r.pointId === 43)!;
    expect(pinned.isPinned).toBe(true);
    expect(pinned.pinnedByCommandId).toBe(7001);
    expect(other.isPinned).toBe(false);
    expect(other.pinnedByCommandId).toBeNull();
  });

  it("includes viewer doubt struct when viewerId provided and none otherwise", async () => {
    mockDb.query.spacesTable.findFirst.mockResolvedValue({
      pinnedPointId: null,
    });
    mockDb.execute.mockResolvedValue([]);

    const rowsWithViewer = [
      {
        pointId: 10,
        content: "X",
        createdAt: new Date(),
        createdBy: "u1",
        cred: 0,
        amountSupporters: 0,
        amountNegations: 0,
        negationsCred: 0,
        space: "scroll",
        favor: 0,
        isPinned: false,
        isCommand: false,
        pinnedByCommandId: null,
        viewerCred: 0,
        viewerNegationsCred: 0,
        restakesByPoint: 0,
        slashedAmount: 0,
        doubtedAmount: 0,
        totalRestakeAmount: 0,
        doubt: { id: 1, amount: 2, userAmount: 2, isUserDoubt: true },
        isObjection: false,
        objectionTargetId: null,
        objectionContextId: null,
      },
    ];
    mockDb.select.mockReturnValueOnce(makeSelectChain(rowsWithViewer));

    const { fetchPointsWithSpace } = await import(
      "@/actions/points/fetchPoints"
    );
    const withViewer = await fetchPointsWithSpace([10], "scroll", "user-1");
    expect(withViewer[0].doubt).toEqual({
      id: 1,
      amount: 2,
      userAmount: 2,
      isUserDoubt: true,
    });

    const rowsNoViewer = [{ ...rowsWithViewer[0], doubt: null }];
    mockDb.select.mockReturnValueOnce(makeSelectChain(rowsNoViewer));
    const noViewer = await fetchPointsWithSpace([10], "scroll", null);
    expect(noViewer[0].doubt).toBeNull();
  });
});
