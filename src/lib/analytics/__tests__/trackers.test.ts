jest.mock("@/lib/analytics/posthogClient", () => ({
  capturePostHogEvent: jest.fn(),
}));

import { capturePostHogEvent } from "@/lib/analytics/posthogClient";
import { analyticsEvents } from "@/lib/analytics/events";
import {
  trackLogin,
  trackOnboardingOpened,
  trackOnboardingDismissed,
  trackVideoOpened,
  trackVideoLoaded,
  trackMpBoardListViewed,
  trackMpBoardOpened,
  trackMpBoardViewed,
  trackMpBoardCreated,
  trackMpBoardDuplicated,
  trackMpBoardRenamed,
  trackMpBoardDeleted,
  trackMpBoardLinkCopied,
  trackMpBoardAccessDenied,
} from "@/lib/analytics/trackers";

describe("trackers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("tracks auth and onboarding events", () => {
    trackLogin("user-1");
    trackOnboardingOpened({ pathname: "/s/global", trigger: "manual" });
    trackOnboardingDismissed({ pathname: "/s/global", permanent: false });
    trackVideoOpened({ pathname: "/s/global" });
    trackVideoLoaded({ pathname: "/s/global" });

    expect(capturePostHogEvent).toHaveBeenCalledWith(
      analyticsEvents.auth.login,
      { distinctId: "user-1" }
    );
    expect(capturePostHogEvent).toHaveBeenCalledWith(
      analyticsEvents.onboarding.opened,
      { pathname: "/s/global", trigger: "manual" }
    );
    expect(capturePostHogEvent).toHaveBeenCalledWith(
      analyticsEvents.onboarding.dismissed,
      { pathname: "/s/global", permanent: false }
    );
    expect(capturePostHogEvent).toHaveBeenCalledWith(
      analyticsEvents.video.opened,
      { pathname: "/s/global" }
    );
    expect(capturePostHogEvent).toHaveBeenCalledWith(
      analyticsEvents.video.loaded,
      { pathname: "/s/global" }
    );
  });

  it("tracks multiplayer events", () => {
    trackMpBoardListViewed({ ownedCount: 2, sharedCount: 3 });
    trackMpBoardOpened({ boardId: "b1", source: "owned" });
    trackMpBoardViewed({
      boardId: "b1",
      accessRole: "owner",
      resolvedSlug: "board",
      shareToken: null,
    });
    trackMpBoardCreated({ boardId: "b2" });
    trackMpBoardDuplicated({ boardId: "b3", sourceBoardId: "b1" });
    trackMpBoardRenamed({ boardId: "b3", titleLength: 12 });
    trackMpBoardDeleted({ boardId: "b4" });
    trackMpBoardLinkCopied({ boardId: "b1", source: "shared" });
    trackMpBoardAccessDenied({
      boardId: "b5",
      requiresAuth: true,
      authenticated: false,
    });

    expect(capturePostHogEvent).toHaveBeenCalledWith(
      analyticsEvents.multiplayer.listViewed,
      { ownedCount: 2, sharedCount: 3 }
    );
    expect(capturePostHogEvent).toHaveBeenCalledWith(
      analyticsEvents.multiplayer.boardOpened,
      { boardId: "b1", source: "owned" }
    );
    expect(capturePostHogEvent).toHaveBeenCalledWith(
      analyticsEvents.multiplayer.boardViewed,
      {
        boardId: "b1",
        accessRole: "owner",
        resolvedSlug: "board",
        shareToken: null,
      }
    );
    expect(capturePostHogEvent).toHaveBeenCalledWith(
      analyticsEvents.multiplayer.boardCreated,
      { boardId: "b2" }
    );
    expect(capturePostHogEvent).toHaveBeenCalledWith(
      analyticsEvents.multiplayer.boardDuplicated,
      { boardId: "b3", sourceBoardId: "b1" }
    );
    expect(capturePostHogEvent).toHaveBeenCalledWith(
      analyticsEvents.multiplayer.boardRenamed,
      { boardId: "b3", titleLength: 12 }
    );
    expect(capturePostHogEvent).toHaveBeenCalledWith(
      analyticsEvents.multiplayer.boardDeleted,
      { boardId: "b4" }
    );
    expect(capturePostHogEvent).toHaveBeenCalledWith(
      analyticsEvents.multiplayer.boardLinkCopied,
      { boardId: "b1", source: "shared" }
    );
    expect(capturePostHogEvent).toHaveBeenCalledWith(
      analyticsEvents.multiplayer.accessDenied,
      { boardId: "b5", requiresAuth: true, authenticated: false }
    );
  });
});
