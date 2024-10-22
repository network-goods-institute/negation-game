"use client";

import {
  QueryClient,
  QueryClientProvider as TanstackQueryClientProvider,
} from "@tanstack/react-query";
import { FC, PropsWithChildren } from "react";

export const QueryClientProvider: FC<PropsWithChildren> = ({ children }) => {
  const queryClient = new QueryClient();

  return (
    <TanstackQueryClientProvider client={queryClient}>
      {children}
      <div className="hidden sm:block">
        {/* <ReactQueryDevtools buttonPosition="bottom-left" /> */}
      </div>
    </TanstackQueryClientProvider>
  );
};
