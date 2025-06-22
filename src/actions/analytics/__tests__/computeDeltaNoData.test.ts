import { computeDelta } from "../computeDelta";

function stubQuery(result: any = []) {
  const chain: any = {};
  const pass = jest.fn().mockReturnValue(chain);
  ["from", "where", "orderBy", "limit", "leftJoin"].forEach(
    (m) => (chain[m] = pass)
  );
  chain.then = jest.fn((onF, onR) => Promise.resolve(result).then(onF, onR));
  return chain;
}

jest.mock("@/services/db", () => {
  const selectMock = jest
    .fn()
    // cluster points
    .mockImplementationOnce(() => stubQuery([{ pointId: 1, sign: 1 }]))
    // daily stances rows
    .mockImplementationOnce(() => stubQuery([]))
    // snapshot count
    .mockImplementationOnce(() => stubQuery([{ count: 0 }]));

  return { db: { select: selectMock } };
});

// Stub buildPointCluster to do nothing
jest.mock("@/actions/points/buildPointCluster", () => ({
  buildPointCluster: jest.fn().mockResolvedValue(undefined),
}));

describe("computeDelta - no stance data", () => {
  it("returns delta=null and noInteraction=true when no data", async () => {
    const result = await computeDelta({
      userAId: "userA",
      userBId: "userB",
      rootPointId: 1,
      snapDay: "2024-01-02",
    });
    expect(result.delta).toBeNull();
    expect(result.noInteraction).toBe(true);
  });
});
