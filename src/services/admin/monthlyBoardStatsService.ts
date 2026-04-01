import { and, asc, eq, gte, lt, sql } from "drizzle-orm";
import { mpDocsTable, mpDocUpdatesTable } from "@/db/schema";
import * as Y from "yjs";

type YjsNode = {
  type?: string;
};

type MonthlyBoardStatsInput = {
  month?: number;
  year?: number;
};

type MonthlyBoardUpdate = {
  updateBin: Buffer | Uint8Array;
  createdAt: Date | string;
};

type MonthlyPointStats = {
  newPoints: number;
  byType: Record<string, number>;
};

export interface MonthlyBoardStats {
  month: string;
  monthNumber: number;
  year: number;
  monthStart: string;
  monthEnd: string;
  boardsScanned: number;
  newBoards: number;
  newPoints: number;
  byType: Record<string, number>;
}

export function getMonthlyBoardStatsWindow(
  input: MonthlyBoardStatsInput = {},
  now = new Date()
) {
  const month =
    input.month && input.month >= 1 && input.month <= 12
      ? input.month
      : now.getUTCMonth() + 1;
  const year =
    input.year && input.year >= 1970 ? input.year : now.getUTCFullYear();
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

  return { start, end, month, year };
}

export function formatMonthlyBoardStatsLabel(month: number, year: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function toUpdateBytes(updateBin: Buffer | Uint8Array) {
  return updateBin instanceof Uint8Array ? updateBin : new Uint8Array(updateBin);
}

function toSortedRecord(entries: Map<string, number>) {
  return Object.fromEntries(
    Array.from(entries.entries()).sort((left, right) => right[1] - left[1])
  );
}

export function calculateMonthlyPointStatsForUpdates(
  updates: MonthlyBoardUpdate[],
  start: Date,
  end: Date
): MonthlyPointStats {
  const doc = new Y.Doc();
  const nodes = doc.getMap<YjsNode>("nodes");
  const firstSeenNodes = new Map<string, { timestamp: Date; type: string }>();

  try {
    for (const update of updates) {
      const timestamp = new Date(update.createdAt);

      try {
        Y.applyUpdate(doc, toUpdateBytes(update.updateBin));
      } catch {
        continue;
      }

      nodes.forEach((node, nodeId) => {
        if (firstSeenNodes.has(nodeId)) {
          return;
        }

        firstSeenNodes.set(nodeId, {
          timestamp,
          type: node?.type || "unknown",
        });
      });
    }

    const byType = new Map<string, number>();
    let newPoints = 0;

    firstSeenNodes.forEach(({ timestamp, type }) => {
      if (timestamp >= start && timestamp < end) {
        byType.set(type, (byType.get(type) || 0) + 1);
        newPoints += 1;
      }
    });

    return {
      newPoints,
      byType: toSortedRecord(byType),
    };
  } finally {
    doc.destroy();
  }
}

export async function fetchMonthlyBoardStats(
  input: MonthlyBoardStatsInput = {}
): Promise<MonthlyBoardStats> {
  const { db } = await import("@/services/db");
  const { start, end, month, year } = getMonthlyBoardStatsWindow(input);

  const [newBoardsRow] = await db
    .select({
      count: sql<number>`count(*)::int`.mapWith(Number),
    })
    .from(mpDocsTable)
    .where(and(gte(mpDocsTable.createdAt, start), lt(mpDocsTable.createdAt, end)));

  const allBoards = await db
    .select({
      id: mpDocsTable.id,
    })
    .from(mpDocsTable)
    .orderBy(asc(mpDocsTable.createdAt));

  const byType = new Map<string, number>();
  let newPoints = 0;

  for (const board of allBoards) {
    const updates = await db
      .select({
        updateBin: mpDocUpdatesTable.updateBin,
        createdAt: mpDocUpdatesTable.createdAt,
      })
      .from(mpDocUpdatesTable)
      .where(eq(mpDocUpdatesTable.docId, board.id))
      .orderBy(asc(mpDocUpdatesTable.createdAt));

    const boardStats = calculateMonthlyPointStatsForUpdates(updates, start, end);
    newPoints += boardStats.newPoints;

    Object.entries(boardStats.byType).forEach(([type, count]) => {
      byType.set(type, (byType.get(type) || 0) + count);
    });
  }

  return {
    month: formatMonthlyBoardStatsLabel(month, year),
    monthNumber: month,
    year,
    monthStart: start.toISOString(),
    monthEnd: end.toISOString(),
    boardsScanned: allBoards.length,
    newBoards: newBoardsRow?.count ?? 0,
    newPoints,
    byType: toSortedRecord(byType),
  };
}
