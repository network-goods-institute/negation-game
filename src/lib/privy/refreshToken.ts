"use client";

import { usePrivy, getAccessToken } from "@privy-io/react-auth";

/**
 * Refreshes the Privy authentication token using the official SDK method
 * This uses getAccessToken which automatically handles token refresh
 *
 * @returns Promise<boolean> - Whether a valid token was obtained
 */
export const refreshPrivyToken = async (): Promise<boolean> => {
  try {
    const token = await getAccessToken();
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
      return token !== null;
    } catch (error) {
      console.error("Failed to refresh Privy token:", error);
      return false;
    }
  };

  return {
    refreshToken,
    loginFallback: login,
  };
};
