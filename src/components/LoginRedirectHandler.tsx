"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useRef } from "react";import { logger } from "@/lib/logger";

/**
 * Handles redirecting to sync.negationgame.com after a successful login
 * This component should be mounted in the layout to work globally
 */
export const LoginRedirectHandler = () => {
  const { ready, authenticated } = usePrivy();
  const prevAuthenticatedRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!ready) return;

    // Detect when authentication state changes from false to true (login event)
    const didJustLogin = prevAuthenticatedRef.current === false && authenticated === true;

    // Update the ref for next render
    prevAuthenticatedRef.current = authenticated;

    // If user just logged in, redirect to sync
    if (didJustLogin) {
      const currentHost = typeof window !== 'undefined' ? window.location.host : '';

      // Check if we're on the main domain (not sync subdomain)
      const isMainNegationGame =
        currentHost === 'negationgame.com' ||
        currentHost === 'www.negationgame.com';

      const isLocalhost = currentHost.startsWith('localhost');

      // Redirect to sync subdomain
      if (isMainNegationGame) {
        window.location.href = 'https://sync.negationgame.com';
      } else if (isLocalhost && !currentHost.includes('sync')) {
        // For localhost development, just log instead of redirecting
        logger.log('[LoginRedirectHandler] Would redirect to sync in production');
      }
    }
  }, [ready, authenticated]);

  return null;
};
