"use server";

import { addEmbedding } from "@/actions/ai/addEmbedding";
import { addKeywords } from "@/actions/ai/addKeywords";
import { getSpace } from "@/actions/spaces/getSpace";
import { getUserId } from "@/actions/users/getUserId";
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
import { eq, sql, and, or } from "drizzle-orm";
import { POINT_MIN_LENGTH, getPointMaxLength } from "@/constants/config";

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

  // Validate content length (counterpoints are regular points, not options)
  const trimmedContent = content.trim();
  const maxLength = getPointMaxLength(false);
  
  if (trimmedContent.length < POINT_MIN_LENGTH || trimmedContent.length > maxLength) {
    throw new Error(
      `Point content must be between ${POINT_MIN_LENGTH} and ${maxLength} characters`
    );
  }

  const space = await getSpace();

  return await db.transaction(async (tx) => {
    const newPointId = await tx
      .insert(pointsTable)
      .values({ content: trimmedContent, createdBy: userId, space, isOption: false })
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
      space,
    });

    waitUntil(addEmbedding({ content: trimmedContent, id: newPointId }));
    waitUntil(addKeywords({ content: trimmedContent, id: newPointId }));

    return newPointId;
  });
};

export interface NegationRelationshipResult {
  negationId: number;
}

export const fetchNegationRelationship = async (
  point1Id: number,
  point2Id: number
): Promise<NegationRelationshipResult | null> => {
  const [negation] = await db
    .select({
      negationId: negationsTable.id,
    })
    .from(negationsTable)
    .where(
      and(
        or(
          and(
            eq(negationsTable.olderPointId, point1Id),
            eq(negationsTable.newerPointId, point2Id)
          ),
          and(
            eq(negationsTable.olderPointId, point2Id),
            eq(negationsTable.newerPointId, point1Id)
          )
        ),
        eq(negationsTable.isActive, true)
      )
    );

  return negation || null;
};
