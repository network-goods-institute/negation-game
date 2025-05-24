"use server";

import { db } from "@/services/db";
import { topicsTable } from "@/db/tables/topicsTable";
import { asc, eq } from "drizzle-orm";

export async function fetchTopics(space: string) {
  return db
    .select({
      id: topicsTable.id,
      name: topicsTable.name,
      discourseUrl: topicsTable.discourseUrl,
    })
    .from(topicsTable)
    .where(eq(topicsTable.space, space))
    .orderBy(asc(topicsTable.name));
}
