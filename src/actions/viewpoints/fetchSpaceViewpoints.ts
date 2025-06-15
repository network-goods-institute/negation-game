"use server";

import { db } from "@/services/db";
import { viewpointsTable } from "@/db/schema";
import { activeViewpointsFilter } from "@/db/tables/viewpointsTable";
import { eq, and } from "drizzle-orm";

export const fetchSpaceViewpoints = async (space: string) => {
  return db
    .select({
      createdBy: viewpointsTable.createdBy,
    })
    .from(viewpointsTable)
    .where(and(eq(viewpointsTable.space, space), activeViewpointsFilter));
};
