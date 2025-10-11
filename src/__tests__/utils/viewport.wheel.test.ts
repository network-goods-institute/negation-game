import { panViewportByWheel } from "../../utils/experiment/multiplayer/viewport";

describe("panViewportByWheel", () => {
  it("adds wheel deltas to viewport x/y without changing zoom", () => {
    const current = { x: 100, y: 200, zoom: 1.5 };
    const next = panViewportByWheel(current, -40, 25);
    expect(next).toEqual({ x: 60, y: 225, zoom: 1.5 });
  });

  it("works with zeros", () => {
    const current = { x: 0, y: 0, zoom: 1 };
    const next = panViewportByWheel(current, 0, 0);
    expect(next).toEqual({ x: 0, y: 0, zoom: 1 });
  });
});
