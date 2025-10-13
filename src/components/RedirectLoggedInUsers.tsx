"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useRef } from "react";

export const RedirectLoggedInUsers = () => {
  const { ready, authenticated } = usePrivy();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (!ready || hasRedirectedRef.current) return;

    // Only redirect if user is authenticated
    if (authenticated) {
      const currentHost = typeof window !== 'undefined' ? window.location.host : '';

      // Check if we're on the main domain (not sync subdomain)
      const isMainNegationGame =
        currentHost === 'negationgame.com' ||
        currentHost === 'www.negationgame.com';

      const isLocalhost = currentHost.startsWith('localhost');

      // If we're on negationgame.com (not sync) and user is logged in, redirect
      if (isMainNegationGame) {
        hasRedirectedRef.current = true;
        window.location.href = 'https://sync.negationgame.com';
      } else if (isLocalhost && !currentHost.includes('sync')) {
        // For localhost development, just log instead of redirecting
        console.log('[RedirectLoggedInUsers] Would redirect to sync in production');
      }
    }
  }, [ready, authenticated]);

  return null;
};
