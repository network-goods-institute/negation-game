import { shouldHideAppHeader } from "@/app/shouldHideAppHeader";

describe("shouldHideAppHeader", () => {
  test("hides the app header on embed routes", () => {
    expect(
      shouldHideAppHeader({
        pathname: "/embed/board/abc",
        isMultiplayerRoute: false,
        isMinimalMode: false,
      })
    ).toBe(true);
  });

  test("keeps the app header on multiplayer routes without minimal mode", () => {
    expect(
      shouldHideAppHeader({
        pathname: "",
        isMultiplayerRoute: true,
        isMinimalMode: false,
      })
    ).toBe(false);
  });

  test("hides the app header on multiplayer routes in minimal mode", () => {
    expect(
      shouldHideAppHeader({
        pathname: "",
        isMultiplayerRoute: true,
        isMinimalMode: true,
      })
    ).toBe(true);
  });
});
