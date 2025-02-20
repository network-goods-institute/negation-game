"use server";

import { db } from "@/services/db";
import { viewpointsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export const fetchSpaceViewpoints = async (space: string) => {
  return db
    .select()
    .from(viewpointsTable)
    .where(eq(viewpointsTable.space, space));
};
