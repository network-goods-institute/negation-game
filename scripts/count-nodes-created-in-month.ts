#!/usr/bin/env tsx
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
  return { start, end };
}

async function main() {
  if (!process.env.POSTGRES_URL) {
    console.error("[CountNodes] POSTGRES_URL is not defined.");
    exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  const month = args.month ? Number(args.month) : undefined;
  const year = args.year ? Number(args.year) : undefined;
  const outputJson = Boolean(args.json);
  const { start, end } = getMonthWindow(month, year);

  const client = postgres(process.env.POSTGRES_URL, { prepare: false });
  const db = drizzle(client, { schema });

  try {
    const allDocs = (await db.execute(
      sql`SELECT id, title, created_at FROM mp_docs`
    )) as unknown as Array<{
      id: string;
      title: string | null;
      created_at: Date;
    }>;

    console.error(
      `[CountNodes] Scanning ${allDocs.length} boards for nodes created in ${start.toLocaleDateString()}...`
    );

    const nodesCreatedInMonth: Array<{
      nodeId: string;
      type: string;
      boardId: string;
      boardTitle: string | null;
      createdAt: Date;
      stillExists: boolean;
    }> = [];

    for (const boardInfo of allDocs) {
      const doc = new Y.Doc();
      const yNodesMap = doc.getMap<YjsNode>("nodes");

      // Track when each node first appeared on this board
      const nodeFirstSeen = new Map<string, Date>();

      // Get all updates in chronological order
      const updates = await db
        .select({
          updateBin: mpDocUpdatesTable.updateBin,
          createdAt: mpDocUpdatesTable.createdAt,
        })
        .from(mpDocUpdatesTable)
        .where(eq(mpDocUpdatesTable.docId, boardInfo.id))
        .orderBy(asc(mpDocUpdatesTable.createdAt));

      // Apply updates one by one to track when nodes appeared
      for (const update of updates) {
        const b = update.updateBin as unknown as Buffer;
        const timestamp = new Date(update.createdAt as any);

        if (b && (b as any).length) {
          try {
            Y.applyUpdate(doc, new Uint8Array(b));

            yNodesMap.forEach((node, nodeId) => {
              if (!nodeFirstSeen.has(nodeId)) {
                nodeFirstSeen.set(nodeId, timestamp);
              }
            });
          } catch {}
        }
      }

      // Get current nodes to check what still exists
      const currentNodes = new Set<string>();
      yNodesMap.forEach((node, nodeId) => {
        currentNodes.add(nodeId);
      });

      // Find nodes created in target month on this board
      nodeFirstSeen.forEach((timestamp, nodeId) => {
        if (timestamp >= start && timestamp < end) {
          const node = yNodesMap.get(nodeId);
          nodesCreatedInMonth.push({
            nodeId,
            type: node?.type || "unknown",
            boardId: boardInfo.id,
            boardTitle: boardInfo.title,
            createdAt: timestamp,
            stillExists: currentNodes.has(nodeId),
          });
        }
      });

      doc.destroy();
    }

    // Generate statistics
    const totalNodes = nodesCreatedInMonth.length;
    const stillExisting = nodesCreatedInMonth.filter((n) => n.stillExists).length;
    const deleted = totalNodes - stillExisting;

    const byType = new Map<string, number>();
    const byBoard = new Map<string, { title: string | null; count: number }>();

    nodesCreatedInMonth.forEach((node) => {
      byType.set(node.type, (byType.get(node.type) || 0) + 1);

      if (!byBoard.has(node.boardId)) {
        byBoard.set(node.boardId, { title: node.boardTitle, count: 0 });
      }
      byBoard.get(node.boardId)!.count++;
    });

    if (outputJson) {
      console.log(
        JSON.stringify(
          {
            monthStart: start.toISOString(),
            monthEnd: end.toISOString(),
            totalNodesCreated: totalNodes,
            stillExisting,
            deleted,
            byType: Object.fromEntries(byType),
            byBoard: Array.from(byBoard.entries()).map(([id, info]) => ({
              boardId: id,
              boardTitle: info.title,
              count: info.count,
            })),
            nodes: nodesCreatedInMonth.map((n) => ({
              nodeId: n.nodeId,
              type: n.type,
              boardId: n.boardId,
              boardTitle: n.boardTitle,
              createdAt: n.createdAt.toISOString(),
              stillExists: n.stillExists,
            })),
          },
          null,
          2
        )
      );
    } else {
      console.log(`\nNodes created in ${start.toLocaleDateString()}: ${totalNodes}`);
      console.log(`Still existing: ${stillExisting}`);
      console.log(`Deleted: ${deleted}`);
      console.log(`\nBy type:`);
      Array.from(byType.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
          console.log(`  ${type}: ${count}`);
        });
      console.log(`\nBoards with nodes created: ${byBoard.size}`);
    }
  } catch (err) {
    console.error("[CountNodes] Failed:", err);
    exit(1);
  } finally {
    await client.end();
  }
}

main();
