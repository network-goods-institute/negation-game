import postgres from "postgres";

/**
 * Cred event kinds used in the schema.
 */
export type CredEventKind = "ENDORSE" | "RESTAKE" | "SLASH" | "DOUBT";

export interface CredEventInsert {
  userId: string;
  pointId: number;
  kind: CredEventKind;
  amount: number;
  ts: Date;
}

let sql: ReturnType<typeof postgres> | null = null;

function delta(newAmt: number, prevAmt: number | null | undefined): number {
  return Math.max(0, newAmt - (prevAmt ?? 0));
}

export async function generateHistoricalCredEvents(cutoff?: Date) {
  if (!sql) {
    if (!process.env.POSTGRES_URL) {
      throw new Error("POSTGRES_URL environment variable is not defined");
    }
    sql = postgres(process.env.POSTGRES_URL, { prepare: false });
  }

  const toInsert: CredEventInsert[] = [];

  // 1. ENDORSE
  const endorsements = await sql`
    SELECT user_id, point_id, cred, created_at 
    FROM endorsements
    ${cutoff ? sql`WHERE created_at < ${cutoff}` : sql``}
    ORDER BY created_at ASC
  `;

  for (const e of endorsements) {
    if (e.cred > 0) {
      toInsert.push({
        userId: e.user_id as string,
        pointId: e.point_id as number,
        kind: "ENDORSE",
        amount: e.cred as number,
        ts: new Date(e.created_at as string),
      });
    }
  }

  // 2. RESTAKE (from restake_history)
  const restakeHistory = await sql`
    SELECT user_id, point_id, action, previous_amount, new_amount, created_at
    FROM restake_history
    WHERE action IN ('created', 'increased')
    ${cutoff ? sql`AND created_at < ${cutoff}` : sql``}
    ORDER BY created_at ASC
  `;

  for (const r of restakeHistory) {
    const deltaAmt = delta(r.new_amount as number, r.previous_amount as number);
    if (deltaAmt > 0) {
      toInsert.push({
        userId: r.user_id as string,
        pointId: r.point_id as number,
        kind: "RESTAKE",
        amount: deltaAmt,
        ts: new Date(r.created_at as string),
      });
    }
  }

  // 3. SLASH (from slash_history)
  const slashHistory = await sql`
    SELECT user_id, point_id, action, previous_amount, new_amount, created_at
    FROM slash_history
    WHERE action IN ('created', 'increased')
    ${cutoff ? sql`AND created_at < ${cutoff}` : sql``}
    ORDER BY created_at ASC
  `;

  for (const s of slashHistory) {
    const deltaAmt = delta(s.new_amount as number, s.previous_amount as number);
    if (deltaAmt > 0) {
      toInsert.push({
        userId: s.user_id as string,
        pointId: s.point_id as number,
        kind: "SLASH",
        amount: deltaAmt,
        ts: new Date(s.created_at as string),
      });
    }
  }

  // 4. DOUBT (from doubt_history)
  const doubtHistory = await sql`
    SELECT user_id, point_id, action, previous_amount, new_amount, created_at
    FROM doubt_history
    WHERE action IN ('created', 'increased')
    ${cutoff ? sql`AND created_at < ${cutoff}` : sql``}
    ORDER BY created_at ASC
  `;

  for (const d of doubtHistory) {
    const deltaAmt = delta(d.new_amount as number, d.previous_amount as number);
    if (deltaAmt > 0) {
      toInsert.push({
        userId: d.user_id as string,
        pointId: d.point_id as number,
        kind: "DOUBT",
        amount: deltaAmt,
        ts: new Date(d.created_at as string),
      });
    }
  }

  return toInsert;
}

export async function backfillCredEvents(cutoff?: Date) {
  console.log(
    `[backfillCredEvents] Starting with cutoff: ${cutoff?.toISOString() || "none"}`
  );

  const toInsert = await generateHistoricalCredEvents(cutoff);

  if (toInsert.length === 0) {
    console.log("[backfillCredEvents] No events to insert");
    return { inserted: 0, cutoff };
  }

  console.log(
    `[backfillCredEvents] Generated ${toInsert.length} events to insert`
  );

  if (!sql) {
    throw new Error("SQL connection not initialized");
  }

  const rows = toInsert.map((e) => [
    e.userId,
    e.pointId,
    e.kind,
    e.amount,
    e.ts,
  ]);

  const insertResult = await (sql as any)`
    INSERT INTO cred_events (user_id, point_id, kind, amount, ts)
    VALUES ${(sql as any)(rows)}
    ON CONFLICT ON CONSTRAINT cred_events_pkey DO NOTHING
  `;

  const inserted = Array.isArray(insertResult)
    ? insertResult.length
    : toInsert.length;
  console.log(`[backfillCredEvents] Inserted ${inserted} rows`);

  return { inserted, cutoff };
}

export async function closeBackfillDb() {
  if (sql) {
    await sql.end();
    sql = null;
  }
}

export function _deltaForTest(newAmt: number, prevAmt?: number | null) {
  return delta(newAmt, prevAmt);
}
