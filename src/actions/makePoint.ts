"use server";

import { getUserId } from "@/actions/getUserId";
import { endorsementsTable, pointsTable, usersTable } from "@/db/schema";
import { db } from "@/services/db";
import { eq, sql } from "drizzle-orm";

import { addEmbedding } from "@/actions/addEmbedding";
import { addKeywords } from "@/actions/addKeywords";
import { getSpace } from "@/actions/getSpace";
import { InsertEndorsement } from "@/db/tables/endorsementsTable";
import { InsertPoint, Point } from "@/db/tables/pointsTable";
import { waitUntil } from "@vercel/functions";

export const makePoint = async ({
  content,
  cred = 0,
}: Omit<InsertPoint, "createdBy"> & Pick<InsertEndorsement, "cred">): Promise<
  Point["id"]
> => {
  const userId = await getUserId();
  const space = await getSpace();

  console.log({ space });

  if (!userId) {
    throw new Error("Must be authenticated to add a point");
  }

  return await db.transaction(async (tx) => {
    const newPointId = await tx
      .insert(pointsTable)
      .values({ content, createdBy: userId, space })
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
        space,
      });
    }

    waitUntil(addEmbedding({ content, id: newPointId }));
    waitUntil(addKeywords({ content, id: newPointId }));

    return newPointId;
  });
};
