"use server";

import { usersTable } from "@/db/schema";
import { normalizeUsername } from "@/db/tables/usersTable";
import { db } from "@/services/db";
import { eq, and } from "drizzle-orm";import { logger } from "@/lib/logger";

const userCache = new Map<string, { user: any; expires: number }>();
const CACHE_DURATION = 5 * 60 * 1000;
export const fetchUser = async (idOrUsername: string) => {
  try {
    const cached = userCache.get(idOrUsername);
    if (cached && cached.expires > Date.now()) {
      return cached.user;
    }

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
        tutorialVideoSeenAt: usersTable.tutorialVideoSeenAt,
        avatarUrl: usersTable.avatarUrl,
        avatarUpdatedAt: usersTable.avatarUpdatedAt,
      })
      .from(usersTable)
      .where(whereCondition)
      .limit(1);

    const result = await selectQuery.execute();
    const user = result.length === 1 ? result[0] : null;

    if (user) {
      userCache.set(idOrUsername, {
        user,
        expires: Date.now() + CACHE_DURATION,
      });
    }

    return user;
  } catch (error) {
    logger.error(
      "[fetchUser] Error during database query for:",
      idOrUsername,
      "Error:",
      error
    );
    return null;
  }
};

export const invalidateUserCache = async (idOrUsername?: string | null) => {
  if (!idOrUsername) return;
  try {
    userCache.delete(idOrUsername);
  } catch {
    return;
  }
};

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of userCache.entries()) {
    if (value.expires <= now) {
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      userCache.delete(key);
    }
  }
}, 60 * 1000);
