"use client";

import {
  QueryClient,
  QueryClientProvider as TanstackQueryClientProvider,
} from "@tanstack/react-query";
import { FC, PropsWithChildren, useState, useEffect } from "react";
import { setPrivyToken } from "@/lib/privy/setPrivyToken";

export const QueryClientProvider: FC<PropsWithChildren> = ({ children }) => {
  // Use React state to maintain the QueryClient instance between renders
  // This ensures the cache persists during navigation events
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    },
  }));

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
