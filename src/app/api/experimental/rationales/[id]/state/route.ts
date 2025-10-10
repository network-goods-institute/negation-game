import { NextResponse } from "next/server";
import { gzipSync } from "zlib";
import { db } from "@/services/db";
import { mpDocsTable } from "@/db/tables/mpDocsTable";
import { or, eq, sql } from "drizzle-orm";
import {
  getDocSnapshotBase64,
  getDocSnapshotBuffer,
} from "@/services/yjsCompaction";
import * as Y from "yjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: any) {
  if (process.env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const raw = ctx?.params;
  const { id } =
    raw && typeof raw.then === "function" ? await raw : (raw as { id: string });
  if (!/^[a-zA-Z0-9:_-]{1,256}$/.test(id)) {
    return NextResponse.json({ error: "Invalid doc id" }, { status: 400 });
  }
  // Resolve slug to canonical id if it exists
  let canonicalId = id;
  try {
    const rows = await db
      .select({ id: mpDocsTable.id })
      .from(mpDocsTable)
      .where(or(eq(mpDocsTable.id, id), eq(mpDocsTable.slug, id)))
      .limit(1);
    if (rows.length === 1) canonicalId = rows[0].id;
  } catch {}
  await db
    .insert(mpDocsTable)
    .values({ id: canonicalId })
    .onConflictDoNothing();

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode");

  if (mode === "updates") {
    const rows = (await db.execute(
      sql`SELECT "update_bin" FROM "mp_doc_updates" WHERE "doc_id" = ${canonicalId} ORDER BY "created_at" ASC`
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
    try {
    } catch {}
    let baseDocBuf: Buffer | null = null;
    try {
      const snap = (await db.execute(
        sql`SELECT "snapshot" FROM "mp_docs" WHERE id = ${canonicalId} LIMIT 1`
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
        sql`SELECT "update_bin" FROM "mp_doc_updates" WHERE "doc_id" = ${canonicalId} ORDER BY "created_at" ASC`
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
    if (!diff || diff.byteLength === 0) {
      try {
        console.log(
          JSON.stringify({
            event: "yjs_state",
            kind: "diff",
            status: 204,
            id: canonicalId,
            bytes: 0,
          })
        );
      } catch {}
      return new NextResponse(new Uint8Array(), { status: 204 });
    }
    try {
    } catch {}
    const accept =
      (req.headers as any).get?.("accept-encoding") ||
      (req as any).headers?.get?.("accept-encoding") ||
      "";
    const supportGzip = /\bgzip\b/i.test(accept);
    const threshold = 16384;
    let payload: Uint8Array = diff;
    const dheaders: Record<string, string> = {
      "content-type": "application/octet-stream",
      "x-yjs-format": "binary",
      "x-yjs-diff": "1",
      "x-yjs-diff-bytes": String(diff.byteLength),
      "cache-control": "no-store",
      Vary: "Accept-Encoding",
    };
    if (supportGzip && payload.byteLength >= threshold) {
      try {
        const gz = gzipSync(Buffer.from(payload));
        if (gz && gz.byteLength < payload.byteLength) {
          payload = gz as unknown as Uint8Array;
          dheaders["content-encoding"] = "gzip";
          dheaders["x-yjs-compressed"] = "gzip";
          dheaders["x-yjs-compressed-bytes"] = String(gz.byteLength);
        }
      } catch {}
    }
    return new NextResponse(Buffer.from(payload), { headers: dheaders });
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
      sql`SELECT "snapshot_at" FROM "mp_docs" WHERE id = ${canonicalId} LIMIT 1`
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
    try {
      console.log(
        JSON.stringify({
          event: "yjs_state",
          kind: "snapshot",
          status: 304,
          id: canonicalId,
        })
      );
    } catch {}
    return new NextResponse(null, { status: 304 });
  }
  if (lastModified && ifModifiedSince) {
    const ims = new Date(ifModifiedSince);
    if (!isNaN(ims.getTime()) && ims >= lastModified) {
      try {
        console.log(
          JSON.stringify({
            event: "yjs_state",
            kind: "snapshot",
            status: 304,
            id: canonicalId,
          })
        );
      } catch {}
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
  headers["cache-control"] = "public, max-age=60";
  headers["Vary"] = "Accept-Encoding";
  if (etag) headers["etag"] = etag;
  if (lastModified) headers["last-modified"] = lastModified.toUTCString();
  if (url.searchParams.get("debug") === "1") {
    const updates = (await db.execute(
      sql`SELECT "update_bin" FROM "mp_doc_updates" WHERE "doc_id" = ${canonicalId}`
    )) as unknown as Array<{ update_bin: Buffer }>;
    const prevBytes = updates.reduce(
      (sum, u) => sum + ((u.update_bin?.length as number) || 0),
      0
    );
    headers["x-yjs-updates-count"] = String(updates.length);
    headers["x-yjs-prev-base64-bytes"] = String(prevBytes);
  }
  try {
  } catch {}
  try {
    console.log(
      JSON.stringify({
        event: "yjs_state",
        kind: "snapshot",
        status: 200,
        id: canonicalId,
        bytes: buffer?.byteLength ?? (buffer as any)?.length ?? 0,
        etag,
      })
    );
  } catch {}
  const accept =
    (req.headers as any).get?.("accept-encoding") ||
    (req as any).headers?.get?.("accept-encoding") ||
    "";
  const supportGzip = /\bgzip\b/i.test(accept);
  const threshold = 16384;
  let payload: Uint8Array = buffer as unknown as Uint8Array;
  if (
    supportGzip &&
    payload &&
    (payload as Uint8Array).byteLength >= threshold
  ) {
    try {
      const gz = gzipSync(Buffer.from(payload));
      if (gz && gz.byteLength < (payload as Uint8Array).byteLength) {
        payload = gz as unknown as Uint8Array;
        headers["content-encoding"] = "gzip";
        headers["x-yjs-compressed"] = "gzip";
        headers["x-yjs-compressed-bytes"] = String(gz.byteLength);
      }
    } catch (error) {
      console.error("Failed to compress payload with gzip:", error);
    }
  }
  const res = new NextResponse(Buffer.from(payload), { headers });
  return res;
}
