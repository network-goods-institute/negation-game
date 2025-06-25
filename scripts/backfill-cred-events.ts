/*
 * One-off back-fill:
 *   pnpm tsx scripts/backfill-cred-events.ts
 *
 * Reads historical data from endorsements, restake_history, slash_history,
 * doubt_history and inserts missing rows into cred_events so that the Δ-Score
 * daily snapshot pipeline has a complete ledger.
 */

import { config } from "dotenv";
import { backfillCredEvents } from "@/utils/backfillCredEvents";

// Ensure env vars from .env/.env.local are loaded, mirroring Next.js behaviour
config({ path: ".env.local" });

(async () => {
  try {
    console.time("backfill");
    const { inserted, cutoff } = await backfillCredEvents();
    console.timeEnd("backfill");

    if (cutoff) {
      console.log(
        `Inserted ${inserted} cred_events (< ${cutoff.toISOString()}) ✅`
      );
    } else {
      console.log(`Inserted ${inserted} cred_events (full history) ✅`);
    }

    await (await import("@/utils/backfillCredEvents")).closeBackfillDb();
  } catch (err) {
    console.error("Back-fill failed", err);
    process.exit(1);
  }
})();
