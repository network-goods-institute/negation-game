"use server";

import { db } from "@/services/db";
import { usersTable } from "@/db/tables/usersTable";
import { inArray } from "drizzle-orm";

export interface UserData {
  id: string;
  username: string;
}

/**
 * Batch fetch multiple users by IDs
 * Used for author data in rationale loading
 */
export async function fetchUsers(userIds: string[]): Promise<UserData[]> {
  if (userIds.length === 0) return [];

  const users = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
    })
    .from(usersTable)
    .where(inArray(usersTable.id, userIds));

  return users;
}