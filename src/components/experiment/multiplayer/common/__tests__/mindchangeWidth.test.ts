import { computeMindchangeStrokeWidth } from '../mindchangeWidth';

describe('computeMindchangeStrokeWidth', () => {
  test('returns min width at 0 intensity', () => {
    const w = computeMindchangeStrokeWidth(2, 8, { forward: { average: 0, count: 0 }, backward: { average: 0, count: 0 } });
    expect(w).toBe(2);
  });

  test('returns max width at 100 intensity', () => {
    const w = computeMindchangeStrokeWidth(2, 8, { forward: { average: 100, count: 5 }, backward: { average: 0, count: 0 } });
    expect(w).toBe(8);
  });

  test('log scale between 0 and 100', () => {
    const w50 = computeMindchangeStrokeWidth(2, 8, { forward: { average: 50, count: 3 }, backward: { average: 0, count: 0 } });
    expect(w50).toBeGreaterThan(2);
    expect(w50).toBeLessThan(8);
    const w10 = computeMindchangeStrokeWidth(2, 8, { forward: { average: 10, count: 2 }, backward: { average: 0, count: 0 } });
    const w90 = computeMindchangeStrokeWidth(2, 8, { forward: { average: 90, count: 2 }, backward: { average: 0, count: 0 } });
    expect(w90).toBeGreaterThan(w50);
    expect(w50).toBeGreaterThan(w10);
  });
});

