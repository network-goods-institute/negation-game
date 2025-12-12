"use server";

import { cookies, headers } from "next/headers";
import { getPrivyClient } from "@/lib/privy/getPrivyClient";

/* eslint-disable drizzle/enforce-delete-with-where */

/**
 * Determines if the current request is from a Vercel preview deployment
 * by checking if the host ends with .vercel.app
 */
export async function isVercelPreviewDomain(): Promise<boolean> {
  const headersList = await headers();
  const host = headersList.get("host");
  const vercelPreviewPattern = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+vercel\.app$/;

  if (!host) {
    return false;
  }

  const normalizedHost = host.split(":")[0]?.toLowerCase().trim();

  if (!normalizedHost) {
    return false;
  }

  return vercelPreviewPattern.test(normalizedHost);
}

/**
 * Store the Privy token in an HttpOnly cookie
 */
export async function setPrivyCookie(token: string) {
  const cookieStore = await cookies();
  const isPreview = await isVercelPreviewDomain();

  cookieStore.set("privy-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: isPreview ? "lax" : "strict",
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
