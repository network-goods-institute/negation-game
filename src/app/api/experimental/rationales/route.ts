import { NextResponse } from "next/server";
import { getUserId } from "@/actions/users/getUserId";
import { db } from "@/services/db";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED !== 'true') {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const userId = await getUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = (await db.execute(sql`
    SELECT d.id, d.title, d.owner_id as "ownerId", d.created_at as "createdAt", d.updated_at as "updatedAt", a.last_open_at as "lastOpenAt"
    FROM mp_docs d
    LEFT JOIN LATERAL (
      SELECT last_open_at FROM mp_doc_access a
      WHERE a.doc_id = d.id AND a.user_id = ${userId}
      ORDER BY last_open_at DESC
      LIMIT 1
    ) a ON TRUE
    WHERE d.owner_id = ${userId}
       OR EXISTS (SELECT 1 FROM mp_doc_access x WHERE x.doc_id = d.id AND x.user_id = ${userId})
    ORDER BY a.last_open_at DESC NULLS LAST, d.updated_at DESC
    LIMIT 200
  `)) as unknown as Array<{
    id: string;
    title: string | null;
    ownerId: string | null;
    createdAt: Date;
    updatedAt: Date;
    lastOpenAt: Date | null;
  }>;
  return NextResponse.json({ docs: rows });
}
