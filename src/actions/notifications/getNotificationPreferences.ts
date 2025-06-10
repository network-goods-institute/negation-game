"use server";

import { getUserId } from "@/actions/users/getUserId";
import { notificationPreferencesTable } from "@/db/schema";
import { db } from "@/services/db";
import { eq } from "drizzle-orm";
import type { NotificationPreferences } from "@/db/tables/notificationPreferencesTable";

export const getNotificationPreferences =
  async (): Promise<NotificationPreferences> => {
    const userId = await getUserId();
    if (!userId) {
      throw new Error("Must be authenticated to get notification preferences");
    }

    const preferences = await db
      .select()
      .from(notificationPreferencesTable)
      .where(eq(notificationPreferencesTable.userId, userId))
      .limit(1);

    if (preferences.length === 0) {
      const defaultPreferences: NotificationPreferences = {
        userId,
        endorsementNotifications: true,
        negationNotifications: true,
        restakeNotifications: true,
        rationaleNotifications: true,
        messageNotifications: true,
        scrollProposalNotifications: false,
        digestFrequency: "daily",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const [created] = await db
        .insert(notificationPreferencesTable)
        .values(defaultPreferences)
        .returning();

      return created;
    }

    return preferences[0];
  };
