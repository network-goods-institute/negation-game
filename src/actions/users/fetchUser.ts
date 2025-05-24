"use server";

import { usersTable } from "@/db/schema";
import { db } from "@/services/db";
import { eq, sql } from "drizzle-orm";

export const fetchUser = async (idOrUsername: string) => {
  try {
    const isLikelyUsername = !idOrUsername.startsWith("did:privy:");

    let query;
    if (isLikelyUsername) {
      query = sql`LOWER(${usersTable.username}) = LOWER(${idOrUsername})`;
    } else {
      query = eq(usersTable.id, idOrUsername);
    }

    const selectQuery = db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        cred: usersTable.cred,
        bio: usersTable.bio,
        delegationUrl: usersTable.delegationUrl,
        discourseUsername: usersTable.discourseUsername,
        discourseCommunityUrl: usersTable.discourseCommunityUrl,
        discourseConsentGiven: usersTable.discourseConsentGiven,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(query)
      .limit(1);

    const result = await selectQuery.execute();

    return result.length === 1 ? result[0] : null;
  } catch (error) {
    console.error(
      `[fetchUser] Error during database query for ${idOrUsername}:`,
      error
    );
    return null;
  }
};
