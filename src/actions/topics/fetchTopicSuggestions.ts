"use server";

import { db } from "@/services/db";
import { topicsTable } from "@/db/tables/topicsTable";
import { viewpointsTable } from "@/db/tables/viewpointsTable";
import { eq, and, sql } from "drizzle-orm";

export async function fetchTopicSuggestions(space: string) {
  return db
    .select({
      id: topicsTable.id,
      name: topicsTable.name,
      rationalesCount: sql<number>`COUNT(${viewpointsTable.id})`
        .mapWith(Number)
        .as("rationalesCount"),
    })
    .from(topicsTable)
    .leftJoin(viewpointsTable, eq(viewpointsTable.topicId, topicsTable.id))
    .where(and(eq(topicsTable.space, space), eq(topicsTable.closed, false)))
    .groupBy(topicsTable.id, topicsTable.name)
    .having(sql`COUNT(${viewpointsTable.id}) > 0`)
    .orderBy(topicsTable.name);
}
