"use server";

import { usersTable } from "@/db/schema";
import { db } from "@/services/db";
import { eq, or, sql } from "drizzle-orm";

export const fetchUser = async (idOrUsername: string) => {
  // Check if this is likely a username (not starting with did:privy:)
  const isLikelyUsername = !idOrUsername.startsWith("did:privy:");

  let query;
  if (isLikelyUsername) {
    query = sql`LOWER(${usersTable.username}) = LOWER(${idOrUsername})`;
  } else {
    query = eq(usersTable.id, idOrUsername);
  }

  return await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      cred: usersTable.cred,
      bio: usersTable.bio,
      delegationUrl: usersTable.delegationUrl,
    })
    .from(usersTable)
    .where(query)
    .limit(1)
    .then((result) => (result.length === 1 ? result[0] : null));
};
