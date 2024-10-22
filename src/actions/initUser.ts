"use server";

import { getUserId } from "@/actions/getUserId";
import { InsertUser, usersTable } from "@/db/schema";
import { db } from "@/services/db";

export const initUser = async ({ username }: Pick<InsertUser, "username">) => {
  const userId = await getUserId();

  if (!userId) {
    throw new Error("Must be authenticated to add a point");
  }

  await db.insert(usersTable).values({ username, id: userId });

  return;
};
