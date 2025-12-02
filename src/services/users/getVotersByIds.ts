import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/services/db";
import { usersTable } from "@/db/tables/usersTable";
import type { VoterData } from "@/types/voters";

export async function getVotersByIds(userIds: string[]): Promise<VoterData[]> {
  if (userIds.length === 0) return [];

  const sanitizedIds = userIds
    .filter((id): id is string => typeof id === "string")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  const uniqueIds = Array.from(new Set(sanitizedIds));

  if (uniqueIds.length === 0) return [];

  const users = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      avatarUrl: usersTable.avatarUrl,
      avatarUpdatedAt: usersTable.avatarUpdatedAt,
    })
    .from(usersTable)
    .where(and(inArray(usersTable.id, uniqueIds), eq(usersTable.isActive, true)));

  return users.map((user) => ({
    ...user,
    avatarUpdatedAt: user.avatarUpdatedAt
      ? user.avatarUpdatedAt.toISOString()
      : null,
  }));
}
