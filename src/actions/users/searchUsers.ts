"use server";

import { getUserId } from "@/actions/users/getUserId";
import { usersTable } from "@/db/schema";
import { db } from "@/services/db";
import { and, ilike, ne } from "drizzle-orm";

export const searchUsers = async (query: string) => {
  const currentUserId = await getUserId();

  if (!currentUserId) {
    throw new Error("Must be authenticated to search users");
  }

  if (!query.trim()) {
    return [];
  }

  const users = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
    })
    .from(usersTable)
    .where(
      and(
        ilike(usersTable.username, `%${query.trim()}%`),
        ne(usersTable.id, currentUserId)
      )
    )
    .limit(10);

  return users;
};
