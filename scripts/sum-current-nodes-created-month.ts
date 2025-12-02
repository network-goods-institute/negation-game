#!/usr/bin/env -S npx tsx
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";
import { mpDocUpdatesTable } from "@/db/schema";
import { and, asc, eq, gte, lt, sql } from "drizzle-orm";
import * as Y from "yjs";
import { exit } from "process";

type DocRow = {
  id: string;
  title: string | null;
  createdAt: Date;
};

function parseArgs(argv: string[]) {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("-")) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    }
  }
  return out as { month?: string; year?: string; json?: string | boolean };
}

function getMonthWindow(month?: number, year?: number) {
  const now = new Date();
  const m = month && month >= 1 && month <= 12 ? month : now.getUTCMonth() + 1;
  const y = year && year >= 1970 ? year : now.getUTCFullYear();
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  return { start, end };
}

async function main() {
  if (!process.env.POSTGRES_URL) {
    console.error("[SumCurrentNodes] POSTGRES_URL is not defined.");
    exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  const month = args.month ? Number(args.month) : undefined;
  const year = args.year ? Number(args.year) : undefined;
  const outputJson = Boolean(args.json);
  const { start, end } = getMonthWindow(month, year);
  const startStr = start.toISOString();
  const endStr = end.toISOString();

  const client = postgres(process.env.POSTGRES_URL, { prepare: false });
  const db = drizzle(client, { schema });

  try {
    // Find docs created in the month
    const docs = (await db.execute(
      sql`SELECT id, title, created_at FROM mp_docs WHERE created_at >= ${startStr} AND created_at < ${endStr}`
    )) as unknown as Array<{
      id: string;
      title: string | null;
      created_at: Date;
    }>;

    const perBoard: Array<{
      id: string;
      title: string | null;
      createdAt: string;
      nodeCount: number;
    }> = [];
    let totalNodes = 0;

    for (const d of docs) {
      const doc = new Y.Doc();

      // Try to use cached snapshot and apply tail updates; otherwise, merge all updates
      let appliedSnapshot = false;
      let snapshotAt: Date | null = null;
      try {
        const snapRows = (await db.execute(
          sql`SELECT "snapshot", "snapshot_at" FROM "mp_docs" WHERE id = ${d.id} LIMIT 1`
        )) as unknown as Array<{
          snapshot: Buffer | null;
          snapshot_at: Date | null;
        }>;
        const snap = snapRows?.[0];
        if (snap?.snapshot && (snap.snapshot as any).length) {
          Y.applyUpdate(doc, new Uint8Array(snap.snapshot as any));
          appliedSnapshot = true;
          snapshotAt = snap.snapshot_at
            ? new Date(snap.snapshot_at as any)
            : null;
        }
      } catch {}

      if (appliedSnapshot && snapshotAt) {
        const tail = await db
          .select({ updateBin: mpDocUpdatesTable.updateBin })
          .from(mpDocUpdatesTable)
          .where(
            and(
              eq(mpDocUpdatesTable.docId, d.id),
              gte(mpDocUpdatesTable.createdAt, snapshotAt)
            )
          )
          .orderBy(asc(mpDocUpdatesTable.createdAt));
        for (const r of tail) {
          const b = r.updateBin as unknown as Buffer;
          if (b && (b as any).length) {
            try {
              Y.applyUpdate(doc, new Uint8Array(b));
            } catch {}
          }
        }
      } else {
        const updates = await db
          .select({ updateBin: mpDocUpdatesTable.updateBin })
          .from(mpDocUpdatesTable)
          .where(eq(mpDocUpdatesTable.docId, d.id))
          .orderBy(asc(mpDocUpdatesTable.createdAt));
        for (const r of updates) {
          const b = r.updateBin as unknown as Buffer;
          if (b && (b as any).length) {
            try {
              Y.applyUpdate(doc, new Uint8Array(b));
            } catch {}
          }
        }
      }

      // Count current nodes
      const yNodes = doc.getMap<unknown>("nodes");
      let nodeCount = 0;
      yNodes.forEach(() => {
        nodeCount += 1;
      });
      totalNodes += nodeCount;
      perBoard.push({
        id: d.id,
        title: d.title,
        createdAt: new Date(d.created_at as any).toISOString(),
        nodeCount,
      });
      doc.destroy();
    }

    if (outputJson) {
      console.log(
        JSON.stringify(
          {
            monthStart: start.toISOString(),
            monthEnd: end.toISOString(),
            boardsCount: perBoard.length,
            totalNodes,
            perBoard,
          },
          null,
          2
        )
      );
    } else {
      console.log(`Boards created: ${perBoard.length}`);
      console.log(`Total current nodes across those boards: ${totalNodes}`);
    }
  } catch (err) {
    console.error("[SumCurrentNodes] Failed:", err);
    exit(1);
  } finally {
    await client.end();
  }
}

main();
