import { computeDelta24h, PricePoint } from "../usePriceHistory";

describe("usePriceHistory", () => {
  describe("computeDelta24h", () => {
    it("returns null for empty history", () => {
      expect(computeDelta24h([])).toBeNull();
    });

    it("returns 0 when only one data point exists", () => {
      const history: PricePoint[] = [
        { timestamp: new Date().toISOString(), price: 0.5 },
      ];
      expect(computeDelta24h(history)).toBe(0);
    });

    it("computes delta from first point when all points within 24h", () => {
      const now = Date.now();
      const history: PricePoint[] = [
        { timestamp: new Date(now - 3600000).toISOString(), price: 0.4 },
        { timestamp: new Date(now - 1800000).toISOString(), price: 0.45 },
        { timestamp: new Date(now).toISOString(), price: 0.5 },
      ];
      const delta = computeDelta24h(history);
      expect(delta).toBeCloseTo(0.1, 10);
    });

    it("uses baseline from 24h ago when data spans more than 24h", () => {
      const now = Date.now();
      const history: PricePoint[] = [
        { timestamp: new Date(now - 48 * 3600000).toISOString(), price: 0.3 },
        { timestamp: new Date(now - 25 * 3600000).toISOString(), price: 0.35 },
        { timestamp: new Date(now - 12 * 3600000).toISOString(), price: 0.4 },
        { timestamp: new Date(now).toISOString(), price: 0.5 },
      ];
      const delta = computeDelta24h(history);
      expect(delta).toBeCloseTo(0.15, 10);
    });

    it("handles negative delta correctly", () => {
      const now = Date.now();
      const history: PricePoint[] = [
        { timestamp: new Date(now - 3600000).toISOString(), price: 0.7 },
        { timestamp: new Date(now).toISOString(), price: 0.5 },
      ];
      const delta = computeDelta24h(history);
      expect(delta).toBeCloseTo(-0.2, 10);
    });

    it("handles invalid timestamps gracefully", () => {
      const now = Date.now();
      const history: PricePoint[] = [
        { timestamp: "invalid-date", price: 0.4 },
        { timestamp: new Date(now).toISOString(), price: 0.5 },
      ];
      const delta = computeDelta24h(history);
      expect(delta).toBeCloseTo(0.1, 10);
    });

    it("handles exactly 24h boundary correctly", () => {
      const now = Date.now();
      const cutoff = now - 24 * 3600000;
      const history: PricePoint[] = [
        { timestamp: new Date(cutoff - 1000).toISOString(), price: 0.3 },
        { timestamp: new Date(cutoff).toISOString(), price: 0.35 },
        { timestamp: new Date(cutoff + 1000).toISOString(), price: 0.4 },
        { timestamp: new Date(now).toISOString(), price: 0.5 },
      ];
      const delta = computeDelta24h(history);
      expect(delta).toBeCloseTo(0.15, 10);
    });
  });
});

