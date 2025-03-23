"use client";

import { usePrivy, getAccessToken } from "@privy-io/react-auth";
import { handleAuthError } from "@/lib/auth/handleAuthError";

/**
 * Refreshes the Privy authentication token using the official SDK method
 * This uses getAccessToken which automatically handles token refresh
 *
 * @returns Promise<boolean> - Whether a valid token was obtained
 */
export const refreshPrivyToken = async (): Promise<boolean> => {
  try {
    const token = await getAccessToken();
    if (!token) {
      console.warn(
        "Empty token returned from getAccessToken during token refresh"
      );
    }
    return token !== null;
  } catch (error) {
    console.error("Failed to refresh Privy token:", error);
    return false;
  }
};

/**
 * Hook to get the token refresh function
 * This creates a stable reference to the refresh function
 */
export const useRefreshPrivyToken = () => {
  const { getAccessToken, login } = usePrivy();

  const refreshToken = async (): Promise<boolean> => {
    try {
      const token = await getAccessToken();
      if (!token) {
        console.warn(
          "Empty token returned from getAccessToken during token refresh in useRefreshPrivyToken"
        );
      }
      return token !== null;
    } catch (error) {
      console.error(
        "Failed to refresh Privy token in useRefreshPrivyToken:",
        error
      );
      handleAuthError(error, "refreshing authentication");
      return false;
    }
  };

  return {
    refreshToken,
    loginFallback: login,
  };
};
