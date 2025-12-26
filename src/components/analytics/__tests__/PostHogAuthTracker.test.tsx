jest.mock("@privy-io/react-auth", () => ({
  usePrivy: jest.fn(),
}));

jest.mock("@/lib/analytics/trackers", () => ({
  trackLogin: jest.fn(),
}));

jest.mock("@/lib/analytics/posthogClient", () => ({
  identifyPostHogUser: jest.fn(),
  resetPostHog: jest.fn(),
}));

import { render } from "@testing-library/react";
import { usePrivy } from "@privy-io/react-auth";
import { trackLogin } from "@/lib/analytics/trackers";
import {
  identifyPostHogUser,
  resetPostHog,
} from "@/lib/analytics/posthogClient";
import { PostHogAuthTracker } from "@/components/analytics/PostHogAuthTracker";

describe("PostHogAuthTracker", () => {
  const privyState = {
    ready: true,
    authenticated: false,
    user: null as any,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (usePrivy as jest.Mock).mockImplementation(() => privyState);
  });

  it("tracks login when authentication becomes true", () => {
    const { rerender } = render(<PostHogAuthTracker />);
    expect(trackLogin).not.toHaveBeenCalled();

    privyState.authenticated = true;
    privyState.user = { id: "user-1" };
    rerender(<PostHogAuthTracker />);

    expect(identifyPostHogUser).toHaveBeenCalledWith("user-1", {
      authenticated: true,
    });
    expect(trackLogin).toHaveBeenCalledWith("user-1");

    privyState.authenticated = false;
    privyState.user = null;
    rerender(<PostHogAuthTracker />);

    expect(resetPostHog).toHaveBeenCalled();
  });
});
