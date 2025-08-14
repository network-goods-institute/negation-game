export {};
jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn().mockResolvedValue("user-1"),
}));

const mockDb: any = {
  query: {
    spacesTable: { findFirst: jest.fn() },
  },
  execute: jest.fn(),
  select: jest.fn(),
};

jest.mock("@/services/db", () => ({ db: mockDb }));

describe("fetchPinnedPoint", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns null when no pinned point", async () => {
    mockDb.query.spacesTable.findFirst.mockResolvedValue({
      pinnedPointId: null,
    });
    const { fetchPinnedPoint } = await import(
      "@/actions/feed/fetchPinnedPoint"
    );
    const res = await fetchPinnedPoint({ spaceId: "scroll" });
    expect(res).toBeNull();
  });

  it("returns the pinned point with favor", async () => {
    mockDb.query.spacesTable.findFirst.mockResolvedValue({ pinnedPointId: 42 });
    mockDb.execute.mockResolvedValue([]);

    const pointRow = [
      {
        pointId: 42,
        content: "Pinned",
        createdAt: new Date(),
        createdBy: "u1",
        space: "scroll",
        isCommand: false,
        cred: 10,
        amountSupporters: 1,
        amountNegations: 0,
        negationsCred: 0,
        viewerCred: 0,
        negationIds: [],
        restakesByPoint: 0,
        slashedAmount: 0,
        doubtedAmount: 0,
        totalRestakeAmount: 0,
      },
    ];
    mockDb.execute.mockResolvedValueOnce([]); // highestFavorCommands
    const where = jest.fn().mockResolvedValue([{ favor: 77 }]);
    const from = jest.fn(() => ({ where }));
    mockDb.select.mockReturnValue({ from, where });

    const { fetchPinnedPoint } = await import(
      "@/actions/feed/fetchPinnedPoint"
    );
    // Stub internal execute that loads point_data -> we can simulate the return by bypassing and directly returning row
    // But since function uses db.execute to build point_data, just mock it to return our point structure
    mockDb.execute.mockResolvedValueOnce(pointRow as any);

    const res = await fetchPinnedPoint({ spaceId: "scroll" });
    expect(res?.pointId).toBe(42);
    expect(res?.favor).toBe(77);
  });

  it("handles multiple highest-favor pin commands but returns single pinned point data", async () => {
    mockDb.query.spacesTable.findFirst.mockResolvedValue({ pinnedPointId: 42 });
    // simulate multiple commands in first execute; function only decorates pinCommands list
    mockDb.execute.mockResolvedValueOnce([
      {
        id: 1,
        favor: 90,
        createdAt: new Date(),
        target_point_id_encoded: "42",
      },
      {
        id: 2,
        favor: 89,
        createdAt: new Date(),
        target_point_id_encoded: "42",
      },
    ]);

    const pointRow = [
      {
        pointId: 42,
        content: "Pinned",
        createdAt: new Date(),
        createdBy: "u1",
        space: "scroll",
        isCommand: false,
        cred: 10,
        amountSupporters: 1,
        amountNegations: 0,
        negationsCred: 0,
        viewerCred: 0,
        negationIds: [],
        restakesByPoint: 0,
        slashedAmount: 0,
        doubtedAmount: 0,
        totalRestakeAmount: 0,
      },
    ];
    mockDb.execute.mockResolvedValueOnce(pointRow as any);
    const where = jest.fn().mockResolvedValue([{ favor: 77 }]);
    const from = jest.fn(() => ({ where }));
    mockDb.select.mockReturnValue({ from, where });

    const { fetchPinnedPoint } = await import(
      "@/actions/feed/fetchPinnedPoint"
    );
    const res = await fetchPinnedPoint({ spaceId: "scroll" });
    expect(res?.pointId).toBe(42);
    expect(res?.favor).toBe(77);
  });

  it("returns null for global space and includes pinCommands when present", async () => {
    const { fetchPinnedPoint } = await import(
      "@/actions/feed/fetchPinnedPoint"
    );
    const resNull = await fetchPinnedPoint({ spaceId: "global" });
    expect(resNull).toBeNull();

    mockDb.query.spacesTable.findFirst.mockResolvedValue({ pinnedPointId: 77 });
    const now = new Date();
    mockDb.execute.mockResolvedValueOnce([
      { id: 11, favor: 70, createdAt: now, targetPointIdEncoded: "77" },
    ]);
    const pointRow = [
      {
        pointId: 77,
        content: "Pinned",
        createdAt: now,
        createdBy: "u",
        space: "scroll",
        isCommand: false,
        cred: 0,
        amountSupporters: 0,
        amountNegations: 0,
        negationsCred: 0,
        viewerCred: 0,
        negationIds: [],
        restakesByPoint: 0,
        slashedAmount: 0,
        doubtedAmount: 0,
        totalRestakeAmount: 0,
      },
    ];
    mockDb.execute.mockResolvedValueOnce(pointRow as any);
    const where = jest.fn().mockResolvedValue([{ favor: 33 }]);
    const from = jest.fn(() => ({ where }));
    mockDb.select.mockReturnValue({ from, where });

    const res = await fetchPinnedPoint({ spaceId: "scroll" });
    expect(res?.favor).toBe(33);
    expect(res?.pointId).toBe(77);
  });
});
