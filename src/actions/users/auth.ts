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
    maxAge: 24 * 60 * 60, // 24 hours
  });
}

/**
 * Remove the Privy token cookie
 */
export async function clearPrivyCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("privy-token");
}
