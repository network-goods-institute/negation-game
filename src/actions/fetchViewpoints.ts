"use server";

import { viewpointsTable, usersTable } from "@/db/schema";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { eq, desc } from "drizzle-orm";

export const fetchViewpoints = async (space: string) => {
  const viewpoints = await db
    .select({
      ...getColumns(viewpointsTable),
      author: usersTable.username,
    })
    .from(viewpointsTable)
    .innerJoin(usersTable, eq(usersTable.id, viewpointsTable.createdBy))
    .where(eq(viewpointsTable.space, space))
    .orderBy(desc(viewpointsTable.createdAt));
  return viewpoints;
};
