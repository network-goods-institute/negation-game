"use client";

import { analyticsEvents } from "@/lib/analytics/events";
import { capturePostHogEvent } from "@/lib/analytics/posthogClient";

export const trackLogin = (distinctId: string) => {
  capturePostHogEvent(analyticsEvents.auth.login, { distinctId });
};

export const trackOnboardingOpened = (payload: {
  pathname?: string | null;
  trigger: "manual" | "auto";
}) => {
  capturePostHogEvent(analyticsEvents.onboarding.opened, payload);
};

export const trackOnboardingDismissed = (payload: {
  pathname?: string | null;
  permanent: boolean;
}) => {
  capturePostHogEvent(analyticsEvents.onboarding.dismissed, payload);
};

export const trackVideoOpened = (payload: { pathname?: string | null }) => {
  capturePostHogEvent(analyticsEvents.video.opened, payload);
};

export const trackVideoLoaded = (payload: { pathname?: string | null }) => {
  capturePostHogEvent(analyticsEvents.video.loaded, payload);
};

export const trackMpBoardListViewed = (payload: {
  ownedCount: number;
  sharedCount: number;
}) => {
  capturePostHogEvent(analyticsEvents.multiplayer.listViewed, payload);
};

export const trackMpBoardOpened = (payload: {
  boardId: string;
  source: "owned" | "shared" | "unknown";
}) => {
  capturePostHogEvent(analyticsEvents.multiplayer.boardOpened, payload);
};

export const trackMpBoardViewed = (payload: {
  boardId: string;
  accessRole?: string | null;
  resolvedSlug?: string | null;
  shareToken?: string | null;
}) => {
  capturePostHogEvent(analyticsEvents.multiplayer.boardViewed, payload);
};

export const trackMpBoardCreated = (payload: { boardId: string }) => {
  capturePostHogEvent(analyticsEvents.multiplayer.boardCreated, payload);
};

export const trackMpBoardDuplicated = (payload: {
  boardId: string;
  sourceBoardId: string;
}) => {
  capturePostHogEvent(analyticsEvents.multiplayer.boardDuplicated, payload);
};

export const trackMpBoardRenamed = (payload: {
  boardId: string;
  titleLength: number;
}) => {
  capturePostHogEvent(analyticsEvents.multiplayer.boardRenamed, payload);
};

export const trackMpBoardDeleted = (payload: { boardId: string }) => {
  capturePostHogEvent(analyticsEvents.multiplayer.boardDeleted, payload);
};

export const trackMpBoardLinkCopied = (payload: {
  boardId: string;
  source: "owned" | "shared" | "unknown";
}) => {
  capturePostHogEvent(analyticsEvents.multiplayer.boardLinkCopied, payload);
};

export const trackMpBoardAccessDenied = (payload: {
  boardId?: string | null;
  requiresAuth: boolean;
  authenticated: boolean;
}) => {
  capturePostHogEvent(analyticsEvents.multiplayer.accessDenied, payload);
};
