"use server";

import { getUserId } from "@/actions/getUserId";
import { usersTable } from "@/db/schema";
import { InsertUser } from "@/db/tables/usersTable";
import { db } from "@/services/db";

export const initUser = async ({ username }: Pick<InsertUser, "username">) => {
  const userId = await getUserId();

  if (!userId) {
    throw new Error("Must be authenticated to add a point");
  }

  return (
    await db.insert(usersTable).values({ username, id: userId }).returning()
  )[0]!;
};
