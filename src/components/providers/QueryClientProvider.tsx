"use client";

import {
  QueryClient,
  QueryClientProvider as TanstackQueryClientProvider,
} from "@tanstack/react-query";
import { FC, PropsWithChildren, useState } from "react";

export const QueryClientProvider: FC<PropsWithChildren> = ({ children }) => {
  // Use React state to maintain the QueryClient instance between renders
  // This ensures the cache persists during navigation events
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Increase staleTime to reduce unnecessary refetches
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    },
  }));

  return (
    <TanstackQueryClientProvider client={queryClient}>
      {children}
      <div className="hidden sm:block">
        {/* <ReactQueryDevtools buttonPosition="bottom-left" /> */}
      </div>
    </TanstackQueryClientProvider>
  );
};
