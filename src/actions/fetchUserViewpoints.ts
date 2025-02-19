"use server";

import { viewpointsTable, usersTable } from "@/db/schema";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { eq, desc } from "drizzle-orm";
import { getUserId } from "@/actions/getUserId";

export const fetchUserViewpoints = async () => {
  const userId = await getUserId();
  if (!userId) return [];

  return db
    .select({
      ...getColumns(viewpointsTable),
      author: usersTable.username,
    })
    .from(viewpointsTable)
    .innerJoin(usersTable, eq(usersTable.id, viewpointsTable.createdBy))
    .where(eq(viewpointsTable.createdBy, userId))
    .orderBy(desc(viewpointsTable.createdAt));
};
