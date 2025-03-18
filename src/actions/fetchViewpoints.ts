"use server";

import {
  viewpointsTable,
  usersTable,
  viewpointInteractionsTable,
} from "@/db/schema";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { eq, desc } from "drizzle-orm";

export const fetchViewpoints = async (space: string) => {
  const viewpoints = await db
    .select({
      ...getColumns(viewpointsTable),
      author: usersTable.username,
      views: viewpointInteractionsTable.views,
      copies: viewpointInteractionsTable.copies,
    })
    .from(viewpointsTable)
    .innerJoin(usersTable, eq(usersTable.id, viewpointsTable.createdBy))
    .leftJoin(
      viewpointInteractionsTable,
      eq(viewpointInteractionsTable.viewpointId, viewpointsTable.id)
    )
    .where(eq(viewpointsTable.space, space))
    .orderBy(desc(viewpointsTable.createdAt));

  return viewpoints.map((viewpoint) => ({
    ...viewpoint,
    statistics: {
      views: viewpoint.views || 0,
      copies: viewpoint.copies || 0,
    },
  }));
};
