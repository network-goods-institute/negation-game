"use server";

import { getUserId } from "@/actions/getUserId";
import {
  endorsementsTable,
  InsertEndorsement,
  InsertPoint,
  Point,
  pointsTable,
  usersTable,
} from "@/db/schema";
import { db } from "@/services/db";
import { eq, sql } from "drizzle-orm";

export const addPoint = async ({
  content,
  cred = 0,
}: Omit<InsertPoint, "createdBy"> & Pick<InsertEndorsement, "cred">): Promise<
  Point["id"]
> => {
  const userId = await getUserId();

  if (!userId) {
    throw new Error("Must be authenticated to add a point");
  }

  return await db.transaction(async (tx) => {
    const newPointId = await tx
      .insert(pointsTable)
      .values({ content, createdBy: userId })
      .returning({ id: pointsTable.id })
      .then(([{ id }]) => id);

    if (cred > 0) {
      await tx
        .update(usersTable)
        .set({
          cred: sql`${usersTable.cred} - ${cred}`,
        })
        .where(eq(usersTable.id, userId));

      await tx.insert(endorsementsTable).values({
        cred,
        pointId: newPointId,
        userId,
      });
    }

    return newPointId;
  });
};
