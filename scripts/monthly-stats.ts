#!/usr/bin/env -S npx tsx
import { config } from "dotenv";
config({ path: ".env.local" });

import { exit } from "process";
import { fetchMonthlyBoardStats } from "@/services/admin/monthlyBoardStatsService";

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

async function main() {
  if (!process.env.POSTGRES_URL) {
    console.error("[MonthlyStats] POSTGRES_URL is not defined.");
    exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  const monthArg = args.month ? Number(args.month) : undefined;
  const yearArg = args.year ? Number(args.year) : undefined;
  const outputJson = Boolean(args.json);

  try {
    const stats = await fetchMonthlyBoardStats({
      month: monthArg,
      year: yearArg,
    });

    console.error(
      `[MonthlyStats] Scanning ${stats.boardsScanned} boards for points created in ${stats.month}...`
    );

    if (outputJson) {
      console.log(
        JSON.stringify(
          {
            month: stats.month,
            monthStart: stats.monthStart,
            monthEnd: stats.monthEnd,
            newBoards: stats.newBoards,
            newPoints: stats.newPoints,
            byType: stats.byType,
          },
          null,
          2
        )
      );
      return;
    }

    console.log(`\n${stats.month} Stats:`);
    console.log(`New boards: ${stats.newBoards}`);
    console.log(`New points: ${stats.newPoints}`);

    if (Object.keys(stats.byType).length > 0) {
      console.log(`\nAll node types created:`);
      Object.entries(stats.byType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    }
  } catch (err) {
    console.error("[MonthlyStats] Failed:", err);
    exit(1);
  }
}

main();
