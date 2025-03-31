"use server";

import { usersTable } from "@/db/schema";
import { db } from "@/services/db";
import { eq, sql } from "drizzle-orm";

export const fetchUser = async (idOrUsername: string) => {
  try {
    // Check if this is likely a username (not starting with did:privy:)
    const isLikelyUsername = !idOrUsername.startsWith("did:privy:");

    let query;
    if (isLikelyUsername) {
      query = sql`LOWER(${usersTable.username}) = LOWER(${idOrUsername})`;
    } else {
      query = eq(usersTable.id, idOrUsername);
    }

    const result = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        cred: usersTable.cred,
        bio: usersTable.bio,
        delegationUrl: usersTable.delegationUrl,
        discourseUsername: usersTable.discourseUsername,
        discourseCommunityUrl: usersTable.discourseCommunityUrl,
        discourseConsentGiven: usersTable.discourseConsentGiven,
      })
      .from(usersTable)
      .where(query)
      .limit(1);

    return result.length === 1 ? result[0] : null;
  } catch (error) {
    return null;
  }
};
