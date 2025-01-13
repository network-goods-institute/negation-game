"use server";

import { getSpace } from "@/actions/getSpace";
import { getUserId } from "@/actions/getUserId";
import { usersTable } from "@/db/schema";
import {
  Endorsement,
  endorsementsTable,
  InsertEndorsement,
} from "@/db/tables/endorsementsTable";

import { db } from "@/services/db";
import { eq, sql } from "drizzle-orm";

export const endorse = async ({
  pointId,
  cred,
}: Pick<InsertEndorsement, "cred" | "pointId">): Promise<Endorsement["id"]> => {
  const userId = await getUserId();

  if (!userId) {
    throw new Error("Must be authenticated to add a point");
  }

  if (cred <= 0) throw new Error("Cred must be positive");

  const space = await getSpace();

  const endorsementId = await db.transaction(async (tx) => {
    await tx
      .update(usersTable)
      .set({
        cred: sql`${usersTable.cred} - ${cred}`,
      })
      .where(eq(usersTable.id, userId));

    return await tx
      .insert(endorsementsTable)
      .values({ cred, userId, pointId, space })
      .returning({ id: endorsementsTable.id })
      .then(([{ id }]) => id);
  });

  return endorsementId;
};
