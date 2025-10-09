"use server";

import { db } from "@/services/db";
import { topicsTable } from "@/db/tables/topicsTable";
import { eq } from "drizzle-orm";
import { withRetry, isStatementTimeoutError } from "@/lib/db/withRetry";

export async function fetchTopicById(topicId: number) {
  const rows = await withRetry(
    async () =>
      db
        .select({
          id: topicsTable.id,
          name: topicsTable.name,
          space: topicsTable.space,
          discourseUrl: topicsTable.discourseUrl,
        })
        .from(topicsTable)
        .where(eq(topicsTable.id, topicId)),
    { retries: 2, baseDelayMs: 300, shouldRetry: isStatementTimeoutError }
  );
  return rows[0] ?? null;
}
