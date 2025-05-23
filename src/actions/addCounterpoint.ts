"use server";

import { addEmbedding } from "@/actions/addEmbedding";
import { addKeywords } from "@/actions/addKeywords";
import { getSpace } from "@/actions/getSpace";
import { getUserId } from "@/actions/getUserId";
import {
  endorsementsTable,
  negationsTable,
  pointsTable,
  usersTable,
} from "@/db/schema";
import { InsertEndorsement } from "@/db/tables/endorsementsTable";
import { Negation } from "@/db/tables/negationsTable";
import { InsertPoint, Point } from "@/db/tables/pointsTable";
import { db } from "@/services/db";
import { waitUntil } from "@vercel/functions";
import { eq, sql } from "drizzle-orm";

export const addCounterpoint = async ({
  content,
  negatedPointId,
  cred = 0,
}: Omit<InsertPoint, "createdBy"> & {
  negatedPointId: Negation["olderPointId"];
} & Pick<InsertEndorsement, "cred">): Promise<Point["id"]> => {
  const userId = await getUserId();

  if (!userId) {
    throw new Error("Must be authenticated to add a point");
  }

  const space = await getSpace();

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

    await tx.insert(negationsTable).values({
      olderPointId: negatedPointId,
      newerPointId: newPointId,
      createdBy: userId,
    });

    waitUntil(addEmbedding({ content, id: newPointId }));
    waitUntil(addKeywords({ content, id: newPointId }));

    return newPointId;
  });
};
