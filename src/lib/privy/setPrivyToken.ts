"use client";

import { getAccessToken } from "@privy-io/react-auth";

/**
 * Sets the Privy token as a cookie after retrieving it from the SDK
 * This ensures server-side actions can access the token
 */
export async function setPrivyToken(): Promise<boolean> {
  try {
    const token = await getAccessToken();
    if (!token) {
      console.warn("No token returned from getAccessToken");
      return false;
    }

    // Set cookie with 1 hour expiry
    const expiryDate = new Date();
    expiryDate.setTime(expiryDate.getTime() + 60 * 60 * 1000); // 1 hour from now

    // Set the cookie with secure and samesite attributes
    document.cookie = `privy-token=${token}; expires=${expiryDate.toUTCString()}; path=/; ${process.env.NODE_ENV === "production" ? "secure; " : ""}samesite=strict`;

    return true;
  } catch (error) {
    console.error("Error setting Privy token:", error);
    return false;
  }
}
