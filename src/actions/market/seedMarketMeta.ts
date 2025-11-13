"use server";

import * as Y from "yjs";
import { db } from "@/services/db";
import { mpDocsTable } from "@/db/tables/mpDocsTable";
import { mpDocUpdatesTable } from "@/db/tables/mpDocUpdatesTable";
import { getDocSnapshotBuffer } from "@/services/yjsCompaction";
import { getMarketView } from "@/actions/market/getMarketView";
import { resolveSlugToId } from "@/utils/slugResolver";
import { logger } from "@/lib/logger";

export interface SeedMarketResult {
  ok: boolean;
  prices: number;
  totals: number;
}

/**
 * Compute market view and persist it into the board's Yjs meta map so
 * all nodes have prices/totals available immediately after load.
 */
export async function seedMarketMeta(docId: string): Promise<SeedMarketResult> {
  const canonicalId = await resolveSlugToId(docId);

  const view = await getMarketView(canonicalId);
  const priceCount = Object.keys(view?.prices || {}).length;
  const totalCount = Object.keys(view?.totals || {}).length;

  // Load base snapshot
  const baseBuf = await getDocSnapshotBuffer(canonicalId);
  const baseDoc = new Y.Doc();
  if (baseBuf && baseBuf.byteLength) {
    try {
      Y.applyUpdate(baseDoc, new Uint8Array(baseBuf));
    } catch {}
  }

  // Apply updates on a working doc
  const doc = new Y.Doc();
  if (baseBuf && baseBuf.byteLength) {
    try {
      Y.applyUpdate(doc, new Uint8Array(baseBuf));
    } catch {}
  }

  const yMeta = doc.getMap<unknown>("meta");
  // Merge semantics: overwrite with fresh computation
  yMeta.set("market:prices", view?.prices || {});
  yMeta.set("market:totals", view?.totals || {});
  yMeta.set("market:docId", canonicalId);
  yMeta.set("market:updatedAt", view?.updatedAt || new Date().toISOString());

  const update = Y.encodeStateAsUpdate(doc, Y.encodeStateVector(baseDoc));
  if (!update || !update.byteLength) {
    return { ok: true, prices: priceCount, totals: totalCount };
  }

  await db
    .insert(mpDocsTable)
    .values({ id: canonicalId })
    .onConflictDoNothing();
  await db.insert(mpDocUpdatesTable).values({
    docId: canonicalId,
    updateBin: Buffer.from(update),
    userId: null,
  });

  try {
    logger.info?.("[market] seedMarketMeta", {
      docId: canonicalId,
      prices: priceCount,
      totals: totalCount,
    });
  } catch {}

  return { ok: true, prices: priceCount, totals: totalCount };
}
