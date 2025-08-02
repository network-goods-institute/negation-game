"use server";

import { db } from "@/services/db";
import { topicsTable } from "@/db/tables/topicsTable";
import { eq } from "drizzle-orm";

export async function fetchTopicById(topicId: number) {
  const rows = await db
    .select({
      id: topicsTable.id,
      name: topicsTable.name,
      space: topicsTable.space,
      discourseUrl: topicsTable.discourseUrl,
    })
    .from(topicsTable)
    .where(eq(topicsTable.id, topicId));

  return rows[0] ?? null;
}
