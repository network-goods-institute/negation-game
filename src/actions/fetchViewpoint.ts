"use server";

import { usersTable, viewpointsTable } from "@/db/schema";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { eq } from "drizzle-orm";

export const fetchViewpoint = async (id: string) => {
  const viewpoint = await db
    .select({
      ...getColumns(viewpointsTable),
      author: usersTable.username,
    })
    .from(viewpointsTable)
    .innerJoin(usersTable, eq(usersTable.id, viewpointsTable.createdBy))
    .where(eq(viewpointsTable.id, id))
    .limit(1)
    .then(([viewpoint]) => viewpoint);

  return {
    ...viewpoint,
    description: viewpoint.description,
  };
};
