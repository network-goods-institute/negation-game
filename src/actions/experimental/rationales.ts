"use server";

import { db } from "@/services/db";
import { getUserId } from "@/actions/users/getUserId";
import { mpDocsTable } from "@/db/tables/mpDocsTable";
import { mpDocUpdatesTable } from "@/db/tables/mpDocUpdatesTable";
import { mpDocAccessTable } from "@/db/tables/mpDocAccessTable";
import { and, eq, sql } from "drizzle-orm";

const DEFAULT_OWNER = "connormcmk";
const DEFAULT_TITLE = "New Rationale";

export async function listMyRationales() {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");
  const rows = (await db.execute(sql`
    SELECT d.id,
           d.title,
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
  if (!/^[a-zA-Z0-9:_-]{1,128}$/.test(docId)) throw new Error("Invalid doc id");
  await db
    .insert(mpDocsTable)
    .values({ id: docId, ownerId: userId, title: DEFAULT_TITLE })
    .onConflictDoNothing();
  const row = (
    await db
      .select()
      .from(mpDocsTable)
      .where(eq(mpDocsTable.id, docId))
      .limit(1)
  )[0] as any;
  if (row && !row.ownerId) {
    await db
      .update(mpDocsTable)
      .set({ ownerId: userId })
      .where(eq(mpDocsTable.id, docId));
  }
  const existing = await db
    .select({ id: mpDocAccessTable.id })
    .from(mpDocAccessTable)
    .where(
      and(
        eq(mpDocAccessTable.docId, docId),
        eq(mpDocAccessTable.userId, userId)
      )
    )
    .limit(1);
  if (existing.length === 0) {
    await db.insert(mpDocAccessTable).values({ docId, userId });
  } else {
    await db
      .update(mpDocAccessTable)
      .set({ lastOpenAt: new Date() })
      .where(
        and(
          eq(mpDocAccessTable.docId, docId),
          eq(mpDocAccessTable.userId, userId)
        )
      );
  }
  const out = (
    await db
      .select()
      .from(mpDocsTable)
      .where(eq(mpDocsTable.id, docId))
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
  const id =
    params?.id && /^[a-zA-Z0-9:_-]{1,128}$/.test(params.id)
      ? params.id
      : `m-${Date.now()}`;
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
  });

  await new Promise((resolve) => setTimeout(resolve, 100));

  return { id, title };
}

export async function renameRationale(id: string, title: string) {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");
  if (!/^[a-zA-Z0-9:_-]{1,128}$/.test(id)) throw new Error("Invalid doc id");
  const t = (title || "").trim();
  if (!t) throw new Error("Empty title");
  const ownerRow = await db
    .select({ ownerId: mpDocsTable.ownerId })
    .from(mpDocsTable)
    .where(eq(mpDocsTable.id, id))
    .limit(1);
  if (ownerRow.length === 0) throw new Error("Document not found");
  const ownerId = ownerRow[0].ownerId || DEFAULT_OWNER;
  if (!ownerRow[0].ownerId) {
    await db
      .update(mpDocsTable)
      .set({ ownerId: userId })
      .where(eq(mpDocsTable.id, id));
  }
  await db
    .update(mpDocsTable)
    .set({ title: t, updatedAt: new Date() })
    .where(eq(mpDocsTable.id, id));
  return { ok: true } as const;
}

export async function deleteRationale(id: string) {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");
  if (!/^[a-zA-Z0-9:_-]{1,128}$/.test(id)) throw new Error("Invalid doc id");
  const ownerRow = await db
    .select({ ownerId: mpDocsTable.ownerId })
    .from(mpDocsTable)
    .where(eq(mpDocsTable.id, id))
    .limit(1);
  if (ownerRow.length === 0) throw new Error("Document not found");
  const ownerId = ownerRow[0].ownerId || DEFAULT_OWNER;
  if (!ownerRow[0].ownerId) {
    await db
      .update(mpDocsTable)
      .set({ ownerId: userId })
      .where(eq(mpDocsTable.id, id));
  }
  if (ownerId !== userId) throw new Error("Forbidden");
  await db.delete(mpDocUpdatesTable).where(eq(mpDocUpdatesTable.docId, id));
  await db.delete(mpDocsTable).where(eq(mpDocsTable.id, id));
  return { ok: true } as const;
}
