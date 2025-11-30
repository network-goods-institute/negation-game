"use server";
import { db } from "@/services/db";
import { marketHoldingsTable } from "@/db/tables/marketHoldingsTable";
import { usersTable } from "@/db/tables/usersTable";
import { and, eq } from "drizzle-orm";
import { resolveSlugToId } from "@/utils/slugResolver";

const normalize = (id: string) => (id?.startsWith("anchor:") ? id.slice("anchor:".length) : id);

export type HoldingsRow = {
  userId: string;
  amountScaled: string;
  displayName?: string | null;
};

export async function getHoldingsBreakdown(docId: string, securityId: string): Promise<HoldingsRow[]> {
  const sid = normalize(String(securityId));
  const did = await resolveSlugToId(String(docId));
  const rows = await db
    .select({
      userId: marketHoldingsTable.userId,
      amountScaled: marketHoldingsTable.amountScaled,
      displayName: usersTable.username,
    })
    .from(marketHoldingsTable)
    .leftJoin(usersTable, eq(usersTable.id, marketHoldingsTable.userId))
    .where(and(eq(marketHoldingsTable.docId, did), eq(marketHoldingsTable.securityId, sid)));
  return rows.map((r) => ({ userId: r.userId, amountScaled: r.amountScaled, displayName: r.displayName }));
}
