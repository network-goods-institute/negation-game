import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/actions/users/getUserId";
import { isUserSiteAdmin } from "@/utils/adminUtils";
import { db } from "@/services/db";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const userId = await getUserId();
  if (!userId || !(await isUserSiteAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = (await db.execute(sql`
    WITH upd AS (
      SELECT doc_id,
             COUNT(*)::int AS updates,
             COALESCE(SUM(octet_length(update_bin)),0)::bigint AS bytes
      FROM mp_doc_updates
      GROUP BY doc_id
    )
    SELECT d.id              AS doc_id,
           COALESCE(u.updates,0) AS updates,
           COALESCE(u.bytes,0)   AS updates_bytes,
           COALESCE(octet_length(d.snapshot),0) AS snapshot_bytes,
           d.updated_at,
           d.snapshot_at
    FROM mp_docs d
    LEFT JOIN upd u ON u.doc_id = d.id
    ORDER BY COALESCE(u.bytes,0) DESC
    LIMIT 100
  `)) as unknown as Array<{
    doc_id: string;
    updates: number;
    updates_bytes: number;
    snapshot_bytes: number;
    updated_at: Date | null;
    snapshot_at: Date | null;
  }>;

  return NextResponse.json({ success: true, docs: rows });
}

