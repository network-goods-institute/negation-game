"use server";

import { cookies } from "next/headers";
import { getPrivyClient } from "@/lib/privy/getPrivyClient";

/* eslint-disable drizzle/enforce-delete-with-where */

/**
 * Store the Privy token in an HttpOnly cookie
 */
export async function setPrivyCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set("privy-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60,
  });
}

/**
 * Remove the Privy token cookie
 */
export async function clearPrivyCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("privy-token");
}

/**
 * Retrieve the current user session from Privy using the stored token
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("privy-token")?.value;
  if (!token) return null;

  const client = await getPrivyClient();
  try {
    const session = await client.verifyAuthToken(token);
    return session;
  } catch (error) {
    console.error("Error verifying Privy auth token:", error);
    // Clear invalid cookie
    await clearPrivyCookie();
    return null;
  }
}
