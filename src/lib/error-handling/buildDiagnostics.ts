// This is a utility file to help debug build-time errors

import { logger } from "@/lib/logger";

// Safe check for window that won't break during build
export const isBrowser = (): boolean => {
  return typeof window !== "undefined";
};

// Safe check for worker availability
export const areWorkersSupported = (): boolean => {
  return isBrowser() && typeof Worker !== "undefined";
};

// Helper to show build environment information
export const getBuildEnvironmentInfo = (): Record<string, any> => {
  return {
    isServer: !isBrowser(),
    hasWindow: isBrowser(),
    hasWorkers: areWorkersSupported(),
    nodeEnv: process.env.NODE_ENV,
    nextRuntime: process.env.NEXT_RUNTIME || "unknown",
  };
};

// Log environment info during module initialization
// This won't break server components or builds
if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
  const envInfo = getBuildEnvironmentInfo();

  // Safe logger.log that works in all environments
  if (typeof console !== "undefined") {
    logger.log("Build environment:", envInfo);
  }
}
