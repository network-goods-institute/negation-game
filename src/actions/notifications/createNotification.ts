"use server";

import { getSpace } from "@/actions/spaces/getSpace";
import { notificationsTable, notificationPreferencesTable } from "@/db/schema";
import { db } from "@/services/db";
import { eq } from "drizzle-orm";
import type { InsertNotification } from "@/db/tables/notificationsTable";

export interface CreateNotificationArgs {
  userId: string;
  type: InsertNotification["type"];
  sourceUserId?: string;
  sourceEntityId?: string;
  sourceEntityType?: InsertNotification["sourceEntityType"];
  title: string;
  content?: string;
  aiSummary?: string;
  metadata?: Record<string, any>;
  space?: string;
}

export const createNotification = async ({
  userId,
  type,
  sourceUserId,
  sourceEntityId,
  sourceEntityType,
  title,
  content,
  aiSummary,
  metadata,
  space,
}: CreateNotificationArgs) => {
  const currentSpace = space || (await getSpace());

  if (sourceUserId === userId) {
    return null;
  }

  const preferences = await db
    .select()
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, userId))
    .limit(1);

  const userPrefs = preferences[0];

  const shouldNotify = checkNotificationPreference(type, userPrefs);
  if (!shouldNotify) {
    return null;
  }

  const [notification] = await db
    .insert(notificationsTable)
    .values({
      userId,
      type,
      sourceUserId,
      sourceEntityId,
      sourceEntityType,
      title,
      content,
      aiSummary,
      metadata,
      space: currentSpace,
    })
    .returning();

  return notification;
};

function checkNotificationPreference(
  type: InsertNotification["type"],
  preferences?: any
): boolean {
  if (!preferences) return true;

  switch (type) {
    case "endorsement":
      return preferences.endorsementNotifications ?? true;
    case "negation":
      return preferences.negationNotifications ?? true;
    case "restake":
    case "doubt":
    case "slash":
    case "doubt_reduction":
      return preferences.restakeNotifications ?? true;
    case "rationale_mention":
    case "viewpoint_published":
      return preferences.rationaleNotifications ?? true;
    case "message":
      return preferences.messageNotifications ?? true;
    case "scroll_proposal":
      return preferences.scrollProposalNotifications ?? false;
    default:
      return true;
  }
}
