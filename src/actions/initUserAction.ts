"use server";

import { getUserId } from "@/actions/getUserId";
import { usersTable } from "@/db/schema";
import { InsertUser } from "@/db/tables/usersTable";
import { db } from "@/services/db";

export const initUserAction = async ({
  username,
}: Pick<InsertUser, "username">) => {
  console.error("[initUserAction] Initializing user with username:", username);

  try {
    const userId = await getUserId();
    console.error("[initUserAction] Got user ID:", userId);

    if (!userId) {
      console.error("[initUserAction] Authentication error: No user ID found");
      throw new Error("Must be authenticated to initialize the user");
    }

    const query = db
      .insert(usersTable)
      .values({ username, id: userId })
      .returning();
    console.error("[initUserAction] SQL query:", query.toSQL());

    const result = await query;
    console.error("[initUserAction] User creation result:", result);

    return result[0]!;
  } catch (error) {
    console.error("[initUserAction] Error creating user:", error);
    throw error;
  }
};
