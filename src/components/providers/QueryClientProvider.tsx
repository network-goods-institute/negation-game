"use client";

import {
  QueryClient,
  QueryClientProvider as TanstackQueryClientProvider,
} from "@tanstack/react-query";
import { FC, PropsWithChildren, useState, useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { setPrivyToken } from "@/lib/privy/setPrivyToken";
import { userQueryKey } from "@/queries/users/useUser";import { logger } from "@/lib/logger";
import { getAccessToken } from "@privy-io/react-auth";

interface QueryClientProviderProps extends PropsWithChildren {
  initialUserData?: any;
  initialUserId?: string;
}

export const QueryClientProvider: FC<QueryClientProviderProps> = ({ children, initialUserData, initialUserId }) => {
  // Use React state to maintain the QueryClient instance between renders
  // This ensures the cache persists during navigation events
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 15 * 60 * 1000, // 15 minutes (increased from 5)
          gcTime: 30 * 60 * 1000,   // Keep in memory longer
          retry: 1,                 // Reduce retries from 3 to 1
          retryDelay: 500,          // Faster retries (500ms vs exponential)
          refetchOnWindowFocus: false, // Reduce unnecessary requests
        },
      },
    });

    // Pre-populate user data if available from server
    if (initialUserData && initialUserId) {
      client.setQueryData(userQueryKey(initialUserId), initialUserData);
    }

    return client;
  });

  return (
    <TanstackQueryClientProvider client={queryClient}>
      {/* Refresh Privy token cookie on mount in case expired */}
      <ClientAuthRefresher />
      {/* Attach Authorization header for same-origin API calls */}
      <ClientAuthFetchInterceptor />
      {children}
      <div className="hidden sm:block">
        {/* <ReactQueryDevtools buttonPosition="bottom-left" /> */}
      </div>
    </TanstackQueryClientProvider>
  );
};

function ClientAuthRefresher() {
  const { ready, authenticated } = usePrivy();
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!ready || !authenticated) {
      return;
    }

    let cancelled = false;
    let refreshInterval: NodeJS.Timeout | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;
    let lastActivity = Date.now();

    const refreshToken = async (attempt = 1): Promise<void> => {
      if (cancelled || inFlightRef.current) return;
      inFlightRef.current = true;

      try {
        const success = await setPrivyToken();
        if (!success && attempt <= 4 && !cancelled) {
          scheduleRetry(attempt);
          return;
        }
      } catch (error) {
        if (!cancelled && attempt <= 4) {
          logger.warn("Retrying Privy token refresh after error", error);
          scheduleRetry(attempt);
          return;
        }
        logger.error("Failed to refresh Privy token:", error);
      } finally {
        inFlightRef.current = false;
      }
    };

    function scheduleRetry(attempt: number) {
      const delay = Math.min(1000 * attempt, 5000);
      retryTimeout = setTimeout(() => {
        inFlightRef.current = false;
        void refreshToken(attempt + 1);
      }, delay);
    }

    void refreshToken();

    refreshInterval = setInterval(() => {
      void refreshToken();
    }, 25 * 60 * 1000);

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivity > 45 * 60 * 1000) {
        void refreshToken();
      }
      lastActivity = now;
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      cancelled = true;
      if (refreshInterval) clearInterval(refreshInterval);
      if (retryTimeout) clearTimeout(retryTimeout);
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [ready, authenticated]);

  return null;
}

function ClientAuthFetchInterceptor() {
  const { ready, authenticated } = usePrivy();

  useEffect(() => {
    if (process.env.NODE_ENV === "test") return;
    if (typeof window === "undefined" || typeof window.fetch !== "function") return;
    const originalFetch = window.fetch.bind(window);

    const isSameOriginApi = (input: RequestInfo | URL): boolean => {
      try {
        if (typeof input === "string") {
          return input.startsWith("/api/");
        }
        if (input instanceof URL) {
          const loc = window.location;
          return (
            input.origin === loc.origin && input.pathname.startsWith("/api/")
          );
        }
        if (typeof Request !== "undefined" && input instanceof Request) {
          const url = new URL(input.url, window.location.origin);
          return (
            url.origin === window.location.origin &&
            url.pathname.startsWith("/api/")
          );
        }
      } catch {}
      return false;
    };

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        if (ready && authenticated && isSameOriginApi(input)) {
          const token = await getAccessToken().catch(() => null);
          if (token) {
            if (init) {
              init.headers = new Headers(init.headers as HeadersInit);
              const h = init.headers as Headers;
              if (!h.has("authorization")) {
                h.set("authorization", `Bearer ${token}`);
              }
            } else if (typeof Request !== "undefined" && input instanceof Request) {
              const newHeaders = new Headers(input.headers);
              if (!newHeaders.has("authorization")) {
                newHeaders.set("authorization", `Bearer ${token}`);
              }
              return originalFetch(
                new Request(input, { headers: newHeaders })
              );
            } else {
              init = { headers: { authorization: `Bearer ${token}` } };
            }
          }
        }
      } catch {}
      return originalFetch(input as any, init as any);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [ready, authenticated]);

  return null;
}
