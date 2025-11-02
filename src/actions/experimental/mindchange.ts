"use server";

import { and, count, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/services/db";
import { mpMindchangeTable } from "@/db/tables/mpMindchangeTable";
import { getUserId } from "@/actions/users/getUserId";
import { usersTable } from "@/db/tables/usersTable";
import { isProductionEnvironment } from "@/utils/hosts";
import { isMindchangeEnabledServer } from "@/utils/featureFlags";import { logger } from "@/lib/logger";

type Averages = {
  forward: number;
  backward: number;
  forwardCount: number;
  backwardCount: number;
};

const clamp0to100 = (n: number) => {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
};

const toPositive = (v: number | undefined) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
  return clamp0to100(v);
};

export async function setMindchange(
  docId: string,
  edgeId: string,
  forwardValue?: number,
  backwardValue?: number,
  edgeType?: 'negation' | 'objection' | 'support',
  clientUserId?: string
): Promise<{ ok: true; averages: Averages } | { ok: false; error: string }> {
  if (!isMindchangeEnabledServer()) {
    return { ok: false, error: "Mindchange feature disabled" };
  }
  if (!docId || !edgeId) return { ok: false, error: "Invalid ids" };
  if (edgeType && edgeType !== 'negation' && edgeType !== 'objection') {
    return { ok: false, error: 'Mindchange only allowed on negation or objection edges' };
  }

  let userId = await getUserId();
  if (!userId) {
    if (!isProductionEnvironment()) {
      const fallback = (clientUserId || "anon").slice(0, 255);
      userId = fallback;
    } else {
      return { ok: false, error: "Unauthorized" };
    }
  }

  const fVal = toPositive(forwardValue);
  const bVal = toPositive(backwardValue);
  if (typeof fVal === "undefined" && typeof bVal === "undefined") {
    return { ok: false, error: "No values provided" };
  }

  await db
    .insert(mpMindchangeTable)
    .values({
      docId,
      edgeId,
      userId,
      forwardValue: typeof fVal === 'number' ? fVal : 0,
      backwardValue: typeof bVal === 'number' ? bVal : 0,
    })
    .onConflictDoUpdate({
      target: [
        mpMindchangeTable.docId,
        mpMindchangeTable.edgeId,
        mpMindchangeTable.userId,
      ],
      set: {
        ...(typeof fVal === "number" ? { forwardValue: fVal } : {}),
        ...(typeof bVal === "number" ? { backwardValue: bVal } : {}),
        updatedAt: new Date(),
      },
    });

  const rows = await db
    .select({
      // exclude zeros from averages and counts
      fwd: sql<number>`avg(NULLIF(${mpMindchangeTable.forwardValue}, 0))`,
      bwd: sql<number>`avg(NULLIF(${mpMindchangeTable.backwardValue}, 0))`,
      fCount: sql<number>`count(NULLIF(${mpMindchangeTable.forwardValue}, 0))`,
      bCount: sql<number>`count(NULLIF(${mpMindchangeTable.backwardValue}, 0))`,
    })
    .from(mpMindchangeTable)
    .where(
      and(
        eq(mpMindchangeTable.docId, docId),
        eq(mpMindchangeTable.edgeId, edgeId)
      )
    );

  const fwd = Number(rows?.[0]?.fwd ?? 0) || 0;
  const bwd = Number(rows?.[0]?.bwd ?? 0) || 0;
  const fCount = Number(rows?.[0]?.fCount ?? 0) || 0;
  const bCount = Number(rows?.[0]?.bCount ?? 0) || 0;

  const averages: Averages = {
    forward: Math.round(fwd),
    backward: Math.round(bwd),
    forwardCount: fCount,
    backwardCount: bCount,
  };
  try {
    logger.log("[Mindchange:set]", { docId, edgeId, averages });
  } catch {}

  // Note: Meta publishing is performed client-side after the action returns

  return { ok: true, averages };
}

