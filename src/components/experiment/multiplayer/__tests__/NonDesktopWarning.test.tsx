import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NonDesktopWarning } from "../NonDesktopWarning";
import { isNonDesktopExperience } from "@/utils/experiment/multiplayer/deviceDetection";

jest.mock("@/utils/experiment/multiplayer/deviceDetection", () => ({
  isNonDesktopExperience: jest.fn(),
}));

describe("NonDesktopWarning", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it("shows the warning when non-desktop is detected", async () => {
    (isNonDesktopExperience as jest.Mock).mockReturnValue(true);
    render(<NonDesktopWarning />);
    await waitFor(() => {
      expect(
        screen.getByText(/Desktop experience recommended/i)
      ).toBeInTheDocument();
    });
  });

  it("does not show when dismissed in local storage", async () => {
    window.localStorage.setItem("ng:mp-mobile-warning-dismissed", "true");
    (isNonDesktopExperience as jest.Mock).mockReturnValue(true);
    render(<NonDesktopWarning />);
    await waitFor(() => {
      expect(
        screen.queryByText(/Desktop experience recommended/i)
      ).not.toBeInTheDocument();
    });
  });

  it("dismisses and persists when continuing anyway", async () => {
    const user = userEvent.setup();
    (isNonDesktopExperience as jest.Mock).mockReturnValue(true);
    render(<NonDesktopWarning />);
    await waitFor(() => {
      expect(
        screen.getByText(/Desktop experience recommended/i)
      ).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Continue anyway/i }));
    expect(
      window.localStorage.getItem("ng:mp-mobile-warning-dismissed")
    ).toBe("true");
    expect(
      screen.queryByText(/Desktop experience recommended/i)
    ).not.toBeInTheDocument();
  });
});
