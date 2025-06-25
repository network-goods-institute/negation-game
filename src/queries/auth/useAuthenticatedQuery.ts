import { usePrivy } from "@privy-io/react-auth";
import {
  useQuery,
  UseQueryOptions,
  UseQueryResult,
  QueryKey,
  QueryClient,
} from "@tanstack/react-query";
import { useEffect, useState, useCallback } from "react";
import { handleAuthError } from "@/lib/auth/handleAuthError";
import { setPrivyToken } from "@/lib/privy/setPrivyToken";
import { clearPrivyCookie } from "@/actions/users/auth";

const AUTH_ERROR_MESSAGES = [
  "Must be authenticated",
  "Authentication required",
  "not authenticated",
  "error when verifying user privy token",
];

// This function is a wrapper around useQuery that handles authentication errors
// by refreshing the token and retrying the query
export function useAuthenticatedQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  queryClient?: QueryClient
): UseQueryResult<TData, TError> {
  const { user, login, authenticated, ready } = usePrivy();
  const [lastAuthCheck, setLastAuthCheck] = useState<number>(Date.now());
  // Track retry attempts to prevent infinite loops
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;

  // Check authentication state periodically
  useEffect(() => {
    if (ready) {
      setLastAuthCheck(Date.now());
    }
  }, [ready, authenticated, user]);

  // Reset retry count when the query changes
  useEffect(() => {
    setRetryCount(0);
  }, [options.queryFn]);

  // Helper to check if an error is authentication related
  const isAuthError = useCallback((error: unknown): boolean => {
    if (!error) return false;

    // Check for known auth error messages
    const errorMessage = error instanceof Error ? error.message : String(error);
    return AUTH_ERROR_MESSAGES.some((msg) =>
      errorMessage.toLowerCase().includes(msg.toLowerCase())
    );
  }, []);

  // Enhanced query function that checks auth freshness
  const enhancedQueryFn = async (...args: any[]): Promise<TQueryFnData> => {
    // If not authenticated, trigger login
    if (!authenticated || !user) {
      login();
      throw new Error("Authentication required");
    }

    // If authentication is stale (older than 2 minutes), refresh token before proceeding
    if (Date.now() - lastAuthCheck > 2 * 60 * 1000) {
      const success = await setPrivyToken();
      if (!success) {
        throw new Error("Failed to refresh authentication");
      }
      setLastAuthCheck(Date.now());
    }

    try {
      // Execute the original query function
      return await (options.queryFn as any)(...args);
    } catch (error) {
      // If it's an auth error and we haven't exceeded retries, refresh token and retry
      if (isAuthError(error) && retryCount < MAX_RETRIES) {
        // Increment retry counter
        setRetryCount((prev) => prev + 1);

        // Attempt to refresh the token
        const success = await setPrivyToken();

        if (success) {
          setLastAuthCheck(Date.now());

          // Wait a moment for token to propagate
          await new Promise((r) => setTimeout(r, 200));

          return await (options.queryFn as any)(...args);
        } else {
          // If refresh fails, clear server-side cookie then trigger login
          await clearPrivyCookie();
          handleAuthError(error, "refreshing authentication");
          login();
          throw new Error("Authentication refresh failed");
        }
      }
      if (isAuthError(error) && retryCount >= MAX_RETRIES) {
        // Max retries reached—clear cookie and show error to force fresh login
        await clearPrivyCookie();
        handleAuthError(
          error,
          "performing action after multiple retry attempts"
        );
      }

      throw error;
    }
  };

  return useQuery(
    {
      ...options,
      queryFn: enhancedQueryFn,
    },
    queryClient
  );
}
