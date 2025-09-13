import { NextResponse } from "next/server";
import { getUserId } from "@/actions/users/getUserId";
import { db } from "@/services/db";
import { mpDocsTable } from "@/db/tables/mpDocsTable";
import { mpDocAccessTable } from "@/db/tables/mpDocAccessTable";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: any) {
  if (process.env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED !== "true") {
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
  try {
    await db
      .insert(mpDocsTable)
      .values({ id, ownerId: userId, title: "New Rationale" })
      .onConflictDoNothing();
    const row = (
      await db.select().from(mpDocsTable).where(eq(mpDocsTable.id, id)).limit(1)
    )[0] as any;
    if (row && !row.ownerId) {
      await db
        .update(mpDocsTable)
        .set({ ownerId: userId })
        .where(eq(mpDocsTable.id, id));
    }
    const existing = await db
      .select({ id: mpDocAccessTable.id })
      .from(mpDocAccessTable)
      .where(
        and(eq(mpDocAccessTable.docId, id), eq(mpDocAccessTable.userId, userId))
      )
      .limit(1);
    if (existing.length === 0) {
      await db.insert(mpDocAccessTable).values({ docId: id, userId });
    } else {
      await db
        .update(mpDocAccessTable)
        .set({ lastOpenAt: new Date() })
        .where(
          and(
            eq(mpDocAccessTable.docId, id),
            eq(mpDocAccessTable.userId, userId)
          )
        );
    }
    const doc = (
      await db.select().from(mpDocsTable).where(eq(mpDocsTable.id, id)).limit(1)
    )[0] as any;
    return NextResponse.json({
      ok: true,
      ownerId: doc?.ownerId || null,
      title: doc?.title || null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to record open" },
      { status: 500 }
    );
  }
}
