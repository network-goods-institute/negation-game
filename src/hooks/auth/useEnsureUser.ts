"use client";

import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { setPrivyToken } from "@/lib/privy/setPrivyToken";

export const useEnsureUser = () => {
  const { user: privyUser, ready, authenticated } = usePrivy();
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!ready || !authenticated || !privyUser) {
      return;
    }

    let cancelled = false;

    const trySync = async (attempt = 1): Promise<void> => {
      if (cancelled || inFlightRef.current) return;
      inFlightRef.current = true;

      try {
        const success = await setPrivyToken();
        if (!success && attempt < 6 && !cancelled) {
          retryTimeoutRef.current = setTimeout(
            () => {
              inFlightRef.current = false;
              trySync(attempt + 1);
            },
            Math.min(1000 * attempt, 4000)
          );
          return;
        }
      } finally {
        inFlightRef.current = false;
      }
    };

    trySync();

    return () => {
      cancelled = true;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [ready, authenticated, privyUser?.id, privyUser]);
};
