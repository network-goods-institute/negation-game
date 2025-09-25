import { NextResponse } from "next/server";
import { db } from "@/services/db";
import { mpDocsTable } from "@/db/tables/mpDocsTable";
import { mpDocUpdatesTable } from "@/db/tables/mpDocUpdatesTable";
import { and, eq } from "drizzle-orm";
import { getUserId } from "@/actions/users/getUserId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: any) {
  if (process.env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const raw = ctx?.params;
  const { id } =
    raw && typeof raw.then === "function" ? await raw : (raw as { id: string });
  if (!/^[a-zA-Z0-9:_-]{1,128}$/.test(id)) {
    return NextResponse.json({ error: "Invalid doc id" }, { status: 400 });
  }
  const rows = await db
    .select()
    .from(mpDocsTable)
    .where(eq(mpDocsTable.id, id))
    .limit(1);
  const doc = rows[0] as any;
  if (!doc) return NextResponse.json({ id, title: null, ownerId: null });
  return NextResponse.json({
    id: doc.id,
    title: doc.title || null,
    ownerId: doc.ownerId || null,
  });
}

export async function DELETE(_req: Request, ctx: any) {
  if (process.env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = ctx?.params;
  const { id } =
    raw && typeof raw.then === "function" ? await raw : (raw as { id: string });

  if (!/^[a-zA-Z0-9:_-]{1,128}$/.test(id)) {
    return NextResponse.json({ error: "Invalid doc id" }, { status: 400 });
  }

  try {
    const ownerRow = await db
      .select({ ownerId: mpDocsTable.ownerId })
      .from(mpDocsTable)
      .where(eq(mpDocsTable.id, id))
      .limit(1);
    if (ownerRow.length === 0)
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    const ownerId = ownerRow[0].ownerId || "connormcmk";
    if (!ownerRow[0].ownerId) {
      await db
        .update(mpDocsTable)
        .set({ ownerId: userId })
        .where(eq(mpDocsTable.id, id));
    }
    if (ownerId !== userId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // Delete all updates first
    await db.delete(mpDocUpdatesTable).where(eq(mpDocUpdatesTable.docId, id));

    // Delete the document
    await db.delete(mpDocsTable).where(eq(mpDocsTable.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete rationale:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: any) {
  if (process.env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const raw = ctx?.params;
  const { id } =
    raw && typeof raw.then === "function" ? await raw : (raw as { id: string });
  if (!/^[a-zA-Z0-9:_-]{1,128}$/.test(id)) {
    return NextResponse.json({ error: "Invalid doc id" }, { status: 400 });
  }
  let json: any = null;
  try {
    json = await req.json();
  } catch {}
  const title = json?.title || "";
  try {
    await db
      .insert(mpDocsTable)
      .values({ id, ownerId: userId || null })
      .onConflictDoNothing();
    const ownerRows = await db
      .select({ ownerId: mpDocsTable.ownerId })
      .from(mpDocsTable)
      .where(eq(mpDocsTable.id, id))
      .limit(1);
    if (ownerRows.length === 0)
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    const currentOwner = ownerRows[0].ownerId || "connormcmk";
    if (!ownerRows[0].ownerId) {
      await db
        .update(mpDocsTable)
        .set({ ownerId: userId })
        .where(eq(mpDocsTable.id, id));
    }
    if (title) {
      await db
        .update(mpDocsTable)
        .set({ title, updatedAt: new Date() })
        .where(eq(mpDocsTable.id, id));
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update title:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
