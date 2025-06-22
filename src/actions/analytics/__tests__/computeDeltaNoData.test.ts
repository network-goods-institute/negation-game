import { computeDelta } from "../computeDelta";

// Mock necessary database schema objects
jest.mock("@/db/schema", () => ({
  pointClustersTable: {
    pointId: { name: "pointId" },
    rootId: { name: "rootId" },
    sign: { name: "sign" },
  },
  dailyStancesTable: {
    userId: { name: "userId" },
    pointId: { name: "pointId" },
    zValue: { name: "zValue" },
    snapDay: { name: "snapDay" },
  },
  snapshotsTable: {
    snapDay: { name: "snapDay" },
    userId: { name: "userId" },
    pointId: { name: "pointId" },
  },
  endorsementsTable: {
    pointId: { name: "pointId" },
    userId: { name: "userId" },
    cred: { name: "cred" },
  },
  usersTable: {
    id: { name: "id" },
    username: { name: "username" },
  },
}));

// Stub buildPointCluster to do nothing
jest.mock("@/actions/points/buildPointCluster", () => ({
  buildPointCluster: jest.fn().mockResolvedValue(undefined),
}));

// Mock drizzle-orm helpers used in computeDelta
jest.mock("drizzle-orm", () => {
  const actual = jest.requireActual("drizzle-orm");
  return {
    ...actual,
    sql: jest.fn((str) => ({
      as: jest.fn().mockReturnThis(),
      mapWith: jest.fn().mockReturnThis(),
      toString: () => str,
    })),
    eq: jest.fn(),
    and: jest.fn((...args) => args.filter(Boolean)),
    inArray: jest.fn(),
  };
});

// Mock the database client
function stubQuery(result: any = []) {
  const chain: any = {};
  const passthrough = jest.fn().mockReturnValue(chain);
  ["from", "where", "leftJoin", "groupBy", "orderBy", "limit"].forEach(
    (m) => (chain[m] = passthrough)
  );
  chain.then = jest.fn((onF, onR) => Promise.resolve(result).then(onF, onR));
  chain[Symbol.toStringTag] = "Promise";
  chain.catch = jest.fn(() => Promise.resolve());
  return chain;
}

jest.mock("@/services/db", () => {
  const selectMock = jest
    .fn()
    // 1. Cluster points
    .mockImplementationOnce(() => stubQuery([{ pointId: 1, sign: 1 }]))
    // 2. Daily stances rows (none)
    .mockImplementationOnce(() => stubQuery([]))
    // 3. Snapshot count (zero)
    .mockImplementationOnce(() => stubQuery([{ count: 0 }]))
    // 4. Endorsement rows (none)
    .mockImplementationOnce(() => stubQuery([]))
    // 5. Total cred rows (none)
    .mockImplementationOnce(() => stubQuery([]));

  return { db: { select: selectMock } };
});

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
