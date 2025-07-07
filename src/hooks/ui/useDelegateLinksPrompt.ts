"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useUser } from "@/queries/users/useUser";
import { useCurrentSpace } from "@/hooks/utils/useCurrentSpace";

export function useDelegateLinksPrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const { user: privyUser, ready } = usePrivy();
  const { data: userData } = useUser(privyUser?.id);
  const currentSpace = useCurrentSpace();

  useEffect(() => {
    if (!ready || !privyUser) return;

    if (currentSpace !== "scroll") return;

    const hasSeenPrompt = localStorage.getItem("hasSeenDelegatePrompt");
    if (hasSeenPrompt) return;

    const hasAgoraLink = !!userData?.agoraLink;
    const hasScrollLink = !!userData?.scrollDelegateLink;
    const hasDelegationUrl = !!userData?.delegationUrl;

    if (hasAgoraLink && hasScrollLink && hasDelegationUrl) {
      localStorage.setItem("hasSeenDelegatePrompt", "true");
      return;
    }

    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [ready, privyUser, userData, currentSpace]);

  return {
    isOpen,
    setIsOpen,
  };
}
