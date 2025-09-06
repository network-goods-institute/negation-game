import { NextResponse } from "next/server";
import { db } from "@/services/db";
import { mpDocsTable } from "@/db/tables/mpDocsTable";
import { mpDocUpdatesTable } from "@/db/tables/mpDocUpdatesTable";
import { eq, sql } from "drizzle-orm";
import { getUserId } from "@/actions/users/getUserId";
import { compactDocUpdates } from "@/services/yjsCompaction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: any) {
  if (process.env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED !== 'true') {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const userId = await getUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const raw = ctx?.params;
  const { id } =
    raw && typeof raw.then === "function" ? await raw : (raw as { id: string });
  if (!/^[a-zA-Z0-9:_-]{1,128}$/.test(id)) {
    return NextResponse.json({ error: "Invalid doc id" }, { status: 400 });
  }
  const body = await req.arrayBuffer();
  const updateBuf = Buffer.from(body);
  try {} catch {}

  // basic size cap ~ 1MB
  if (updateBuf.byteLength > 1_000_000) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  await db.insert(mpDocsTable).values({ id }).onConflictDoNothing();

  await db.insert(mpDocUpdatesTable).values({ docId: id, updateBin: updateBuf, userId });
  await db
    .update(mpDocsTable)
    .set({ updatedAt: new Date() })
    .where(eq(mpDocsTable.id, id));
  try {} catch {}

  // Inline fast compaction when threshold exceeded
  try {
    const countRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(mpDocUpdatesTable)
      .where(eq(mpDocUpdatesTable.docId, id));
    const count = Number(countRows?.[0]?.count || 0);
    const threshold = 30;
    if (count > threshold) {
      // Keep a small tail to avoid losing very recent fine-grained deltas
      await compactDocUpdates(id, { keepLast: 3 });
    }
  } catch (e) {}

  return NextResponse.json({ ok: true });
}
