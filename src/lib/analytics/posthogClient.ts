"use client";

import posthog from "posthog-js";
import type { Properties } from "posthog-js";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";

let isInitialized = false;

export const isPostHogEnabled = () => Boolean(posthogKey);

export const initPostHog = () => {
  if (!isPostHogEnabled() || isInitialized) return;
  posthog.init(posthogKey as string, {
    api_host: posthogHost,
    capture_pageview: false,
    capture_pageleave: true,
  });
  isInitialized = true;
};

export const capturePostHogEvent = (
  event: string,
  properties?: Properties
) => {
  if (!isPostHogEnabled()) return;
  if (!isInitialized) initPostHog();
  posthog.capture(event, properties);
};

export const identifyPostHogUser = (
  distinctId: string,
  properties?: Properties
) => {
  if (!isPostHogEnabled()) return;
  if (!isInitialized) initPostHog();
  posthog.identify(distinctId, properties);
};

export const resetPostHog = () => {
  if (!isPostHogEnabled()) return;
  posthog.reset();
};
