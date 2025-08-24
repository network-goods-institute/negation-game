import "server-only";
import { db } from "@/services/db";
import { mpDocsTable } from "@/db/tables/mpDocsTable";
import { desc } from "drizzle-orm";

export async function fetchMpDocs(limit = 50) {
  const rows = await db
    .select({
      id: mpDocsTable.id,
      updatedAt: mpDocsTable.updatedAt,
      createdAt: mpDocsTable.createdAt,
    })
    .from(mpDocsTable)
    .orderBy(desc(mpDocsTable.updatedAt))
    .limit(limit);
  return rows;
}
