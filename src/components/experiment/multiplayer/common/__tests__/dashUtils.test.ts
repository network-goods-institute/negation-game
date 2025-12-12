import { computeDashOffset, getDashCycleLength } from "../dashUtils";

describe("dash utilities", () => {
  it("returns cycle length for comma and space separated dash arrays", () => {
    expect(getDashCycleLength("8,4")).toBe(12);
    expect(getDashCycleLength("6 6")).toBe(12);
  });

  it("returns null for empty or invalid dash arrays", () => {
    expect(getDashCycleLength("")).toBeNull();
    expect(getDashCycleLength("0,0")).toBeNull();
  });

  it("computes dash offset continuing a pattern after consumed length", () => {
    expect(computeDashOffset(12, "8,4")).toBe(0);
    expect(computeDashOffset(13, "8,4")).toBe(1);
    expect(computeDashOffset(25, "6 6")).toBe(1);
  });
});
