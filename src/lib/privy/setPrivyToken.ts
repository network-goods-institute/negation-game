"use client";

import { getAccessToken } from "@privy-io/react-auth";
import { setPrivyCookie } from "@/app/actions/auth";

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

    // Use server action to set HttpOnly cookie
    await setPrivyCookie(token);
    return true;
  } catch (error) {
    console.error("Error setting Privy token:", error);
    return false;
  }
}
