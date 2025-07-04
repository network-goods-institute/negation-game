"use server";

import { usersTable } from "@/db/schema";
import { normalizeUsername } from "@/db/tables/usersTable";
import { db } from "@/services/db";
import { eq, and } from "drizzle-orm";

export const fetchUser = async (idOrUsername: string) => {
  try {
    const isLikelyUsername = !idOrUsername.startsWith("did:privy:");

    let identifierQuery;
    if (isLikelyUsername) {
      identifierQuery = eq(
        usersTable.usernameCanonical,
        normalizeUsername(idOrUsername)
      );
    } else {
      identifierQuery = eq(usersTable.id, idOrUsername);
    }

    const whereCondition = and(identifierQuery, eq(usersTable.isActive, true));

    const selectQuery = db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        cred: usersTable.cred,
        bio: usersTable.bio,
        delegationUrl: usersTable.delegationUrl,
        agoraLink: usersTable.agoraLink,
        scrollDelegateLink: usersTable.scrollDelegateLink,
        discourseUsername: usersTable.discourseUsername,
        discourseCommunityUrl: usersTable.discourseCommunityUrl,
        discourseConsentGiven: usersTable.discourseConsentGiven,
        showReadReceipts: usersTable.showReadReceipts,
        receiveReadReceipts: usersTable.receiveReadReceipts,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(whereCondition)
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
