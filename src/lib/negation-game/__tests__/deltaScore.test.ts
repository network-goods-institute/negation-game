import {
  stance,
  cosine,
  delta,
  toZScores,
} from "@/lib/negation-game/deltaScore";

describe("Δ-Score B core math", () => {
  it("stance formula matches spec", () => {
    const s = stance(10, 5, 2, 1, 50);
    // expected (10 + 1.5*5 - 0.3*2) / 50 = (10 + 7.5 - 0.6) / 50 = 16.9 / 50 = 0.338
    expect(Number(s.toFixed(3))).toBeCloseTo(0.338, 3);
  });

  it("cosine similarity basic", () => {
    expect(cosine([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("delta distance handles trivial cases", () => {
    // identical vectors
    expect(delta([0.1, 0.2], [0.1, 0.2])).toBeCloseTo(0);
    // opposite
    expect(delta([0.1, 0.2], [-0.1, -0.2])).toBeCloseTo(1);
  });

  it("delta returns null for mutual silence", () => {
    expect(delta([0, 0, 0], [0, 0, 0])).toBeNull();
  });

  it("toZScores clamps output", () => {
    const scores = toZScores([
      { bucket: "A", value: 100 },
      { bucket: "A", value: -100 },
    ]);
    expect(scores.every((v) => Math.abs(v) <= 0.05)).toBe(true);
  });
});