export async function getMindchangeBreakdown(docId: string, edgeId: string) {
  if (!isMindchangeEnabledServer()) return { forward: [], backward: [] };
  if (!docId || !edgeId) return { forward: [], backward: [] };

  const rows = await db
    .select({
      userId: mpMindchangeTable.userId,
      username: usersTable.username,
      forwardValue: mpMindchangeTable.forwardValue,
      backwardValue: mpMindchangeTable.backwardValue,
    })
    .from(mpMindchangeTable)
    .leftJoin(usersTable, eq(usersTable.id, mpMindchangeTable.userId))
    .where(
      and(
        eq(mpMindchangeTable.docId, docId),
        eq(mpMindchangeTable.edgeId, edgeId)
      )
    );

  // exclude zeros from breakdowns
  const forward = rows
    .filter((r) => Number(r.forwardValue) !== 0)
    .map((r) => ({
      userId: r.userId,
      username: r.username || r.userId,
      value: r.forwardValue,
    }));
  const backward = rows
    .filter((r) => Number(r.backwardValue) !== 0)
    .map((r) => ({
      userId: r.userId,
      username: r.username || r.userId,
      value: r.backwardValue,
    }));
  try {
    const fAvg = forward.length
      ? Math.round(
          forward.reduce((a, b) => a + (Number(b.value) || 0), 0) /
            forward.length
        )
      : 0;
    const bAvg = backward.length
      ? Math.round(
          backward.reduce((a, b) => a + (Number(b.value) || 0), 0) /
            backward.length
        )
      : 0;
    logger.log("[Mindchange:breakdown]", {
      docId,
      edgeId,
      forwardCount: forward.length,
      backwardCount: backward.length,
      forwardAvg: fAvg,
      backwardAvg: bAvg,
    });
  } catch {}
  return { forward, backward };
}

export async function getMindchangeAveragesForEdges(
  docId: string,
  edgeIds: string[]
): Promise<
  Record<
    string,
    {
      forward: number;
      backward: number;
      forwardCount: number;
      backwardCount: number;
    }
  >
> {
  if (!isMindchangeEnabledServer()) return {};
  if (!docId || !edgeIds || edgeIds.length === 0) return {};

  const rows = await db
    .select({
      edgeId: mpMindchangeTable.edgeId,
      // exclude zeros from averages and counts
      fwd: sql<number>`avg(NULLIF(${mpMindchangeTable.forwardValue}, 0))`,
      bwd: sql<number>`avg(NULLIF(${mpMindchangeTable.backwardValue}, 0))`,
      fCount: sql<number>`count(NULLIF(${mpMindchangeTable.forwardValue}, 0))`,
      bCount: sql<number>`count(NULLIF(${mpMindchangeTable.backwardValue}, 0))`,
    })
    .from(mpMindchangeTable)
    .where(
      and(
        eq(mpMindchangeTable.docId, docId),
        inArray(mpMindchangeTable.edgeId, edgeIds)
      )
    )
    .groupBy(mpMindchangeTable.edgeId);

  const out: Record<
    string,
    {
      forward: number;
      backward: number;
      forwardCount: number;
      backwardCount: number;
    }
  > = {};
  for (const r of rows as any[]) {
    const eid = String(r.edgeId);
    out[eid] = {
      forward: Math.round(Number(r.fwd || 0)),
      backward: Math.round(Number(r.bwd || 0)),
      forwardCount: Number(r.fCount || 0),
      backwardCount: Number(r.bCount || 0),
    };
  }
  try {
    logger.log("[Mindchange:seed-averages]", {
      docId,
      edges: Object.keys(out).length,
    });
  } catch {}
  return out;
}

export async function deleteMindchangeForEdge(
  docId: string,
  edgeId: string
): Promise<{ ok: true }> {
  if (!isMindchangeEnabledServer()) return { ok: true };
  if (!docId || !edgeId) return { ok: true };
  await db
    .delete(mpMindchangeTable)
    .where(
      and(
        eq(mpMindchangeTable.docId, docId),
        eq(mpMindchangeTable.edgeId, edgeId)
      )
    );
  return { ok: true };
}
