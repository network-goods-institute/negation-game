import { EDGE_CONFIGURATIONS } from "../EdgeConfiguration";
import { computeMindchangeStrokeWidth } from "../computeMindchangeStrokeWidth";

describe("computeMindchangeStrokeWidth", () => {
  const visual = EDGE_CONFIGURATIONS.negation.visual;

  it("falls back to relevance-based width when mindchange disabled", () => {
    const width = computeMindchangeStrokeWidth({
      enableMindchange: false,
      visual,
      relevance: 3,
      mindchange: undefined,
    });
    expect(width).toBe(visual.strokeWidth(3));
  });

  it("uses center width when no mindchange counts", () => {
    const wMin = visual.strokeWidth(0);
    const wMax = visual.strokeWidth(100);
    const center = (wMin + wMax) / 2;
    const width = computeMindchangeStrokeWidth({
      enableMindchange: true,
      visual,
      relevance: 3,
      mindchange: { forward: { average: 0, count: 0 }, backward: { average: 0, count: 0 } },
    });
    expect(width).toBe(center);
  });

  it("uses max width at 100 average", () => {
    const width = computeMindchangeStrokeWidth({
      enableMindchange: true,
      visual,
      relevance: 1,
      mindchange: { forward: { average: 100, count: 3 }, backward: { average: 0, count: 0 } },
    });
    expect(width).toBe(visual.strokeWidth(100));
  });

  it("applies compressed scaling between min and max", () => {
    const wMin = visual.strokeWidth(0);
    const wMax = visual.strokeWidth(100);
    const v = 25 / 100;
    const k = 3;
    const gamma = 2;
    const expected = wMin + (wMax - wMin) * (Math.log1p(k * Math.pow(v, gamma)) / Math.log1p(k));
    const width = computeMindchangeStrokeWidth({
      enableMindchange: true,
      visual,
      relevance: 2,
      mindchange: { forward: { average: 25, count: 4 }, backward: { average: 10, count: 1 } },
    });
    expect(width).toBeCloseTo(expected, 6);
    expect(width).toBeGreaterThan(wMin);
    expect(width).toBeLessThan(wMax);
  });
});
