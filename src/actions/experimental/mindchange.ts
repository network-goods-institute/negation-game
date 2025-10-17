"use server";

import { and, avg, count, eq } from "drizzle-orm";
import { db } from "@/services/db";
import { mpMindchangeTable } from "@/db/tables/mpMindchangeTable";
import { getUserId } from "@/actions/users/getUserId";

type Averages = { forward: number; backward: number; forwardCount: number; backwardCount: number };

const clip0to100 = (n: number) => {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
};

const isTruthyFlag = (v: string | undefined) => {
  const s = (v || "").toLowerCase().trim();
  return s === "true" || s === "1" || s === "yes" || s === "on";
};

const featureEnabled = () =>
  isTruthyFlag(process.env.ENABLE_MINDCHANGE) ||
  isTruthyFlag(process.env.NEXT_PUBLIC_ENABLE_MINDCHANGE);

export async function setMindchange(
  docId: string,
  edgeId: string,
  forwardValue?: number,
  backwardValue?: number
): Promise<{ ok: true; averages: Averages } | { ok: false; error: string }> {
  if (!featureEnabled()) return { ok: false, error: "Mindchange disabled" };
  if (!docId || !edgeId) return { ok: false, error: "Invalid ids" };

  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Unauthorized" };

  const fVal = typeof forwardValue === "number" ? clip0to100(forwardValue) : undefined;
  const bVal = typeof backwardValue === "number" ? clip0to100(backwardValue) : undefined;
  if (typeof fVal === "undefined" && typeof bVal === "undefined") {
    return { ok: false, error: "No values provided" };
  }

  await db
    .insert(mpMindchangeTable)
    .values({
      docId,
      edgeId,
      userId,
      forwardValue: fVal ?? 0,
      backwardValue: bVal ?? 0,
    })
    .onConflictDoUpdate({
      target: [mpMindchangeTable.docId, mpMindchangeTable.edgeId, mpMindchangeTable.userId],
      set: {
        ...(typeof fVal === "number" ? { forwardValue: fVal } : {}),
        ...(typeof bVal === "number" ? { backwardValue: bVal } : {}),
        updatedAt: new Date(),
      },
    });

  const rows = await db
    .select({
      fwd: avg(mpMindchangeTable.forwardValue),
      bwd: avg(mpMindchangeTable.backwardValue),
      fCount: count(mpMindchangeTable.forwardValue),
      bCount: count(mpMindchangeTable.backwardValue),
    })
    .from(mpMindchangeTable)
    .where(and(eq(mpMindchangeTable.docId, docId), eq(mpMindchangeTable.edgeId, edgeId)));

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

  // Phase 2: publish to Yjs meta key mindchange:<edgeId>

  return { ok: true, averages };
}

export async function getMindchangeBreakdown(docId: string, edgeId: string) {
  if (!featureEnabled()) return { forward: [], backward: [] };
  if (!docId || !edgeId) return { forward: [], backward: [] };

  const rows = await db
    .select({ userId: mpMindchangeTable.userId, forwardValue: mpMindchangeTable.forwardValue, backwardValue: mpMindchangeTable.backwardValue })
    .from(mpMindchangeTable)
    .where(and(eq(mpMindchangeTable.docId, docId), eq(mpMindchangeTable.edgeId, edgeId)));

  const forward = rows.map((r) => ({ userId: r.userId, username: r.userId, value: r.forwardValue }));
  const backward = rows.map((r) => ({ userId: r.userId, username: r.userId, value: r.backwardValue }));
  return { forward, backward };
}
