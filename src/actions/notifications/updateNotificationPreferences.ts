"use server";

import { getUserId } from "@/actions/users/getUserId";
import { notificationPreferencesTable } from "@/db/schema";
import { db } from "@/services/db";
import { eq } from "drizzle-orm";
import type { NotificationPreferences } from "@/db/tables/notificationPreferencesTable";

export interface UpdateNotificationPreferencesArgs {
  endorsementNotifications?: boolean;
  negationNotifications?: boolean;
  restakeNotifications?: boolean;
  rationaleNotifications?: boolean;
  messageNotifications?: boolean;
  scrollProposalNotifications?: boolean;
  digestFrequency?: "none" | "daily" | "weekly";
}

export const updateNotificationPreferences = async (
  updates: UpdateNotificationPreferencesArgs
): Promise<NotificationPreferences> => {
  const userId = await getUserId();
  if (!userId) {
    throw new Error("Must be authenticated to update notification preferences");
  }

  const existingPrefs = await db
    .select()
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, userId))
    .limit(1);

  if (existingPrefs.length === 0) {
    const defaultPreferences = {
      userId,
      endorsementNotifications: true,
      negationNotifications: true,
      restakeNotifications: true,
      rationaleNotifications: true,
      messageNotifications: true,
      scrollProposalNotifications: false,
      digestFrequency: "daily" as const,
      ...updates,
      updatedAt: new Date(),
    };

    const [created] = await db
      .insert(notificationPreferencesTable)
      .values(defaultPreferences)
      .returning();

    return created;
  } else {
    const [updated] = await db
      .update(notificationPreferencesTable)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(notificationPreferencesTable.userId, userId))
      .returning();

    return updated;
  }
};
