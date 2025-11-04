"use server";
import { db } from "@/services/db";
import { marketHoldingsTable } from "@/db/tables/marketHoldingsTable";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/actions/users/getUserId";
import { resolveSlugToId } from "@/utils/slugResolver";

const normalize = (id: string) => (id?.startsWith("anchor:") ? id.slice("anchor:".length) : id);

export async function getUserHoldings(docId: string): Promise<Record<string, string>> {
  const userId = await getUserId();
  if (!userId) return {};
  const canonicalId = await resolveSlugToId(docId);
  const rows = await db
    .select({ securityId: marketHoldingsTable.securityId, amountScaled: marketHoldingsTable.amountScaled })
    .from(marketHoldingsTable)
    .where(and(eq(marketHoldingsTable.docId, String(canonicalId)), eq(marketHoldingsTable.userId, userId)));
  const out: Record<string, string> = {};
  for (const r of rows) {
    const id = normalize(String(r.securityId || ""));
    out[id] = String(r.amountScaled || "0");
  }
  return out;
}
