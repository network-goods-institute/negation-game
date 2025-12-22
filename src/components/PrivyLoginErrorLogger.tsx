"use client";

import { useLogin } from "@privy-io/react-auth";
import { useMemo } from "react";
import { logger } from "@/lib/logger";

export const PrivyLoginErrorLogger = () => {
  const callbacks = useMemo(
    () => ({
      onError: (error: unknown) => {
        logger.error("Privy login error", { error });
      },
    }),
    []
  );

  useLogin(callbacks);

  return null;
};
