"use server";

import { usersTable } from "@/db/schema";
import { db } from "@/services/db";
import { eq } from "drizzle-orm";

export const fetchUser = async (id: string) => {
  return await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .limit(1)
    .then((result) => (result.length === 1 ? result[0] : null));
};
