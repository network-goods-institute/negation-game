"use server";

import { usersTable } from "@/db/schema";
import { db } from "@/services/db";
import { InferInsertModel } from "drizzle-orm";

export type User = InferInsertModel<typeof usersTable>;

export const fetchAllUsers = async (): Promise<User[]> => {
  return await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      cred: usersTable.cred,
      delegationUrl: usersTable.delegationUrl,
    })
    .from(usersTable);
};
