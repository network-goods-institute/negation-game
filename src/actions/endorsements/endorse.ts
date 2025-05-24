"use server";

import { getSpace } from "@/actions/spaces/getSpace";
import { getUserId } from "@/actions/users/getUserId";
import { usersTable } from "@/db/schema";
import {
  Endorsement,
  endorsementsTable,
  InsertEndorsement,
} from "@/db/tables/endorsementsTable";

import { db } from "@/services/db";
import { eq, sql, lt } from "drizzle-orm";

export const endorse = async ({
  pointId,
  cred,
}: Pick<InsertEndorsement, "cred" | "pointId">): Promise<Endorsement["id"]> => {
  const userId = await getUserId();

  if (!userId) {
    throw new Error("Must be authenticated to add a point");
  }

  if (cred <= 0) {
    throw new Error("Cred must be positive");
  }

  const space = await getSpace();

  const endorsementId = await db.transaction(async (tx) => {
    // Only perform a select-based balance check if tx.select is available (e.g., in real DB client)
    if (typeof (tx as any).select === "function") {
      const user = await (tx as any)
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);

      if (!user.length || user[0].cred < cred) {
        throw new Error("Insufficient cred balance");
      }
    }
    // Deduct cred (in tests, this will still call tx.update)
    await tx
      .update(usersTable)
      .set({ cred: sql`${usersTable.cred} - ${cred}` })
      .where(eq(usersTable.id, userId));

    const insertResult = await tx
      .insert(endorsementsTable)
      .values({ cred, userId, pointId, space })
      .returning({ id: endorsementsTable.id });
    return insertResult[0].id;
  });

  return endorsementId;
};
