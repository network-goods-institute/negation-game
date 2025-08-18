"use server";

import { db } from "@/services/db";
import { experimentalGraphDocsTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function fetchExperimentalDoc(id: string) {
  const row = await db
    .select({
      id: experimentalGraphDocsTable.id,
      space: experimentalGraphDocsTable.space,
      title: experimentalGraphDocsTable.title,
      doc: experimentalGraphDocsTable.doc,
      isActive: experimentalGraphDocsTable.isActive,
      updatedAt: experimentalGraphDocsTable.updatedAt,
    })
    .from(experimentalGraphDocsTable)
    .where(
      and(
        eq(experimentalGraphDocsTable.id, id),
        eq(experimentalGraphDocsTable.isActive, true)
      )
    )
    .limit(1)
    .then((r) => r[0] || null);

  return row;
}