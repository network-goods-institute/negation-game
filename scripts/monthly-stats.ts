#!/usr/bin/env -S npx tsx
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";
import { mpDocUpdatesTable } from "@/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import * as Y from "yjs";
import { exit } from "process";

type YjsNode = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: any;
  [key: string]: any;
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
  return { start, end, month: m, year: y };
}

function formatMonth(month: number, year: number): string {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${monthNames[month - 1]} ${year}`;
}

async function main() {
  if (!process.env.POSTGRES_URL) {
    console.error("[MonthlyStats] POSTGRES_URL is not defined.");
    exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  const monthArg = args.month ? Number(args.month) : undefined;
  const yearArg = args.year ? Number(args.year) : undefined;
  const outputJson = Boolean(args.json);
  const { start, end, month, year } = getMonthWindow(monthArg, yearArg);
  const startStr = start.toISOString();
  const endStr = end.toISOString();

  const client = postgres(process.env.POSTGRES_URL, { prepare: false });
  const db = drizzle(client, { schema });

  try {
    const newBoardsResult = (await db.execute(
      sql`SELECT COUNT(*)::int AS count FROM mp_docs WHERE created_at >= ${startStr}::timestamptz AND created_at < ${endStr}::timestamptz`
    )) as unknown as Array<{ count: number }>;
    const newBoards = newBoardsResult[0]?.count ?? 0;

    const allDocs = (await db.execute(
      sql`SELECT id, title, created_at FROM mp_docs`
    )) as unknown as Array<{
      id: string;
      title: string | null;
      created_at: Date;
    }>;

    console.error(
      `[MonthlyStats] Scanning ${allDocs.length} boards for points created in ${formatMonth(month, year)}...`
    );

    let newPoints = 0;
    const byType = new Map<string, number>();

    for (const boardInfo of allDocs) {
      const doc = new Y.Doc();
      const yNodesMap = doc.getMap<YjsNode>("nodes");

      const nodeFirstSeen = new Map<
        string,
        { timestamp: Date; type: string }
      >();

      const updates = await db
        .select({
          updateBin: mpDocUpdatesTable.updateBin,
          createdAt: mpDocUpdatesTable.createdAt,
        })
        .from(mpDocUpdatesTable)
        .where(eq(mpDocUpdatesTable.docId, boardInfo.id))
        .orderBy(asc(mpDocUpdatesTable.createdAt));

      for (const update of updates) {
        const b = update.updateBin as unknown as Buffer;
        const timestamp = new Date(update.createdAt as any);

        if (b && (b as any).length) {
          try {
            Y.applyUpdate(doc, new Uint8Array(b));

            yNodesMap.forEach((node, nodeId) => {
              if (!nodeFirstSeen.has(nodeId)) {
                nodeFirstSeen.set(nodeId, {
                  timestamp,
                  type: node?.type || "unknown",
                });
              }
            });
          } catch {}
        }
      }

      nodeFirstSeen.forEach(({ timestamp, type }) => {
        if (timestamp >= start && timestamp < end) {
          byType.set(type, (byType.get(type) || 0) + 1);
          newPoints++;
        }
      });

      doc.destroy();
    }

    if (outputJson) {
      console.log(
        JSON.stringify(
          {
            month: formatMonth(month, year),
            monthStart: start.toISOString(),
            monthEnd: end.toISOString(),
            newBoards,
            newPoints,
            byType: Object.fromEntries(byType),
          },
          null,
          2
        )
      );
    } else {
      console.log(`\n${formatMonth(month, year)} Stats:`);
      console.log(`New boards: ${newBoards}`);
      console.log(`New points: ${newPoints}`);
      if (byType.size > 0) {
        console.log(`\nAll node types created:`);
        Array.from(byType.entries())
          .sort((a, b) => b[1] - a[1])
          .forEach(([type, count]) => {
            console.log(`  ${type}: ${count}`);
          });
      }
    }
  } catch (err) {
    console.error("[MonthlyStats] Failed:", err);
    exit(1);
  } finally {
    await client.end();
  }
}

main();
