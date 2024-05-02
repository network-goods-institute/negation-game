"use client";

import { useIsAtLeast } from "@/hooks/useIsAtLeast";
import {
  QueryClient,
  QueryClientProvider as TanstackQueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { FC, PropsWithChildren } from "react";

export const QueryClientProvider: FC<PropsWithChildren> = ({ children }) => {
  const queryClient = new QueryClient();
  const isDesktop = useIsAtLeast("sm", false);

  return (
    <TanstackQueryClientProvider client={queryClient}>
      {children}
      {isDesktop && <ReactQueryDevtools buttonPosition="bottom-left" />}
    </TanstackQueryClientProvider>
  );
};
