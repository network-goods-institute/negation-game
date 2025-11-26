import { NextResponse } from "next/server";
import { getUserId } from "@/actions/users/getUserId";
import { db } from "@/services/db";
import { mpDocsTable } from "@/db/tables/mpDocsTable";
import { mpDocAccessTable } from "@/db/tables/mpDocAccessTable";
import { and, eq } from "drizzle-orm";
import { resolveSlugToId, isValidSlugOrId } from "@/utils/slugResolver";
import { logger } from "@/lib/logger";

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

  if (!isValidSlugOrId(id)) {
    return NextResponse.json(
      { error: "Invalid doc id or slug" },
      { status: 400 }
    );
  }

  const canonicalId = await resolveSlugToId(id);

  try {
    const row = (
      await db
        .select()
        .from(mpDocsTable)
        .where(eq(mpDocsTable.id, canonicalId))
        .limit(1)
    )[0] as any;
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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
    const doc = (
      await db
        .select()
        .from(mpDocsTable)
        .where(eq(mpDocsTable.id, canonicalId))
        .limit(1)
    )[0] as any;
    return NextResponse.json({
      ok: true,
      ownerId: doc?.ownerId || null,
      title: doc?.title || null,
    });
  } catch (e) {
    logger.error("[Record Open] Failed to record open:", e);
    return NextResponse.json(
      { error: "Failed to record open" },
      { status: 500 }
    );
  }
}
