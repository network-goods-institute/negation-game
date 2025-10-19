jest.mock("@/services/db", () => {
  const rows = [
    { userId: "u1", username: "alice", forwardValue: 0, backwardValue: 50 },
    { userId: "u2", username: null, forwardValue: 20, backwardValue: 0 },
  ];
  const db = {
    select: () => ({
      from: () => ({
        leftJoin: () => ({
          where: () => rows,
        }),
      }),
    }),
  };
  return { db };
});

import { getMindchangeBreakdown } from "../mindchange";

describe("getMindchangeBreakdown filters zeros and maps usernames", () => {
  const OLD_ENV = process.env as any;
  beforeEach(() => {
    jest.resetModules();
    (process as any).env = { ...OLD_ENV, ENABLE_MINDCHANGE: "true" };
  });
  afterAll(() => {
    (process as any).env = OLD_ENV;
  });

  it("excludes zero values and falls back to userId when username missing", async () => {
    const res = await getMindchangeBreakdown("doc", "edge");
    expect(Array.isArray(res.forward)).toBe(true);
    expect(Array.isArray(res.backward)).toBe(true);
    expect(res.forward).toEqual(
      expect.arrayContaining([{ userId: "u2", username: "u2", value: 20 }])
    );
    expect(res.backward).toEqual(
      expect.arrayContaining([{ userId: "u1", username: "alice", value: 50 }])
    );
    expect(res.forward.find((x) => x.userId === "u1")).toBeUndefined();
    expect(res.backward.find((x) => x.userId === "u2")).toBeUndefined();
  });
});

