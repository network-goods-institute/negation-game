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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: any) {
  if (process.env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const url = new URL(req.url);
  const nonProd = !isProductionRequest(url.hostname);
  const userId = nonProd ? await getUserIdOrAnonymous() : await getUserId();
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

  const body = await req.arrayBuffer();
  const updateBuf = Buffer.from(body);

  // basic size cap ~ 1MB
  if (updateBuf.byteLength > 1_000_000) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  // Resolve slug to canonical id if needed
  const canonicalId = await resolveSlugToId(id);
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
    console.error(
      `[YJS Updates] Failed to compact document ${canonicalId}:`,
      e
    );
  }

  try {
    console.log(
      JSON.stringify({
        event: "yjs_update",
        id: canonicalId,
        bytes: updateBuf.byteLength,
      })
    );
  } catch (e) {
    console.error("[YJS Updates] Failed to log update event:", e);
  }

  return NextResponse.json(
    { ok: true },
    { headers: { "x-yjs-update-bytes": String(updateBuf.byteLength) } }
  );
}
