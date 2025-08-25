"use client";

import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { setPrivyToken } from "@/lib/privy/setPrivyToken";

export const useEnsureUser = () => {
  const { user: privyUser, ready } = usePrivy();
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!ready || !privyUser || inFlightRef.current) return;
    inFlightRef.current = true;
    (async () => {
      try {
        await setPrivyToken();
      } finally {
        inFlightRef.current = false;
      }
    })();
  }, [ready, privyUser]);
};
