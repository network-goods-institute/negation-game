"use server";

import { usersTable } from "@/db/schema";
import { normalizeUsername } from "@/db/tables/usersTable";
import { db } from "@/services/db";
import { eq, and } from "drizzle-orm";import { logger } from "@/lib/logger";

export const isUsernameAvailable = async (username: string) => {
  logger.warn("[isUsernameAvailable] Checking username:", username);
  try {
    const query = db
      .select()
      .from(usersTable)
      .where(
        and(
          eq(usersTable.usernameCanonical, normalizeUsername(username)),
          eq(usersTable.isActive, true)
        )
      )
      .limit(1);

    logger.warn("[isUsernameAvailable] SQL query:", query.toSQL());

    const result = await query;
    logger.warn("[isUsernameAvailable] Query result:", result);

    return result.length === 0;
  } catch (error) {
    logger.error("[isUsernameAvailable] Database error:", error);
    throw error;
  }
};
