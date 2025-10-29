import { clampPercentage, initialMindchangeValue } from "../mindchange";

describe("mindchange utils", () => {
  it("clamps and rounds values to 0-100", () => {
    expect(clampPercentage(-5)).toBe(0);
    expect(clampPercentage(0)).toBe(0);
    expect(clampPercentage(9.6)).toBe(10);
    expect(clampPercentage(100.4)).toBe(100);
    expect(clampPercentage(150)).toBe(100);
    // @ts-ignore
    expect(clampPercentage(NaN)).toBe(0);
  });

  it("defaults initial value to 100 when userValue missing", () => {
    expect(initialMindchangeValue(undefined, 0)).toBe(100);
    expect(initialMindchangeValue(null, 50)).toBe(100);
  });

  it("uses userValue when provided", () => {
    expect(initialMindchangeValue(0, 80)).toBe(0);
    expect(initialMindchangeValue(33, 80)).toBe(33);
    expect(initialMindchangeValue(101, 80)).toBe(100);
  });
});

