import { isNonDesktopExperience } from "../deviceDetection";

describe("isNonDesktopExperience", () => {
  it("returns true for narrow viewport", () => {
    expect(
      isNonDesktopExperience({
        innerWidth: 400,
      })
    ).toBe(true);
  });

  it("returns false for wide viewport", () => {
    expect(
      isNonDesktopExperience({
        innerWidth: 1440,
      })
    ).toBe(false);
  });
});
