import { db } from "@/services/db";
import { mpDocUpdatesTable } from "@/db/tables/mpDocUpdatesTable";
import { desc, eq, asc, sql, gt } from "drizzle-orm";
import * as Y from "yjs";

/**
 * Compacts Yjs updates for a document by merging all updates into a single state
 * and removing old individual updates. This prevents unbounded data growth.
 */
export async function compactDocUpdates(
  docId: string,
  options: { keepLast?: number } = {}
) {
  const keepLast = Math.max(0, options.keepLast ?? 0);

  // Fetch all updates for the doc in ascending order, including timestamps
  // Use raw SQL to avoid reserved-word quoting issues on column name "update"
  const updates = (await db.execute(
    sql`SELECT "update_bin", "created_at" FROM "mp_doc_updates" WHERE "doc_id" = ${docId} ORDER BY "created_at" ASC`
  )) as unknown as Array<{ update_bin: Buffer; created_at: Date }>;

  if (updates.length <= Math.max(1, keepLast)) {
    return { compacted: false, reason: "Nothing to compact", docId };
  }

  // Build a Y.Doc from all updates except the portion we're keeping at the tail
  const cutoffIndex = Math.max(0, updates.length - keepLast);
  const toCompact = updates.slice(0, cutoffIndex);
  const toKeep = updates.slice(cutoffIndex);

  const tempDoc = new Y.Doc();
  for (const u of toCompact as any[]) {
    try {
      const bytes: Buffer = u.update_bin as any;
      if (bytes && bytes.length) Y.applyUpdate(tempDoc, new Uint8Array(bytes));
    } catch {}
  }
  const compactedUpdate = Y.encodeStateAsUpdate(tempDoc);
  const compactedBuffer = Buffer.from(compactedUpdate);

  // Earliest timestamp among compacted set
  const earliestRaw = (toCompact[0] as any)?.created_at ?? new Date();
  const earliest = earliestRaw instanceof Date ? earliestRaw : new Date(earliestRaw);

  // Transaction: replace old updates with compacted + keep tail
  await db.transaction(async (tx) => {
    await tx.delete(mpDocUpdatesTable).where(eq(mpDocUpdatesTable.docId, docId));
    await tx.insert(mpDocUpdatesTable).values({
      docId,
      updateBin: compactedBuffer,
      userId: null,
      createdAt: earliest,
    });
    if (toKeep.length > 0) {
      await tx.insert(mpDocUpdatesTable).values(
        (toKeep as any[]).map((u) => ({
          docId,
          updateBin: u.update_bin,
          userId: null,
          createdAt: u.created_at instanceof Date ? u.created_at : new Date(u.created_at as any),
        }))
      );
    }
  });

  // Best effort: also cache snapshot and state vector on mp_docs if columns exist
  try {
    const stateVector = Y.encodeStateVector(tempDoc);
    await db.execute(
      sql`UPDATE "mp_docs" SET "snapshot" = ${compactedBuffer}, "state_vector" = ${Buffer.from(
        stateVector
      )}, "snapshot_at" = NOW() WHERE id = ${docId}`
    );
  } catch {}

  tempDoc.destroy();

  return {
    compacted: true,
    docId,
    removedUpdates: toCompact.length - 1, // replaced by 1
    keptUpdates: toKeep.length,
    finalUpdates: 1 + toKeep.length,
    sizeBefore: updates.reduce((sum: number, u: any) => sum + ((u.update_bin?.length as number) || 0), 0),
    sizeAfter: compactedBuffer.length + toKeep.reduce((sum: number, u: any) => sum + ((u.update_bin?.length as number) || 0), 0),
  };
}

/**
 * Runs compaction on all documents that have excessive update counts
 */
export async function compactAllDocs(
  maxUpdatesPerDoc: number = 50,
  options: { keepLast?: number } = {}
) {
  // Find doc IDs exceeding threshold
  const rows = await db
    .select({ docId: mpDocUpdatesTable.docId, count: sql<number>`count(*)` })
    .from(mpDocUpdatesTable)
    .groupBy(mpDocUpdatesTable.docId)
    .having(gt(sql<number>`count(*)`, maxUpdatesPerDoc))
    .orderBy(desc(sql<number>`count(*)`));

  const results: Array<any> = [];
  for (const r of rows) {
    try {
      const res = await compactDocUpdates(r.docId, options);
      results.push(res);
    } catch (error) {
      results.push({
        compacted: false,
        docId: r.docId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
  return results;
}

export async function getDocSnapshotBase64(docId: string) {
  // If exactly one update exists, return it directly to avoid recompute
  const countRes = (await db.execute(
    sql`SELECT COUNT(*)::int AS count FROM "mp_doc_updates" WHERE "doc_id" = ${docId}`
  )) as unknown as Array<{ count: number }>;
  const count = Number(countRes?.[0]?.count || 0);
  if (count === 1) {
    const single = (await db.execute(
      sql`SELECT "update_bin" FROM "mp_doc_updates" WHERE "doc_id" = ${docId} LIMIT 1`
    )) as unknown as Array<{ update_bin: Buffer }>;
    const buf = single[0]?.update_bin;
    return buf ? Buffer.from(buf).toString("base64") : null;
  }

  // Merge all rows deterministically
  const updates = (await db.execute(
    sql`SELECT "update_bin" FROM "mp_doc_updates" WHERE "doc_id" = ${docId} ORDER BY "created_at" ASC`
  )) as unknown as Array<{ update_bin: Buffer }>;

  if (updates.length === 0) return null;

  const doc = new Y.Doc();
  for (const u of updates as any[]) {
    try {
      const bytes: Buffer = u.update_bin as any;
      if (bytes && bytes.length) Y.applyUpdate(doc, new Uint8Array(bytes));
    } catch {}
  }
  const out = Y.encodeStateAsUpdate(doc);
  return Buffer.from(out).toString("base64");
}

export async function getDocSnapshotBuffer(docId: string) {
  const countRes = (await db.execute(
    sql`SELECT COUNT(*)::int AS count FROM "mp_doc_updates" WHERE "doc_id" = ${docId}`
  )) as unknown as Array<{ count: number }>;
  const count = Number(countRes?.[0]?.count || 0);
  if (count === 1) {
    const single = (await db.execute(
      sql`SELECT "update_bin" FROM "mp_doc_updates" WHERE "doc_id" = ${docId} LIMIT 1`
    )) as unknown as Array<{ update_bin: Buffer }>;
    const b = single[0]?.update_bin;
    return b ? Buffer.from(b) : Buffer.from([]);
  }

  const updates = (await db.execute(
    sql`SELECT "update_bin" FROM "mp_doc_updates" WHERE "doc_id" = ${docId} ORDER BY "created_at" ASC`
  )) as unknown as Array<{ update_bin: Buffer }>;
  if (updates.length === 0) return Buffer.from([]);

  const doc = new Y.Doc();
  for (const u of updates as any[]) {
    try {
      const bytes: Buffer = u.update_bin as any;
      if (bytes && bytes.length) Y.applyUpdate(doc, new Uint8Array(bytes));
    } catch {}
  }
  const out = Y.encodeStateAsUpdate(doc);
  return Buffer.from(out);
}
