import { shouldRenderMindchangeBadge } from "@/utils/experiment/multiplayer/mindchangeHelpers";

describe("mindchange badges", () => {
  it("renders badge when counts exist and feature enabled", () => {
    const base = {
      id: "e1",
      type: "support",
      data: {
        mindchange: {
          forward: { average: 60, count: 2 },
          backward: { average: 20, count: 1 },
        },
      },
    } as any;
    expect(shouldRenderMindchangeBadge(base, true)).toBe(true);
  });

  it("skips when feature disabled or counts are zero", () => {
    const base = {
      id: "e2",
      type: "support",
      data: {
        mindchange: {
          forward: { average: 0, count: 0 },
          backward: { average: 0, count: 0 },
        },
      },
    } as any;
    expect(shouldRenderMindchangeBadge(base, false)).toBe(false);
    expect(shouldRenderMindchangeBadge(base, true)).toBe(false);
  });
});
