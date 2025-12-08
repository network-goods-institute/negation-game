import { NextResponse } from "next/server";
import { db } from "@/services/db";
import { mpDocsTable } from "@/db/tables/mpDocsTable";
import { mpDocUpdatesTable } from "@/db/tables/mpDocUpdatesTable";
import { eq, sql } from "drizzle-orm";
import { getUserIdOrAnonymous } from "@/actions/users/getUserIdOrAnonymous";
import { getUserId } from "@/actions/users/getUserId";
import { isProductionRequest } from "@/utils/hosts";
import { compactDocUpdates } from "@/services/yjsCompaction";
import { resolveSlugToId, isValidSlugOrId } from "@/utils/slugResolver";
import { logger } from "@/lib/logger";
import { resolveDocAccess, canWriteRole } from "@/services/mpAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: any) {
  if (process.env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const url = new URL(req.url);
  const shareToken = url.searchParams.get("share") || null;
  const nonProd = !isProductionRequest(url.hostname);
  const userId = nonProd || shareToken ? await getUserIdOrAnonymous() : await getUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const raw = ctx?.params;
  const { id } =
    raw && typeof raw.then === "function" ? await raw : (raw as { id: string });

  if (!isValidSlugOrId(id)) {
    return NextResponse.json(
      { error: "Invalid doc id or slug" },
      { status: 400 }
    );
  }

  const canonicalId = await resolveSlugToId(id);

  let access = await resolveDocAccess(canonicalId, { userId, shareToken });

  if (access.status === "not_found") {
    if (shareToken) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    try {
      await db
        .insert(mpDocsTable)
        .values({ id: canonicalId, ownerId: userId || null })
        .onConflictDoNothing();
      access = await resolveDocAccess(canonicalId, { userId, shareToken });
    } catch (error) {
      logger.error("[YJS Updates] failed to seed doc row", error);
      return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
    }
  }

  if (access.status !== "ok") {
    const status =
      access.status === "not_found" ? 404 : access.requiresAuth ? 401 : 403;
    return NextResponse.json({ error: "Forbidden" }, { status });
  }

  if (!canWriteRole(access.role)) {
    return NextResponse.json(
      { error: "Write permission required" },
      { status: 403 }
    );
  }

  const body = await req.arrayBuffer();
  const updateBuf = Buffer.from(body);

  // basic size cap ~ 1MB
  if (updateBuf.byteLength > 1_000_000) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  await db
    .insert(mpDocsTable)
    .values({ id: canonicalId })
    .onConflictDoNothing();

  await db
    .insert(mpDocUpdatesTable)
    .values({ docId: canonicalId, updateBin: updateBuf, userId });
  await db
    .update(mpDocsTable)
    .set({ updatedAt: new Date() })
    .where(eq(mpDocsTable.id, canonicalId));

  // Inline fast compaction when threshold exceeded
  try {
    const countRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(mpDocUpdatesTable)
      .where(eq(mpDocUpdatesTable.docId, canonicalId));
    const count = Number(countRows?.[0]?.count || 0);
    const threshold = 30;
    if (count > threshold) {
      // Keep a small tail to avoid losing very recent fine-grained deltas
      await compactDocUpdates(canonicalId, { keepLast: 3 });
    }
  } catch (e) {
    logger.error(
      `[YJS Updates] Failed to compact document ${canonicalId}:`,
      e
    );
  }

  try {
    logger.log(
      JSON.stringify({
        event: "yjs_update",
        id: canonicalId,
        bytes: updateBuf.byteLength,
      })
    );
  } catch (e) {
    logger.error("[YJS Updates] Failed to log update event:", e);
  }

  return NextResponse.json(
    { ok: true },
    { headers: { "x-yjs-update-bytes": String(updateBuf.byteLength) } }
  );
}
