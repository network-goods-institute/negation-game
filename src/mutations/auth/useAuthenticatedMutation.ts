import { usePrivy } from "@privy-io/react-auth";
import { useMutation } from "@tanstack/react-query";
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

// This function is a wrapper around useMutation that conditionally uses the login mutation function if the user is not authenticated.
// This is a fallback. Ideally, the button that initiates the flow should the login form to prevent form data loss when signing in.
export const useAuthenticatedMutation: typeof useMutation = (
  { mutationFn, ...options },
  queryClient
) => {
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

  // Reset retry count when the mutation changes
  useEffect(() => {
    setRetryCount(0);
  }, [mutationFn]);

  // Helper to check if an error is authentication related
  const isAuthError = useCallback((error: unknown): boolean => {
    if (!error) return false;

    // Check for known auth error messages
    const errorMessage = error instanceof Error ? error.message : String(error);
    return AUTH_ERROR_MESSAGES.some((msg) =>
      errorMessage.toLowerCase().includes(msg.toLowerCase())
    );
  }, []);

  // Enhanced mutation function that checks auth freshness
  const enhancedMutationFn = async (...args: any[]) => {
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
      // Execute the original mutation function
      return await (mutationFn as any)(...args);
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

          // Retry the original function with the same arguments
          return await (mutationFn as any)(...args);
        } else {
          // If refresh fails, clear cookie then trigger login
          await clearPrivyCookie();
          handleAuthError(error, "refreshing authentication");
          login();
          throw new Error("Authentication refresh failed");
        }
      }

      // If it's an auth error but we've exceeded retries, show the error toast
      if (isAuthError(error) && retryCount >= MAX_RETRIES) {
        // Max retries reached—clear cookie and force fresh login
        await clearPrivyCookie();
        handleAuthError(
          error,
          "performing action after multiple retry attempts"
        );
      }

      // If it's not an auth error or we've exceeded retries, rethrow
      throw error;
    }
  };

  return useMutation(
    {
      mutationFn: enhancedMutationFn,
      ...options,
    },
    queryClient
  );
};
