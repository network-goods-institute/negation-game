"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useUser } from "@/queries/users/useUser";

export function useDelegateLinksPrompt() {
    const [isOpen, setIsOpen] = useState(false);
    const { user: privyUser, ready } = usePrivy();
    const { data: userData } = useUser(privyUser?.id);

    useEffect(() => {
        if (!ready || !privyUser) return;

        const hasSeenPrompt = localStorage.getItem("hasSeenDelegatePrompt");
        if (hasSeenPrompt) return;

        const hasAnyDelegateLink = userData?.agoraLink || userData?.scrollDelegateLink || userData?.delegationUrl;
        if (hasAnyDelegateLink) {
            localStorage.setItem("hasSeenDelegatePrompt", "true");
            return;
        }

        const timer = setTimeout(() => {
            setIsOpen(true);
        }, 2000);

        return () => clearTimeout(timer);
    }, [ready, privyUser, userData]);

    return {
        isOpen,
        setIsOpen,
    };
}