"use server";

import { db } from "@/services/db";
import { getUserId } from "@/actions/users/getUserId";
import { getUserIdOrAnonymous } from "@/actions/users/getUserIdOrAnonymous";
import { mpDocsTable } from "@/db/tables/mpDocsTable";
import { mpDocUpdatesTable } from "@/db/tables/mpDocUpdatesTable";
import { mpDocAccessTable } from "@/db/tables/mpDocAccessTable";
import { and, asc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { slugify } from "@/utils/slugify";
import { resolveSlugToId, isValidSlugOrId } from "@/utils/slugResolver";
import { logger } from "@/lib/logger";
import { getDocSnapshotBuffer } from "@/services/yjsCompaction";
import * as Y from "yjs";

const DEFAULT_OWNER = "connormcmk";
const DEFAULT_TITLE = "Untitled";

export async function listMyRationales() {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");
  const rows = (await db.execute(sql`
    SELECT d.id,
           d.title,
           d.slug as "slug",
           COALESCE(d.owner_id, ${DEFAULT_OWNER}) AS "ownerId",
           u.username AS "ownerUsername",
           d.created_at AS "createdAt",
           d.updated_at AS "updatedAt",
           a.last_open_at AS "lastOpenAt"
    FROM mp_docs d
    LEFT JOIN users u ON u.id = d.owner_id
    LEFT JOIN LATERAL (
      SELECT last_open_at FROM mp_doc_access a
      WHERE a.doc_id = d.id AND a.user_id = ${userId}
      ORDER BY last_open_at DESC
      LIMIT 1
    ) a ON TRUE
    WHERE COALESCE(d.owner_id, ${DEFAULT_OWNER}) = ${userId}
       OR EXISTS (
         SELECT 1 FROM mp_doc_access x WHERE x.doc_id = d.id AND x.user_id = ${userId}
       )
    ORDER BY a.last_open_at DESC NULLS LAST, d.updated_at DESC
    LIMIT 200
  `)) as unknown as Array<{
    id: string;
    title: string | null;
    slug: string | null;
    ownerId: string;
    ownerUsername: string | null;
    createdAt: Date;
    updatedAt: Date;
    lastOpenAt: Date | null;
  }>;
  return rows;
}

export async function listOwnedRationales() {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");
  const rows = (await db.execute(sql`
    SELECT d.id,
           d.title,
           d.slug as "slug",
           COALESCE(d.owner_id, ${userId}) AS "ownerId",
           u.username AS "ownerUsername",
           d.created_at AS "createdAt",
           d.updated_at AS "updatedAt",
           a.last_open_at AS "lastOpenAt"
    FROM mp_docs d
    LEFT JOIN users u ON u.id = d.owner_id
    LEFT JOIN LATERAL (
      SELECT last_open_at FROM mp_doc_access a
      WHERE a.doc_id = d.id AND a.user_id = ${userId}
      ORDER BY last_open_at DESC
      LIMIT 1
    ) a ON TRUE
    WHERE d.owner_id = ${userId} OR (d.owner_id IS NULL AND EXISTS (
      SELECT 1 FROM mp_doc_access acc WHERE acc.doc_id = d.id AND acc.user_id = ${userId}
    ))
    ORDER BY a.last_open_at DESC NULLS LAST, d.updated_at DESC
    LIMIT 200
  `)) as unknown as Array<{
    id: string;
    title: string | null;
    slug: string | null;
    ownerId: string;
    ownerUsername: string | null;
    createdAt: Date;
    updatedAt: Date;
    lastOpenAt: Date | null;
  }>;
  return rows;
}

export async function listVisitedRationales() {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");
  const rows = (await db.execute(sql`
    SELECT d.id,
           d.title,
           d.slug as "slug",
           COALESCE(d.owner_id, ${DEFAULT_OWNER}) AS "ownerId",
           u.username AS "ownerUsername",
           d.created_at AS "createdAt",
           d.updated_at AS "updatedAt",
           a.last_open_at AS "lastOpenAt"
    FROM mp_docs d
    JOIN mp_doc_access a ON a.doc_id = d.id AND a.user_id = ${userId}
    LEFT JOIN users u ON u.id = d.owner_id
    WHERE d.owner_id IS NOT NULL AND d.owner_id <> ${userId}
    ORDER BY a.last_open_at DESC NULLS LAST, d.updated_at DESC
    LIMIT 200
  `)) as unknown as Array<{
    id: string;
    title: string | null;
    slug: string | null;
    ownerId: string;
    ownerUsername: string | null;
    createdAt: Date;
    updatedAt: Date;
    lastOpenAt: Date | null;
  }>;
  return rows;
}

export async function recordOpen(docId: string) {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");
  if (!isValidSlugOrId(docId)) throw new Error("Invalid doc id or slug");

  // Resolve slug to canonical id if needed
  const canonicalId = await resolveSlugToId(docId);

  const row = (
    await db
      .select()
      .from(mpDocsTable)
      .where(eq(mpDocsTable.id, canonicalId))
      .limit(1)
  )[0] as any;
  if (!row) {
    throw new Error("Document not found");
  }
  if (row && !row.ownerId) {
    await db
      .update(mpDocsTable)
      .set({ ownerId: userId })
      .where(eq(mpDocsTable.id, canonicalId));
  }
  const existing = await db
    .select({ id: mpDocAccessTable.id })
    .from(mpDocAccessTable)
    .where(
      and(
        eq(mpDocAccessTable.docId, canonicalId),
        eq(mpDocAccessTable.userId, userId)
      )
    )
    .limit(1);
  if (existing.length === 0) {
    await db.insert(mpDocAccessTable).values({ docId: canonicalId, userId });
  } else {
    await db
      .update(mpDocAccessTable)
      .set({ lastOpenAt: new Date() })
      .where(
        and(
          eq(mpDocAccessTable.docId, canonicalId),
          eq(mpDocAccessTable.userId, userId)
        )
      );
  }
  const out = (
    await db
      .select()
      .from(mpDocsTable)
      .where(eq(mpDocsTable.id, canonicalId))
      .limit(1)
  )[0] as any;
  return {
    id: out?.id as string,
    title: (out?.title as string) || DEFAULT_TITLE,
    ownerId: (out?.ownerId as string) || DEFAULT_OWNER,
  };
}

export async function createRationale(params?: {
  id?: string;
  title?: string;
}) {
  const userId = await getUserIdOrAnonymous();
  const id = params?.id || `m-${nanoid()}`;
  const title = (params?.title || DEFAULT_TITLE).trim() || DEFAULT_TITLE;

  let createdSlug: string | null = null;
  await db.transaction(async (tx) => {
    await tx
      .insert(mpDocsTable)
      .values({ id, ownerId: userId, title })
      .onConflictDoNothing();
    await tx
      .insert(mpDocAccessTable)
      .values({ docId: id, userId })
      .onConflictDoNothing();
    try {
      const slug = slugify(title);
      await tx.update(mpDocsTable).set({ slug }).where(eq(mpDocsTable.id, id));
      createdSlug = slug;
    } catch (err) {
      logger.error(
        "[Create Rationale] Failed to generate slug for doc %s:",
        id,
        err
      );
    }
  });

  await new Promise((resolve) => setTimeout(resolve, 100));

  return { id, title, slug: createdSlug };
}

export async function renameRationale(id: string, title: string) {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");
  if (!isValidSlugOrId(id)) throw new Error("Invalid doc id or slug");
  const t = (title || "").trim();
  if (!t) throw new Error("Empty title");

  // Resolve slug to canonical id if needed
  const canonicalId = await resolveSlugToId(id);

  const row = await db
    .select({ ownerId: mpDocsTable.ownerId })
    .from(mpDocsTable)
    .where(eq(mpDocsTable.id, canonicalId))
    .limit(1);

  if (row.length === 0) throw new Error("Document not found");
  const ownerId = row[0].ownerId;

  if (ownerId && ownerId !== userId) throw new Error("Forbidden");
  if (!ownerId) {
    await db
      .update(mpDocsTable)
      .set({ ownerId: userId })
      .where(eq(mpDocsTable.id, canonicalId));
  }

  await db
    .update(mpDocsTable)
    .set({ title: t, updatedAt: new Date() })
    .where(eq(mpDocsTable.id, canonicalId));

  let attempts = 0;
  const maxAttempts = 3;
  let slugUpdated = false;

  while (attempts < maxAttempts && !slugUpdated) {
    try {
      const slug = slugify(t);
      await db
        .update(mpDocsTable)
        .set({ slug })
        .where(eq(mpDocsTable.id, canonicalId));
      slugUpdated = true;
    } catch (err: any) {
      if (false) {
        attempts++;
        if (attempts >= maxAttempts) {
          logger.error(
            `[Rename Rationale] Failed to update slug after ${maxAttempts} attempts for doc ${canonicalId}:`,
            err
          );
        }
      } else {
        logger.error(
          `[Rename Rationale] Failed to generate slug for doc ${canonicalId}:`,
          err
        );
        break;
      }
    }
  }

  return { ok: true } as const;
}

export async function updateNodeTitle(id: string, nodeTitle: string) {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");
  if (!isValidSlugOrId(id)) throw new Error("Invalid doc id or slug");

  // Resolve slug to canonical id if needed
  const canonicalId = await resolveSlugToId(id);

  const can = await db.execute(sql`
    SELECT 1
    FROM mp_docs d
    LEFT JOIN mp_doc_access a ON a.doc_id = d.id AND a.user_id = ${userId}
    WHERE d.id = ${canonicalId} AND (d.owner_id = ${userId} OR a.user_id = ${userId})
    LIMIT 1
  `);
  if ((can as any[]).length === 0) throw new Error("Forbidden");

  // Get current board title to check if we should sync
  const current = await db.execute(sql`
    SELECT title FROM mp_docs WHERE id = ${canonicalId} LIMIT 1
  `);
  const currentBoardTitle = (current as any[])?.[0]?.title;

  // Sync board title to node title if board title is still "Untitled" and node title is different
  const shouldSyncBoardTitle =
    (!currentBoardTitle || currentBoardTitle === DEFAULT_TITLE) &&
    nodeTitle &&
    nodeTitle.trim() &&
    nodeTitle !== DEFAULT_TITLE;

  await db
    .update(mpDocsTable)
    .set({
      nodeTitle,
      ...(shouldSyncBoardTitle && { title: nodeTitle.trim() }),
      updatedAt: new Date(),
    })
    .where(eq(mpDocsTable.id, canonicalId));

  return { ok: true } as const;
}

export async function getDocumentTitles(id: string) {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");

  const result = await db
    .select({ title: mpDocsTable.title, nodeTitle: mpDocsTable.nodeTitle })
    .from(mpDocsTable)
    .where(eq(mpDocsTable.id, id))
    .limit(1);

  if (result.length === 0) throw new Error("Document not found");

  return {
    boardTitle: result[0].title || DEFAULT_TITLE,
    nodeTitle: result[0].nodeTitle || result[0].title || DEFAULT_TITLE,
  };
}

export async function deleteRationale(id: string) {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");
  if (!isValidSlugOrId(id)) throw new Error("Invalid doc id or slug");

  // Resolve slug to canonical id if needed
  const canonicalId = await resolveSlugToId(id);

  const row = await db
    .select({ ownerId: mpDocsTable.ownerId })
    .from(mpDocsTable)
    .where(eq(mpDocsTable.id, canonicalId))
    .limit(1);
  if (row.length === 0) throw new Error("Document not found");

  const currentOwner = row[0].ownerId;
  if (!currentOwner) {
    await db
      .update(mpDocsTable)
      .set({ ownerId: userId })
      .where(eq(mpDocsTable.id, canonicalId));
  } else if (currentOwner !== userId) {
    throw new Error("Forbidden");
  }

  await db
    .delete(mpDocUpdatesTable)
    .where(eq(mpDocUpdatesTable.docId, canonicalId));
  await db.delete(mpDocsTable).where(eq(mpDocsTable.id, canonicalId));
  return { ok: true } as const;
}

export async function duplicateRationale(
  sourceId: string,
  params?: { title?: string; snapshotBase64?: string }
) {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");
  if (!isValidSlugOrId(sourceId)) throw new Error("Invalid doc id or slug");

  try {
    logger.log(
      JSON.stringify({
        event: "duplicate_rationale",
        stage: "start",
        sourceId,
        hasSnapshotParam: Boolean(params?.snapshotBase64),
        userId,
      })
    );
  } catch {}

  const canonicalSourceId = await resolveSlugToId(sourceId);

  const canRead = await db.execute(sql`
    SELECT 1
    FROM mp_docs d
    LEFT JOIN mp_doc_access a ON a.doc_id = d.id AND a.user_id = ${userId}
    WHERE d.id = ${canonicalSourceId}
      AND (d.owner_id = ${userId} OR a.user_id = ${userId})
    LIMIT 1
  `);
  if ((canRead as any[]).length === 0) throw new Error("Forbidden");

  try {
    logger.log(
      JSON.stringify({
        event: "duplicate_rationale",
        stage: "access_ok",
        sourceId: canonicalSourceId,
      })
    );
  } catch {}

  const metaRows = await db
    .select({ title: mpDocsTable.title, nodeTitle: mpDocsTable.nodeTitle })
    .from(mpDocsTable)
    .where(eq(mpDocsTable.id, canonicalSourceId))
    .limit(1);
  if (metaRows.length === 0) throw new Error("Document not found");
  const originalTitle = metaRows[0].title || DEFAULT_TITLE;
  const nodeTitle = metaRows[0].nodeTitle || null;

  const updates = await db
    .select({
      updateBin: mpDocUpdatesTable.updateBin,
      userId: mpDocUpdatesTable.userId,
      createdAt: mpDocUpdatesTable.createdAt,
    })
    .from(mpDocUpdatesTable)
    .where(eq(mpDocUpdatesTable.docId, canonicalSourceId))
    .orderBy(asc(mpDocUpdatesTable.createdAt));

  try {
    const firstAt = (updates as any[])?.[0]?.createdAt || null;
    const lastAt =
      (updates as any[])?.[(updates as any[]).length - 1]?.createdAt || null;
    logger.log(
      JSON.stringify({
        event: "duplicate_rationale",
        stage: "updates_fetched",
        sourceId: canonicalSourceId,
        updateCount: updates.length,
        firstAt,
        lastAt,
      })
    );
  } catch {}

  const newId = `m-${nanoid()}`;
  const newTitleBase =
    (params?.title || `${originalTitle} (Copy)`).trim() ||
    `${DEFAULT_TITLE} (Copy)`;
  let createdSlug: string | null = null;

  // Build a single merged update of the source document to guarantee complete state transfer.
  // Prefer mp_docs.snapshot + tail updates when available; otherwise merge all updates.
  let mergedUpdate: Buffer | null = null;

  // If client provided a fresh snapshot (e.g., fetched directly from the y-websocket),
  // prefer that as the authoritative latest state.
  if (params?.snapshotBase64) {
    try {
      mergedUpdate = Buffer.from(params.snapshotBase64, "base64");
      logger.log(
        JSON.stringify({
          event: "duplicate_rationale",
          stage: "client_snapshot_used",
          sourceId: canonicalSourceId,
          snapshotBytes: mergedUpdate.length,
        })
      );
    } catch {}
  }

  // If we don't have a client-provided snapshot, build from DB snapshot + tail (or merged updates).
  if (!mergedUpdate || mergedUpdate.length === 0) {
    try {
      // Try to use cached snapshot as base and then apply tail updates newer than snapshot_at.
      const snapRows = (await db.execute(sql`
      SELECT "snapshot", "snapshot_at" 
      FROM "mp_docs" 
      WHERE id = ${canonicalSourceId}
      LIMIT 1
    `)) as unknown as Array<{
        snapshot: Buffer | null;
        snapshot_at: Date | null;
      }>;
      const snapshotBuf = snapRows?.[0]?.snapshot
        ? Buffer.from(snapRows[0].snapshot as any)
        : null;
      const snapshotAt: Date | null = snapRows?.[0]?.snapshot_at
        ? snapRows[0].snapshot_at instanceof Date
          ? snapRows[0].snapshot_at
          : new Date(snapRows[0].snapshot_at as any)
        : null;

      try {
        logger.log(
          JSON.stringify({
            event: "duplicate_rationale",
            stage: "snapshot_meta",
            sourceId: canonicalSourceId,
            hasSnapshot: Boolean(snapshotBuf && snapshotBuf.length),
            snapshotAt,
          })
        );
      } catch {}

      if (snapshotBuf && snapshotBuf.length > 0) {
        const ydoc = new Y.Doc();
        try {
          Y.applyUpdate(ydoc, new Uint8Array(snapshotBuf));
        } catch {}
        // Append tail updates strictly newer than snapshot_at (if present)
        let tail: Array<{ update_bin: Buffer }> = [];
        try {
          if (snapshotAt) {
            tail = (await db.execute(sql`
            SELECT "update_bin"
            FROM "mp_doc_updates"
            WHERE "doc_id" = ${canonicalSourceId}
              AND "created_at" > ${snapshotAt}
            ORDER BY "created_at" ASC
          `)) as unknown as Array<{ update_bin: Buffer }>;
          } else {
            tail = (await db.execute(sql`
            SELECT "update_bin"
            FROM "mp_doc_updates"
            WHERE "doc_id" = ${canonicalSourceId}
            ORDER BY "created_at" ASC
          `)) as unknown as Array<{ update_bin: Buffer }>;
          }
        } catch {}
        for (const r of tail as any[]) {
          const b = r.update_bin as Buffer;
          if (b && b.length) {
            try {
              Y.applyUpdate(ydoc, new Uint8Array(b));
            } catch {}
          }
        }
        const out = Y.encodeStateAsUpdate(ydoc);
        if (out && out.byteLength > 0) {
          mergedUpdate = Buffer.from(out);
          try {
            const yNodes = ydoc.getMap<any>("nodes");
            const yEdges = ydoc.getMap<any>("edges");
            const yText = ydoc.getMap<any>("node_text");
            const yMeta = ydoc.getMap<any>("meta");
            logger.log(
              JSON.stringify({
                event: "duplicate_rationale",
                stage: "snapshot_built",
                sourceId: canonicalSourceId,
                bytes: mergedUpdate.length,
                nodes: yNodes?.size || 0,
                edges: yEdges?.size || 0,
                texts: yText?.size || 0,
                meta: yMeta?.size || 0,
              })
            );
          } catch {}
        }
      }

      // Fallback to merging all updates if no snapshot or failed to build
      if (!mergedUpdate || mergedUpdate.length === 0) {
        const buf = await getDocSnapshotBuffer(canonicalSourceId);
        if (buf && (buf as any).length > 0) {
          mergedUpdate = Buffer.from(buf);
          try {
            logger.log(
              JSON.stringify({
                event: "duplicate_rationale",
                stage: "fallback_merged_updates",
                sourceId: canonicalSourceId,
                bytes: mergedUpdate.length,
              })
            );
          } catch {}
        }
      }
    } catch (err) {
      logger.error(
        "[Duplicate Rationale] Failed to build merged snapshot for source %s:",
        canonicalSourceId,
        err
      );
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(mpDocsTable)
      .values({
        id: newId,
        ownerId: userId,
        title: newTitleBase,
        nodeTitle: nodeTitle || undefined,
      })
      .onConflictDoNothing();

    await tx
      .insert(mpDocAccessTable)
      .values({ docId: newId, userId })
      .onConflictDoNothing();

    try {
      const slug = slugify(newTitleBase);
      await tx
        .update(mpDocsTable)
        .set({ slug })
        .where(eq(mpDocsTable.id, newId));
      createdSlug = slug;
    } catch (err) {
      logger.error(
        "[Duplicate Rationale] Failed to generate slug for doc %s:",
        newId,
        err
      );
    }

    if (mergedUpdate && mergedUpdate.length > 0) {
      // Manual full copy: decode merged source, reconstruct new doc maps/text/meta, then save a single update
      try {
        logger.log(
          JSON.stringify({
            event: "duplicate_rationale",
            stage: "manual_copy_begin",
            sourceId: canonicalSourceId,
            newId,
            bytes: mergedUpdate.length,
          })
        );
        const sourceDoc = new Y.Doc();
        Y.applyUpdate(sourceDoc, new Uint8Array(mergedUpdate));

        const destDoc = new Y.Doc();
        (destDoc as any).transact(() => {
          const srcNodes = sourceDoc.getMap<any>("nodes");
          const srcEdges = sourceDoc.getMap<any>("edges");
          const srcText = sourceDoc.getMap<any>("node_text");
          const srcMeta = sourceDoc.getMap<any>("meta");

          const dstNodes = destDoc.getMap<any>("nodes");
          const dstEdges = destDoc.getMap<any>("edges");
          const dstText = destDoc.getMap<any>("node_text");
          const dstMeta = destDoc.getMap<any>("meta");

          // Copy nodes
          srcNodes.forEach((value: any, key: string) => {
            try {
              const cloned = JSON.parse(JSON.stringify(value));
              dstNodes.set(key, cloned);
            } catch {
              // best-effort: if value cannot be stringified, skip
            }
          });

          // Copy edges
          srcEdges.forEach((value: any, key: string) => {
            try {
              const cloned = JSON.parse(JSON.stringify(value));
              dstEdges.set(key, cloned);
            } catch {
              // skip non-serializable
            }
          });

          // Copy node texts
          srcText.forEach((t: any, key: string) => {
            try {
              const srcT = t as Y.Text;
              const content =
                typeof (srcT as any)?.toString === "function"
                  ? srcT.toString()
                  : "";
              const newT = new (Y as any).Text();
              if (content && typeof newT.insert === "function") {
                newT.insert(0, content);
              }
              dstText.set(key, newT);
            } catch {
              // skip problematic text
            }
          });

          // Copy meta (exclude volatile keys if needed)
          srcMeta.forEach((val: any, key: string) => {
            try {
              // Skip slug in meta; slug is managed at mp_docs
              if (key === "slug") return;
              // Only copy JSON-serializable metadata
              const cloned = JSON.parse(JSON.stringify(val));
              dstMeta.set(key, cloned);
            } catch {
              // skip non-serializable meta entries
            }
          });
        });

        const out = Y.encodeStateAsUpdate(destDoc);
        try {
          const n = destDoc.getMap<any>("nodes")?.size || 0;
          const e = destDoc.getMap<any>("edges")?.size || 0;
          const t = destDoc.getMap<any>("node_text")?.size || 0;
          const m = destDoc.getMap<any>("meta")?.size || 0;
          logger.log(
            JSON.stringify({
              event: "duplicate_rationale",
              stage: "manual_copy_done",
              sourceId: canonicalSourceId,
              newId,
              nodes: n,
              edges: e,
              texts: t,
              meta: m,
              bytes: (out as Uint8Array)?.byteLength || 0,
            })
          );
        } catch {}
        await tx.insert(mpDocUpdatesTable).values({
          docId: newId,
          updateBin: Buffer.from(out),
          userId,
        });
      } catch (copyErr) {
        logger.error(
          "[Duplicate Rationale] Manual copy failed for doc %s, falling back to raw updates:",
          newId,
          copyErr
        );
        // Fallback to inserting the merged binary directly
        await tx.insert(mpDocUpdatesTable).values({
          docId: newId,
          updateBin: mergedUpdate,
          userId,
        });
      }
    } else if (updates.length > 0) {
      try {
        logger.log(
          JSON.stringify({
            event: "duplicate_rationale",
            stage: "fallback_row_by_row",
            sourceId: canonicalSourceId,
            newId,
            count: updates.length,
          })
        );
      } catch {}
      for (const u of updates) {
        await tx.insert(mpDocUpdatesTable).values({
          docId: newId,
          updateBin: u.updateBin as any,
          userId,
        });
      }
    }
  });

  try {
    logger.log(
      JSON.stringify({
        event: "duplicate_rationale",
        stage: "done",
        sourceId: canonicalSourceId,
        newId,
        title: newTitleBase,
        slug: createdSlug,
      })
    );
  } catch {}

  return { id: newId, title: newTitleBase, slug: createdSlug } as const;
}
