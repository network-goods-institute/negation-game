"use server";

import { db } from "@/services/db";
import { viewpointsTable, usersTable } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export interface ConsilienceAuthor {
  userId: string;
  username: string;
  rationaleCount: number;
  rationales: Array<{ id: string; title: string }>;
}

/**
 * Returns unique rationale authors for a topic who have meaningful engagement
 * (either endorsed points in rationales OR have general endorsement activity).
 */
export async function fetchConsilienceAuthors(
  topicId: number
): Promise<ConsilienceAuthor[]> {
  const rows = await db
    .select({
      id: viewpointsTable.id,
      createdBy: viewpointsTable.createdBy,
      title: viewpointsTable.title,
      graph: viewpointsTable.graph,
      username: usersTable.username,
    })
    .from(viewpointsTable)
    .innerJoin(usersTable, eq(usersTable.id, viewpointsTable.createdBy))
    .where(
      and(
        eq(viewpointsTable.topicId, topicId),
        eq(viewpointsTable.isActive, true)
      )
    );

  const authorToRationales = new Map<
    string,
    { username: string; items: typeof rows }
  >();
  for (const r of rows) {
    const current = authorToRationales.get(r.createdBy) || {
      username: r.username,
      items: [] as typeof rows,
    };
    current.items.push(r);
    authorToRationales.set(r.createdBy, current);
  }

  const results: ConsilienceAuthor[] = [];

  for (const [userId, { username, items }] of authorToRationales.entries()) {
    results.push({
      userId,
      username,
      rationaleCount: items.length,
      rationales: items.map((it) => ({ id: it.id, title: it.title })),
    });
  }

  results.sort((a, b) => a.username.localeCompare(b.username));
  return results;
}
