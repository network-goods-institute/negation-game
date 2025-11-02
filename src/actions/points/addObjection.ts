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
import { Point } from "@/db/tables/pointsTable";
import { db } from "@/services/db";
import { waitUntil } from "@vercel/functions";
import { eq, sql, and, or } from "drizzle-orm";
import { POINT_MIN_LENGTH, getPointMaxLength } from "@/constants/config";import { logger } from "@/lib/logger";

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
  const backgroundJobs: Array<() => Promise<void>> = [];

  if (!userId) {
    throw new Error("Must be authenticated to add an objection");
  }

  // Validate content length (objections are regular points, not options)
  const trimmedContent = content.trim();
  const maxLength = getPointMaxLength(false);

  if (
    trimmedContent.length < POINT_MIN_LENGTH ||
    trimmedContent.length > maxLength
  ) {
    throw new Error(
      `Point content must be between ${POINT_MIN_LENGTH} and ${maxLength} characters`
    );
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
      and(
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
        ),
        eq(negationsTable.isActive, true)
      )
    );

  if (negationRelationship.length === 0) {
    throw new Error(
      "Cannot create objection: target point does not negate the context point"
    );
  }

  const parentEdgeId = negationRelationship[0].id;

  const objectionPointId = await db.transaction(async (tx) => {
    const objectionPointId = await tx
      .insert(pointsTable)
      .values({
        content: trimmedContent,
        createdBy: userId,
        space,
        isOption: false,
      })
      .returning({ id: pointsTable.id })
      .then(([{ id }]) => id);

    let endorsementId: number | null = null;
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
    }

    await tx.insert(objectionsTable).values({
      objectionPointId,
      targetPointId,
      contextPointId,
      parentEdgeId,
      endorsementId,
      createdBy: userId,
      space,
    });

    await tx.insert(negationsTable).values({
      olderPointId: Math.min(objectionPointId, targetPointId),
      newerPointId: Math.max(objectionPointId, targetPointId),
      createdBy: userId,
      space,
    });

    backgroundJobs.push(() =>
      addEmbedding({ content: trimmedContent, id: objectionPointId })
    );
    backgroundJobs.push(() =>
      addKeywords({ content: trimmedContent, id: objectionPointId })
    );

    return objectionPointId;
  });

  for (const job of backgroundJobs) {
    waitUntil(job());
  }

  return objectionPointId;
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
        contextPointId: sql<number>`
          CASE 
            WHEN ${negationsTable.olderPointId} = ${targetPointId} THEN ${negationsTable.newerPointId}
            ELSE ${negationsTable.olderPointId}
          END
        `,
        contextContent: pointsTable.content,
        negationId: negationsTable.id,
      })
      .from(negationsTable)
      .innerJoin(
        pointsTable,
        sql`${pointsTable.id} = CASE 
          WHEN ${negationsTable.olderPointId} = ${targetPointId} THEN ${negationsTable.newerPointId}
          ELSE ${negationsTable.olderPointId}
        END`
      )
      .where(
        and(
          or(
            eq(negationsTable.olderPointId, targetPointId),
            eq(negationsTable.newerPointId, targetPointId)
          ),
          eq(negationsTable.isActive, true)
        )
      )
      .limit(10);

    return {
      canCreateObjection: contexts.length > 0,
      availableContexts: contexts,
    };
  } catch (error) {
    logger.error("Error validating objection target:", error);
    return {
      canCreateObjection: false,
      availableContexts: [],
    };
  }
};
