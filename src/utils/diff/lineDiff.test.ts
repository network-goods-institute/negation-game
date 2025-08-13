import { computeLineDiff } from "./lineDiff";

describe("computeLineDiff", () => {
  it("returns only context lines when texts are equal", () => {
    const a = "one\ntwo\nthree";
    const b = "one\ntwo\nthree";
    const diff = computeLineDiff(a, b);
    expect(diff.every((d) => d.type === "context")).toBe(true);
    expect(diff.map((d) => d.text)).toEqual(["one", "two", "three"]);
  });

  it("detects added and removed lines", () => {
    const a = "a\nb\nc";
    const b = "a\nb\nX\nc\nY";
    const diff = computeLineDiff(a, b);
    // Must contain +X and +Y as added, with contexts preserved
    expect(diff.some((d) => d.type === "added" && d.text === "X")).toBe(true);
    expect(diff.some((d) => d.type === "added" && d.text === "Y")).toBe(true);
    // No removed lines besides none for this case
    expect(diff.some((d) => d.type === "removed")).toBe(false);
  });

  it("marks line removals", () => {
    const a = "header\nold\nfooter";
    const b = "header\nfooter";
    const diff = computeLineDiff(a, b);
    expect(diff.some((d) => d.type === "removed" && d.text === "old")).toBe(
      true
    );
  });
});
