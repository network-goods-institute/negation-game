import { NextResponse } from "next/server";
import { db } from "@/services/db";
import { mpDocsTable } from "@/db/tables/mpDocsTable";
import { sql } from "drizzle-orm";
import {
  getDocSnapshotBase64,
  getDocSnapshotBuffer,
} from "@/services/yjsCompaction";
import * as Y from "yjs";
import { getUserId } from "@/actions/users/getUserId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: any) {
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
  await db.insert(mpDocsTable).values({ id }).onConflictDoNothing();

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode");

  if (mode === "updates") {
    const rows = (await db.execute(
      sql`SELECT "update_bin" FROM "mp_doc_updates" WHERE "doc_id" = ${id} ORDER BY "created_at" ASC`
    )) as unknown as Array<{ update_bin: Buffer }>;
    const updates = rows.map((r) =>
      r.update_bin ? Buffer.from(r.update_bin).toString("base64") : ""
    );
    return NextResponse.json({ updates });
  }

  if (mode === "json-snapshot") {
    const snapshot = await getDocSnapshotBase64(id);
    return NextResponse.json({ snapshot });
  }

  // If client provides a state vector (sv=base64), return only missing updates
  const svB64 = url.searchParams.get("sv");
  if (svB64) {
    try { } catch {}
    let baseDocBuf: Buffer | null = null;
    try {
      const snap = (await db.execute(
        sql`SELECT "snapshot" FROM "mp_docs" WHERE id = ${id} LIMIT 1`
      )) as unknown as Array<{ snapshot: Buffer | null }>;
      if (snap?.[0]?.snapshot && (snap[0].snapshot as any).length) {
        baseDocBuf = Buffer.from(snap[0].snapshot as any);
      }
    } catch {}

    const ydoc = new Y.Doc();
    if (baseDocBuf) {
      try {
        Y.applyUpdate(ydoc, new Uint8Array(baseDocBuf));
      } catch {}
    } else {
      const all = (await db.execute(
        sql`SELECT "update_bin" FROM "mp_doc_updates" WHERE "doc_id" = ${id} ORDER BY "created_at" ASC`
      )) as unknown as Array<{ update_bin: Buffer }>;
      for (const r of all as any[]) {
        const b = r.update_bin as Buffer;
        if (b && b.length) {
          try {
            Y.applyUpdate(ydoc, new Uint8Array(b));
          } catch {}
        }
      }
    }

    let sv: Uint8Array | null = null;
    try {
      sv = new Uint8Array(Buffer.from(svB64, "base64"));
    } catch {}
    if (!sv) return new NextResponse(new Uint8Array(), { status: 204 });
    const diff = Y.encodeStateAsUpdate(ydoc, sv);
    if (!diff || diff.byteLength === 0)
      return new NextResponse(new Uint8Array(), { status: 204 });
    try { } catch {}
    return new NextResponse(Buffer.from(diff), {
      headers: {
        "content-type": "application/octet-stream",
        "x-yjs-format": "binary",
        "x-yjs-diff": "1",
      },
    });
  }

  // Default: binary snapshot; prefer cached snapshot on mp_docs, fallback to merge
  let buffer: Buffer | null = null;
  try {
    const snap = (await db.execute(
      sql`SELECT "snapshot" FROM "mp_docs" WHERE id = ${id} LIMIT 1`
    )) as unknown as Array<{ snapshot: Buffer | null }>;
    if (snap?.[0]?.snapshot && (snap[0].snapshot as any).length) {
      buffer = Buffer.from(snap[0].snapshot as any);
    }
  } catch {}
  if (!buffer) {
    buffer = await getDocSnapshotBuffer(id);
  }
  // ETag/304 support using snapshot_at timestamp
  let etag: string | null = null;
  let lastModified: Date | null = null;
  try {
    const meta = (await db.execute(
      sql`SELECT "snapshot_at" FROM "mp_docs" WHERE id = ${id} LIMIT 1`
    )) as unknown as Array<{ snapshot_at: Date | null }>;
    if (meta?.[0]?.snapshot_at) {
      lastModified =
        meta[0].snapshot_at instanceof Date
          ? meta[0].snapshot_at
          : new Date(meta[0].snapshot_at as any);
      etag = `W/"${lastModified.getTime()}-${buffer.length}"`;
    }
  } catch {}
  const ifNoneMatch =
    (req.headers as any).get?.("if-none-match") ||
    (req as any).headers?.get?.("if-none-match");
  const ifModifiedSince =
    (req.headers as any).get?.("if-modified-since") ||
    (req as any).headers?.get?.("if-modified-since");
  if (etag && ifNoneMatch === etag) {
    return new NextResponse(null, { status: 304 });
  }
  if (lastModified && ifModifiedSince) {
    const ims = new Date(ifModifiedSince);
    if (!isNaN(ims.getTime()) && ims >= lastModified) {
      return new NextResponse(null, { status: 304 });
    }
  }

  const headers: Record<string, string> = {
    "content-type": "application/octet-stream",
    "x-yjs-format": "binary",
    "x-yjs-snapshot-bytes": String(
      buffer.byteLength ?? (buffer as any).length ?? 0
    ),
  };
  // Encourage client caches to revalidate with ETag/Last-Modified quickly
  headers["cache-control"] = "public, max-age=60";
  if (etag) headers["etag"] = etag;
  if (lastModified) headers["last-modified"] = lastModified.toUTCString();
  if (url.searchParams.get("debug") === "1") {
    const updates = (await db.execute(
      sql`SELECT "update_bin" FROM "mp_doc_updates" WHERE "doc_id" = ${id}`
    )) as unknown as Array<{ update_bin: Buffer }>;
    const prevBytes = updates.reduce(
      (sum, u) => sum + ((u.update_bin?.length as number) || 0),
      0
    );
    headers["x-yjs-updates-count"] = String(updates.length);
    headers["x-yjs-prev-base64-bytes"] = String(prevBytes);
  }
  try { } catch {}
  const res = new NextResponse(buffer, { headers });
  return res;
}
