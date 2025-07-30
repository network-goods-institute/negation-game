"use server";

import { db } from "@/services/db";
import { topicsTable } from "@/db/tables/topicsTable";
import { eq, and } from "drizzle-orm";

export async function fetchTopicSuggestions(space: string) {
  return db
    .select({
      id: topicsTable.id,
      name: topicsTable.name,
    })
    .from(topicsTable)
    .where(and(
      eq(topicsTable.space, space),
      eq(topicsTable.closed, false)
    ))
    .orderBy(topicsTable.name);
}