"use server";

import { usersTable } from "@/db/schema";
import { normalizeUsername } from "@/db/tables/usersTable";
import { db } from "@/services/db";
import { eq, and } from "drizzle-orm";

export const isUsernameAvailable = async (username: string) => {
  console.warn("[isUsernameAvailable] Checking username:", username);
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

    console.warn("[isUsernameAvailable] SQL query:", query.toSQL());

    const result = await query;
    console.warn("[isUsernameAvailable] Query result:", result);

    return result.length === 0;
  } catch (error) {
    console.error("[isUsernameAvailable] Database error:", error);
    throw error;
  }
};
