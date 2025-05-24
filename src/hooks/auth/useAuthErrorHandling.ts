"use client";

import { useCallback, useState } from "react";
import { handleAuthError, isAuthError } from "@/lib/auth/handleAuthError";
import { usePrivy } from "@privy-io/react-auth";

/**
 * Hook that provides an error handler specifically for authentication issues
 * It can be used in components to catch authentication errors and show appropriate messages
 *
 * @returns Functions and state for handling auth errors
 */
export const useAuthErrorHandling = () => {
  const { login } = usePrivy();
  const [isHandlingAuthError, setIsHandlingAuthError] = useState(false);

  /**
   * Catch and handle authentication errors
   * If an error is related to authentication, it will show a toast and trigger appropriate action
   *
   * @param error The error to check and potentially handle
   * @param actionDescription Optional description of what was being attempted
   * @returns boolean - whether this was an auth error that was handled
   */
  const catchAuthError = useCallback(
    (error: unknown, actionDescription?: string): boolean => {
      if (isAuthError(error)) {
        setIsHandlingAuthError(true);
        handleAuthError(error, actionDescription);

        // If it's an auth error, also try to trigger a login flow to refresh the session
        setTimeout(() => {
          login();
          setIsHandlingAuthError(false);
        }, 500);

        return true;
      }
      return false;
    },
    [login]
  );

  /**
   * Wrap any async function with auth error handling
   * This helps prevent repetitive try/catch blocks
   *
   * @param fn The async function to execute
   * @param actionDescription Optional description of what's being attempted
   * @returns A new function that will catch auth errors
   */
  const withAuthErrorHandling = useCallback(
    <T extends any[], R>(
      fn: (...args: T) => Promise<R>,
      actionDescription?: string
    ) => {
      return async (...args: T): Promise<R | null> => {
        try {
          return await fn(...args);
        } catch (error) {
          const wasAuthError = catchAuthError(error, actionDescription);
          if (!wasAuthError) {
            // Re-throw non-auth errors
            throw error;
          }
          return null;
        }
      };
    },
    [catchAuthError]
  );

  return {
    catchAuthError,
    withAuthErrorHandling,
    isHandlingAuthError,
  };
};
