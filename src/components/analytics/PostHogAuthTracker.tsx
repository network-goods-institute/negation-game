"use client";

import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  identifyPostHogUser,
  resetPostHog,
} from "@/lib/analytics/posthogClient";
import { trackLogin } from "@/lib/analytics/trackers";

type PrivyUserShape = {
  id?: string;
  sub?: string;
  userId?: string;
};

const getDistinctId = (user: PrivyUserShape | null | undefined) =>
  user?.id || user?.sub || user?.userId || null;

export const PostHogAuthTracker = () => {
  const { ready, authenticated, user } = usePrivy();
  const previousAuth = useRef<boolean | null>(null);
  const previousDistinctId = useRef<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    const distinctId = getDistinctId(user as PrivyUserShape | null);

    if (authenticated && distinctId) {
      if (previousDistinctId.current !== distinctId) {
        identifyPostHogUser(distinctId, { authenticated: true });
        previousDistinctId.current = distinctId;
      }

      if (previousAuth.current !== true) {
        trackLogin(distinctId);
      }
    } else if (previousAuth.current) {
      resetPostHog();
      previousDistinctId.current = null;
    }

    previousAuth.current = authenticated;
  }, [ready, authenticated, user]);

  return null;
};
