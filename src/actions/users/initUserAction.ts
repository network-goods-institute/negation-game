"use server";

import { getUserId } from "@/actions/users/getUserId";
import { usersTable } from "@/db/schema";
import { InsertUser } from "@/db/tables/usersTable";
import { db } from "@/services/db";

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

    const query = db
      .insert(usersTable)
      .values({ username, id: userId })
      .onConflictDoNothing()
      .returning();
    console.warn("[initUserAction] SQL query:", query.toSQL());

    const result = await query;
    console.warn("[initUserAction] User creation result:", result);

    return result[0]!;
  } catch (error) {
    console.error("[initUserAction] Error creating user:", error);
    throw error;
  }
};
