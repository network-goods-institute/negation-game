"use server";

import { getUserId } from "@/actions/users/getUserId";
import { usersTable } from "@/db/schema";
import { InsertUser, createUserData, normalizeUsername } from "@/db/tables/usersTable";
import { db } from "@/services/db";
import { eq } from "drizzle-orm";

export const initUserAction = async ({
  username,
}: Pick<InsertUser, "username">) => {
  console.warn("[initUserAction] Initializing user with username:", username);

  try {
    const userId = await getUserId();
    console.warn("[initUserAction] Got user ID:", userId);

    if (!userId) {
      console.error("[initUserAction] Authentication error: No user ID found");
      throw new Error("Must be authenticated to initialize the user");
    }

    const userData = createUserData({ username, id: userId });
    
    let result = await db
      .insert(usersTable)
      .values(userData)
      .onConflictDoNothing()
      .returning();

    if (result.length === 0) {
      // No row inserted; check if user already exists by id (re-run)
      result = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);
      if (result.length === 0) {
        // If still not found, the conflict was likely on username
        const existingWithUsername = await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.usernameCanonical, normalizeUsername(username)))
          .limit(1);

        if (existingWithUsername.length > 0) {
          const err = new Error("USERNAME_TAKEN");
          // Surface a clear, machine-readable error to the client
          (err as any).code = "USERNAME_TAKEN";
          throw err;
        }
      }
    }

    console.warn("[initUserAction] User creation result:", result);

    if (result.length === 0) {
      throw new Error("Failed to create or find user");
    }

    return result[0];
  } catch (error) {
    console.error("[initUserAction] Error creating user:", error);
    throw error;
  }
};
