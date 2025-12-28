"use server";

import { eq } from "drizzle-orm";
import { usersTable } from "@/db/schema";
import { db } from "@/services/db";
import { getUserId } from "@/actions/users/getUserId";
import { logger } from "@/lib/logger";
import { invalidateUserCache } from "@/actions/users/fetchUser";

export const markTutorialVideoSeen = async () => {
  const userId = await getUserId();

  if (!userId) {
    logger.warn("[markTutorialVideoSeen] Missing authenticated user");
    return { ok: false, reason: "unauthenticated" } as const;
  }

  const now = new Date();

  try {
    const result = await db
      .update(usersTable)
      .set({ tutorialVideoSeenAt: now })
      .where(eq(usersTable.id, userId))
      .returning({ tutorialVideoSeenAt: usersTable.tutorialVideoSeenAt });

    if (result.length === 0) {
      logger.warn("[markTutorialVideoSeen] User not found", { userId });
      return { ok: false, reason: "not_found" } as const;
    }

    await invalidateUserCache(userId);
    return {
      ok: true,
      tutorialVideoSeenAt: result[0].tutorialVideoSeenAt ?? now,
    } as const;
  } catch (error) {
    logger.error("[markTutorialVideoSeen] Failed to update user", error);
    return { ok: false, reason: "error" } as const;
  }
};
