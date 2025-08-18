"use server";

import { db } from "@/services/db";
import { experimentalGraphDocsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function saveExperimentalDoc(id: string, doc: unknown) {
  await db
    .update(experimentalGraphDocsTable)
    .set({ doc: doc as any, updatedAt: new Date() })
    .where(eq(experimentalGraphDocsTable.id, id));
  return { ok: true } as const;
}