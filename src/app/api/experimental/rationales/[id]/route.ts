import { NextResponse } from "next/server";
import { db } from "@/services/db";
import { mpDocsTable } from "@/db/tables/mpDocsTable";
import { mpDocUpdatesTable } from "@/db/tables/mpDocUpdatesTable";
import { eq } from "drizzle-orm";
import { getUserId } from "@/actions/users/getUserId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, ctx: any) {
  if (process.env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED !== 'true') {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const raw = ctx?.params;
  const { id } = raw && typeof raw.then === "function" ? await raw : (raw as { id: string });
  
  if (!/^[a-zA-Z0-9:_-]{1,128}$/.test(id)) {
    return NextResponse.json({ error: "Invalid doc id" }, { status: 400 });
  }

  try {
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