import { NextResponse } from "next/server";
import { db } from "@/services/db";
import { mpDocsTable } from "@/db/tables/mpDocsTable";
import { mpDocUpdatesTable } from "@/db/tables/mpDocUpdatesTable";
import { eq } from "drizzle-orm";
import { getUserId } from "@/actions/users/getUserId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: any) {
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
  const update = Buffer.from(body).toString("base64");

  // basic size cap ~ 1MB
  if (update.length > 1_400_000) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  await db.insert(mpDocsTable).values({ id }).onConflictDoNothing();

  await db.insert(mpDocUpdatesTable).values({ docId: id, update, userId });
  await db
    .update(mpDocsTable)
    .set({ updatedAt: new Date() })
    .where(eq(mpDocsTable.id, id));

  return NextResponse.json({ ok: true });
}
