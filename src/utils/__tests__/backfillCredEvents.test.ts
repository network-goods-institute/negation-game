import { _deltaForTest } from "@/utils/backfillCredEvents";

describe("_deltaForTest utility", () => {
  it("returns positive delta when new > prev", () => {
    expect(_deltaForTest(10, 4)).toBe(6);
  });

  it("returns 0 when new <= prev", () => {
    expect(_deltaForTest(5, 7)).toBe(0);
    expect(_deltaForTest(5, 5)).toBe(0);
  });

  it("handles null/undefined previous values as 0", () => {
    expect(_deltaForTest(3, null)).toBe(3);
    expect(_deltaForTest(3)).toBe(3);
  });
});
