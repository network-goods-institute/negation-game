"use server";

import { db } from "@/services/db";
import { credEventsTable } from "@/db/schema";import { logger } from "@/lib/logger";

export type CredEventKind = "ENDORSE" | "RESTAKE" | "SLASH" | "DOUBT";

export async function trackCredEvent({
  userId,
  pointId,
  kind,
  amount,
}: {
  userId: string;
  pointId: number;
  kind: CredEventKind;
  amount: number;
}): Promise<void> {
  try {
    await db.insert(credEventsTable).values({
      userId,
      pointId,
      kind,
      amount,
    });

    logger.log(
      `[trackCredEvent] Tracked ${kind} event: user=${userId}, point=${pointId}, amount=${amount}`
    );
  } catch (error) {
    logger.error("[trackCredEvent] Failed to track cred event:", error);
    // Don't throw - we don't want to break the main action if event tracking fails
  }
}

export async function trackEndorseEvent(
  userId: string,
  pointId: number,
  amount: number
): Promise<void> {
  return trackCredEvent({ userId, pointId, kind: "ENDORSE", amount });
}

export async function trackRestakeEvent(
  userId: string,
  pointId: number,
  amount: number
): Promise<void> {
  return trackCredEvent({ userId, pointId, kind: "RESTAKE", amount });
}

export async function trackSlashEvent(
  userId: string,
  pointId: number,
  amount: number
): Promise<void> {
  return trackCredEvent({ userId, pointId, kind: "SLASH", amount });
}

export async function trackDoubtEvent(
  userId: string,
  pointId: number,
  amount: number
): Promise<void> {
  return trackCredEvent({ userId, pointId, kind: "DOUBT", amount });
}

/**
 * Track multiple events in a batch (more efficient for complex operations)
 */
export async function trackCredEventsBatch(
  events: Array<{
    userId: string;
    pointId: number;
    kind: CredEventKind;
    amount: number;
  }>
): Promise<void> {
  if (events.length === 0) return;

  try {
    await db.insert(credEventsTable).values(events);

    logger.log(`[trackCredEventsBatch] Tracked ${events.length} cred events`);
  } catch (error) {
    logger.error(
      "[trackCredEventsBatch] Failed to track cred events batch:",
      error
    );
    // Don't throw - we don't want to break the main action if event tracking fails
  }
}
