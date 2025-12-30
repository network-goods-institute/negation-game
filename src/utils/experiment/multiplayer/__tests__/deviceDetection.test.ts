import { isNonDesktopExperience } from "../deviceDetection";

describe("isNonDesktopExperience", () => {
  it("returns true for mobile user agents", () => {
    expect(
      isNonDesktopExperience({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      })
    ).toBe(true);
  });

  it("returns true for coarse pointer with no hover", () => {
    expect(
      isNonDesktopExperience({
        userAgent: "Mozilla/5.0",
        pointerCoarse: true,
        hoverNone: true,
        innerWidth: 1200,
      })
    ).toBe(true);
  });

  it("returns true for coarse pointer on narrow screens", () => {
    expect(
      isNonDesktopExperience({
        userAgent: "Mozilla/5.0",
        pointerCoarse: true,
        hoverNone: false,
        innerWidth: 600,
      })
    ).toBe(true);
  });

  it("returns true for narrow viewport even with fine pointer", () => {
    expect(
      isNonDesktopExperience({
        userAgent: "Mozilla/5.0",
        pointerCoarse: false,
        hoverNone: false,
        innerWidth: 680,
      })
    ).toBe(true);
  });

  it("returns false for desktop signals", () => {
    expect(
      isNonDesktopExperience({
        userAgent: "Mozilla/5.0 (X11; Linux x86_64)",
        pointerCoarse: false,
        hoverNone: false,
        innerWidth: 1440,
      })
    ).toBe(false);
  });
});
