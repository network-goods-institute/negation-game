"use server";

import { viewpointsTable, usersTable } from "@/db/schema";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { eq, desc } from "drizzle-orm";
import { getUserId } from "@/actions/getUserId";

export const fetchUserViewpoints = async (username?: string) => {
  const userId = await getUserId();
  if (!userId) return [];

  // If no username provided, use the current user's ID
  let targetUserId = userId;

  // If username provided, look up the user
  if (username) {
    const user = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);

    if (user.length === 0) return null;
    targetUserId = user[0].id;
  }

  return db
    .select({
      ...getColumns(viewpointsTable),
      author: usersTable.username,
    })
    .from(viewpointsTable)
    .innerJoin(usersTable, eq(usersTable.id, viewpointsTable.createdBy))
    .where(eq(viewpointsTable.createdBy, targetUserId))
    .orderBy(desc(viewpointsTable.createdAt));
};
