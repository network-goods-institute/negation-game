import React from "react";
import { render, screen } from "@testing-library/react";
import Page from "../../rationale/multiplayer/[id]/page";
import { useAuthSetup } from "@/hooks/experiment/multiplayer/useAuthSetup";
import { useBoardResolution } from "@/hooks/experiment/multiplayer/useBoardResolution";
import { useModeState } from "@/hooks/experiment/multiplayer/useModeState";

jest.mock("@/hooks/experiment/multiplayer/useAuthSetup");
jest.mock("@/hooks/experiment/multiplayer/useBoardResolution");
jest.mock("@/hooks/experiment/multiplayer/useModeState");

const mockAuthSetup = useAuthSetup as jest.Mock;
const mockBoardResolution = useBoardResolution as jest.Mock;
const mockModeState = useModeState as jest.Mock;

const baseResolution = {
  routeParams: { id: "doc-1" },
  resolvedId: null,
  resolvedSlug: null,
  notFound: false,
  roomName: "room",
  accessRole: null,
  requiresAuth: true,
  forbidden: true,
  shareToken: null,
};

const baseModeState = {
  grabMode: false,
  setGrabMode: jest.fn(),
  perfBoost: false,
  setPerfBoost: jest.fn(),
  selectMode: "default",
};

describe("Multiplayer board access gate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockModeState.mockReturnValue(baseModeState);
  });

  it("shows login CTA when forbidden and unauthenticated", () => {
    mockAuthSetup.mockReturnValue({
      authenticated: false,
      privyReady: true,
      login: jest.fn(),
      userId: null,
      username: null,
      userColor: "#000",
    });
    mockBoardResolution.mockReturnValue({ ...baseResolution });

    render(<Page />);

    expect(screen.getByText(/Login to continue/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Login/i })).toBeInTheDocument();
  });

  it("hides login CTA when forbidden but already authenticated", () => {
    mockAuthSetup.mockReturnValue({
      authenticated: true,
      privyReady: true,
      login: jest.fn(),
      userId: "user-1",
      username: "alice",
      userColor: "#000",
    });
    mockBoardResolution.mockReturnValue({ ...baseResolution });

    render(<Page />);

    expect(screen.queryByRole("button", { name: /Login/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Request access from the owner/i)).toBeInTheDocument();
  });
});
