"use client";

import {
  QueryClient,
  QueryClientProvider as TanstackQueryClientProvider,
} from "@tanstack/react-query";
import { FC, PropsWithChildren, useState, useEffect } from "react";
import { setPrivyToken } from "@/lib/privy/setPrivyToken";
import { userQueryKey } from "@/queries/users/useUser";

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
      {children}
      <div className="hidden sm:block">
        {/* <ReactQueryDevtools buttonPosition="bottom-left" /> */}
      </div>
    </TanstackQueryClientProvider>
  );
};

function ClientAuthRefresher() {
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;
    let lastActivity = Date.now();

    const refreshToken = async () => {
      try {
        const success = await setPrivyToken();
        if (success) {
          console.log("Privy token refreshed successfully");
        }
      } catch (error) {
        console.error("Failed to refresh Privy token:", error);
      }
    };

    // Initial refresh on mount
    refreshToken();

    refreshInterval = setInterval(refreshToken, 30 * 60 * 1000);

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivity > 45 * 60 * 1000) {
        refreshToken();
      }
      lastActivity = now;
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      clearInterval(refreshInterval);
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, []);
  return null;
}
