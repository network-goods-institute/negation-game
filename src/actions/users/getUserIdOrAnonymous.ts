"use server";

import { getUserId } from "./getUserId";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";

/**
 * Returns the authenticated user ID, or generates/retrieves an anonymous session ID.
 * Anonymous IDs are prefixed with "anon-" and stored in a cookie.
 */
export const getUserIdOrAnonymous = async (): Promise<string> => {
  // Try to get authenticated user first
  const userId = await getUserId();
  if (userId) {
    return userId;
  }

  // Generate or retrieve anonymous session ID
  const cookieStore = await cookies();
  const existingAnonId = cookieStore.get("anon-session-id")?.value;

  if (existingAnonId && existingAnonId.startsWith("anon-")) {
    return existingAnonId;
  }

  // Generate new anonymous session ID
  const anonId = `anon-${nanoid(16)}`;

  // Set cookie for 30 days
  cookieStore.set("anon-session-id", anonId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return anonId;
};
