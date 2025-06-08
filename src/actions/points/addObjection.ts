"use server";

import { addEmbedding } from "@/actions/ai/addEmbedding";
import { addKeywords } from "@/actions/ai/addKeywords";
import { getSpace } from "@/actions/spaces/getSpace";
import { getUserId } from "@/actions/users/getUserId";
import {
  endorsementsTable,
  negationsTable,
  objectionsTable,
  pointsTable,
  usersTable,
} from "@/db/schema";
import { InsertEndorsement } from "@/db/tables/endorsementsTable";
import { InsertPoint, Point } from "@/db/tables/pointsTable";
import { db } from "@/services/db";
import { waitUntil } from "@vercel/functions";
import { eq, sql, and, or } from "drizzle-orm";

export interface AddObjectionArgs {
  content: string;
  targetPointId: number;
  contextPointId: number;
  cred?: number;
}

export const addObjection = async ({
  content,
  targetPointId,
  contextPointId,
  cred = 0,
}: AddObjectionArgs): Promise<Point["id"]> => {
  const userId = await getUserId();

  if (!userId) {
    throw new Error("Must be authenticated to add an objection");
  }

  const space = await getSpace();

  // First, validate that target point actually negates context point
  const negationRelationship = await db
    .select({
      id: negationsTable.id,
      olderPointId: negationsTable.olderPointId,
      newerPointId: negationsTable.newerPointId,
    })
    .from(negationsTable)
    .where(
      or(
        and(
          eq(
            negationsTable.olderPointId,
            Math.min(targetPointId, contextPointId)
          ),
          eq(
            negationsTable.newerPointId,
            Math.max(targetPointId, contextPointId)
          )
        )
      )
    );

  if (negationRelationship.length === 0) {
    throw new Error(
      "Cannot create objection: target point does not negate the context point"
    );
  }

  const parentEdgeId = negationRelationship[0].id;

  return await db.transaction(async (tx) => {
    // Create the objection point
    const objectionPointId = await tx
      .insert(pointsTable)
      .values({ content, createdBy: userId, space })
      .returning({ id: pointsTable.id })
      .then(([{ id }]) => id);

    // Create endorsement if cred > 0
    let endorsementId: number;
    if (cred > 0) {
      await tx
        .update(usersTable)
        .set({
          cred: sql`${usersTable.cred} - ${cred}`,
        })
        .where(eq(usersTable.id, userId));

      endorsementId = await tx
        .insert(endorsementsTable)
        .values({
          cred,
          pointId: objectionPointId,
          userId,
          space,
        })
        .returning({ id: endorsementsTable.id })
        .then(([{ id }]) => id);
    } else {
      // Create a zero-cred endorsement for consistency
      endorsementId = await tx
        .insert(endorsementsTable)
        .values({
          cred: 0,
          pointId: objectionPointId,
          userId,
          space,
        })
        .returning({ id: endorsementsTable.id })
        .then(([{ id }]) => id);
    }

    // Create the objection relationship
    await tx.insert(objectionsTable).values({
      objectionPointId,
      targetPointId,
      contextPointId,
      parentEdgeId,
      endorsementId,
      createdBy: userId,
      space,
    });

    // Create the negation relationship (objection point negates target point)
    await tx.insert(negationsTable).values({
      olderPointId: Math.min(objectionPointId, targetPointId),
      newerPointId: Math.max(objectionPointId, targetPointId),
      space,
    });

    waitUntil(addEmbedding({ content, id: objectionPointId }));
    waitUntil(addKeywords({ content, id: objectionPointId }));

    return objectionPointId;
  });
};

export interface ValidateObjectionTargetResult {
  canCreateObjection: boolean;
  availableContexts: Array<{
    contextPointId: number;
    contextContent: string;
    negationId: number;
  }>;
}

export const validateObjectionTarget = async (
  targetPointId: number
): Promise<ValidateObjectionTargetResult> => {
  // Validate input
  if (!targetPointId || targetPointId <= 0) {
    return {
      canCreateObjection: false,
      availableContexts: [],
    };
  }

  try {
    // Find all points that this target point negates
    const contexts = await db
      .select({
        contextPointId: sql<number>`CASE 
          WHEN ${negationsTable.olderPointId} = ${targetPointId} 
          THEN ${negationsTable.newerPointId}
          ELSE ${negationsTable.olderPointId}
        END`.as("contextPointId"),
        contextContent: pointsTable.content,
        negationId: negationsTable.id,
      })
      .from(negationsTable)
      .innerJoin(
        pointsTable,
        sql`${pointsTable.id} = CASE 
          WHEN ${negationsTable.olderPointId} = ${targetPointId} 
          THEN ${negationsTable.newerPointId}
          ELSE ${negationsTable.olderPointId}
        END`
      )
      .where(
        or(
          eq(negationsTable.olderPointId, targetPointId),
          eq(negationsTable.newerPointId, targetPointId)
        )
      )
      .limit(10); // Limit results to prevent excessive data

    return {
      canCreateObjection: contexts.length > 0,
      availableContexts: contexts,
    };
  } catch (error) {
    console.error("Error validating objection target:", error);
    return {
      canCreateObjection: false,
      availableContexts: [],
    };
  }
};
