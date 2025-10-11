"use server";

import { db } from "@/services/db";
import { getUserId } from "@/actions/users/getUserId";
import { mpDocsTable } from "@/db/tables/mpDocsTable";
import { mpDocUpdatesTable } from "@/db/tables/mpDocUpdatesTable";
import { mpDocAccessTable } from "@/db/tables/mpDocAccessTable";
import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { generateUniqueSlug } from "@/utils/slugify";
import { resolveSlugToId, isValidSlugOrId } from "@/utils/slugResolver";

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

  await db
    .insert(mpDocsTable)
    .values({ id: canonicalId, ownerId: userId, title: DEFAULT_TITLE })
    .onConflictDoNothing();
  const row = (
    await db
      .select()
      .from(mpDocsTable)
      .where(eq(mpDocsTable.id, canonicalId))
      .limit(1)
  )[0] as any;
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
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");
  const id = params?.id || `m-${nanoid()}`;
  const title = (params?.title || DEFAULT_TITLE).trim() || DEFAULT_TITLE;

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
      const exists = async (slug: string) => {
        const rows = await tx
          .select({ id: mpDocsTable.id })
          .from(mpDocsTable)
          .where(eq(mpDocsTable.slug, slug))
          .limit(1);
        return rows.length > 0;
      };
      const slug = await generateUniqueSlug(title, exists);
      await tx.update(mpDocsTable).set({ slug }).where(eq(mpDocsTable.id, id));
    } catch (err) {
      console.error(
        "[Create Rationale] Failed to generate slug for doc %s:",
        id,
        err
      );
    }
  });

  await new Promise((resolve) => setTimeout(resolve, 100));

  return { id, title };
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
      const exists = async (slug: string) => {
        const rows = await db
          .select({ id: mpDocsTable.id })
          .from(mpDocsTable)
          .where(eq(mpDocsTable.slug, slug))
          .limit(1);
        return rows.length > 0;
      };
      const slug = await generateUniqueSlug(t, exists);
      await db
        .update(mpDocsTable)
        .set({ slug })
        .where(eq(mpDocsTable.id, canonicalId));
      slugUpdated = true;
    } catch (err: any) {
      if (err?.code === "23505" || err?.message?.includes("unique")) {
        attempts++;
        if (attempts >= maxAttempts) {
          console.error(
            `[Rename Rationale] Failed to update slug after ${maxAttempts} attempts for doc ${canonicalId}:`,
            err
          );
        }
      } else {
        console.error(
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
