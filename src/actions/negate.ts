"use server";

import { getSpace } from "@/actions/getSpace";
import { getUserId } from "@/actions/getUserId";
import { endorsementsTable, negationsTable, usersTable } from "@/db/schema";
import { Point } from "@/db/tables/pointsTable";
import { db } from "@/services/db";
import { eq, sql } from "drizzle-orm";

export interface NegateArgs {
  negatedPointId: Point["id"];
  counterpointId: Point["id"];
  cred?: number;
}

export const negate = async ({
  negatedPointId,
  counterpointId,
  cred = 0,
}: NegateArgs) => {
  const userId = await getUserId();
  const space = await getSpace();

  if (!userId) {
    throw new Error("Must be authenticated to add a point");
  }

  const newerPointId = Math.max(negatedPointId, counterpointId);
  const olderPointId = Math.min(negatedPointId, counterpointId);

  const negationId = await db.transaction(async (tx) => {
    if (cred > 0) {
      await tx
        .update(usersTable)
        .set({
          cred: sql`${usersTable.cred} - ${cred}`,
        })
        .where(eq(usersTable.id, userId));

      await tx.insert(endorsementsTable).values({
        cred,
        pointId: counterpointId,
        userId,
      });
    }

    return await tx
      .insert(negationsTable)
      .values({ createdBy: userId, newerPointId, olderPointId, space })
      .returning({ negationId: negationsTable.id })
      .then(([{ negationId }]) => negationId);
  });

  return negationId;
};
