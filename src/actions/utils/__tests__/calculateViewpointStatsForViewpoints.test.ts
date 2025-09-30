import { calculateViewpointStatsForViewpoints } from "../calculateViewpointStats";
import { db } from "@/services/db";

jest.mock("@/services/db", () => ({
  db: {
    select: jest.fn(),
  },
}));

const mockedDb = db as jest.Mocked<typeof db>;
const selectMock = mockedDb.select as unknown as jest.Mock;

type EndorsementRow = {
  pointId: number;
  userId: string;
  cred: number | string;
};

type FavorRow = {
  pointId: number;
  favor: number | null;
};

const mockSelectSequence = (
  endorsementRows: EndorsementRow[],
  favorRows?: FavorRow[]
) => {
  const endorsementWhere = jest.fn<Promise<EndorsementRow[]>, [unknown]>().mockResolvedValue(endorsementRows);
  const endorsementInnerJoin = jest
    .fn()
    .mockReturnValue({
      where: endorsementWhere,
    });
  const endorsementFrom = jest
    .fn()
    .mockReturnValue({
      innerJoin: endorsementInnerJoin,
    });

  selectMock.mockReturnValueOnce({
    from: endorsementFrom,
  });

  let favorWhere: jest.Mock | undefined;

  if (favorRows) {
    favorWhere = jest.fn<Promise<FavorRow[]>, [unknown]>().mockResolvedValue(favorRows);
    const favorFrom = jest
      .fn()
      .mockReturnValue({
        where: favorWhere,
      });

    selectMock.mockReturnValueOnce({
      from: favorFrom,
    });
  }

  return { endorsementWhere, favorWhere };
};

const createGraph = (...pointIds: number[]) => ({
  nodes: pointIds.map((pointId) => ({
    type: "point",
    data: { pointId },
  })),
});

describe("calculateViewpointStatsForViewpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty stats when no viewpoints are provided", async () => {
    const result = await calculateViewpointStatsForViewpoints([]);

    expect(result.size).toBe(0);
    expect(selectMock).not.toHaveBeenCalled();
  });

  it("aggregates endorsements and favor per viewpoint", async () => {
    const endorsements = [
      { pointId: 1, userId: "user-a", cred: 3 },
      { pointId: 2, userId: "user-a", cred: 7 },
      { pointId: 3, userId: "user-b", cred: 5 },
    ];
    const favors = [
      { pointId: 1, favor: 40 },
      { pointId: 2, favor: 80 },
      { pointId: 3, favor: 0 },
    ];

    const { endorsementWhere, favorWhere } = mockSelectSequence(endorsements, favors);

    const result = await calculateViewpointStatsForViewpoints([
      { id: "v1", createdBy: "user-a", graph: createGraph(1, 2) },
      { id: "v2", createdBy: "user-b", graph: createGraph(3) },
    ]);

    expect(result.get("v1")).toEqual({ totalCred: 10, averageFavor: 60 });
    expect(result.get("v2")).toEqual({ totalCred: 5, averageFavor: 0 });
    expect(selectMock).toHaveBeenCalledTimes(2);
    expect(endorsementWhere).toHaveBeenCalledTimes(1);
    expect(favorWhere).toHaveBeenCalledTimes(1);
  });

  it("returns zero stats when no endorsements are found", async () => {
    const { endorsementWhere } = mockSelectSequence([]);

    const result = await calculateViewpointStatsForViewpoints([
      { id: "v3", createdBy: "user-c", graph: createGraph(4, 5) },
    ]);

    expect(result.get("v3")).toEqual({ totalCred: 0, averageFavor: 0 });
    expect(selectMock).toHaveBeenCalledTimes(1);
    expect(endorsementWhere).toHaveBeenCalledTimes(1);
  });
});
