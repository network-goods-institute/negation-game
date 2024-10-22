"use server";

import { lower } from "@/db/operators";
import { usersTable } from "@/db/schema";
import { db } from "@/services/db";
import { eq } from "drizzle-orm";

export const isUsernameAvailable = async (username: string) => {
  return await db
    .select()
    .from(usersTable)
    .where(eq(lower(usersTable.username), username.toLowerCase()))
    .limit(1)
    .then((result) => result.length === 0);
};
