"use server";

import { usersTable } from "@/db/schema";
import { db } from "@/services/db";
import { eq } from "drizzle-orm";

export const fetchAllUsers = async () => {
  return await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      cred: usersTable.cred,
      delegationUrl: usersTable.delegationUrl,
      agoraLink: usersTable.agoraLink,
      scrollDelegateLink: usersTable.scrollDelegateLink,
    })
    .from(usersTable)
    .where(eq(usersTable.isActive, true));
};
