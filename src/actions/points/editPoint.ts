"use server";

import { getUserId } from "@/actions/users/getUserId";
import { pointsTable, pointHistoryTable, pointActionEnum } from "@/db/schema";
import { db } from "@/services/db";
import { and, eq } from "drizzle-orm";
import { addEmbedding } from "@/actions/ai/addEmbedding";
import { addKeywords } from "@/actions/ai/addKeywords";
import { fetchAffectedRelationships } from "@/actions/points/fetchAffectedRelationships";
import { waitUntil } from "@vercel/functions";
import { revalidatePath } from "next/cache";
import { POINT_MIN_LENGTH, getPointMaxLength } from "@/constants/config";

export interface EditPointArgs {
  pointId: number;
  content: string;
}

export interface EditPointResult {
  pointId: number;
  affectedRelationships: any[];
}

export const editPoint = async ({
  pointId,
  content,
}: EditPointArgs): Promise<EditPointResult> => {
  const userId = await getUserId();

  if (!userId) {
    throw new Error("Must be authenticated to edit points");
  }

  if (!content.trim()) {
    throw new Error("Point content cannot be empty");
  }

  const trimmedContent = content.trim();

  return await db.transaction(async (tx) => {
    // First, get the current point to validate ownership and capture previous content
    const existingPoint = await tx
      .select({
        id: pointsTable.id,
        content: pointsTable.content,
        createdBy: pointsTable.createdBy,
        isActive: pointsTable.isActive,
        space: pointsTable.space,
        editCount: pointsTable.editCount,
        createdAt: pointsTable.createdAt,
        isOption: pointsTable.isOption,
      })
      .from(pointsTable)
      .where(and(eq(pointsTable.id, pointId), eq(pointsTable.isActive, true)))
      .limit(1);

    if (existingPoint.length === 0) {
      throw new Error("Point not found or has been deleted");
    }

    const point = existingPoint[0];

    // Check ownership
    if (point.createdBy !== userId) {
      throw new Error("You can only edit your own points");
    }

    // Validate content length using the point's isOption flag
    const maxLength = getPointMaxLength(point.isOption);
    if (trimmedContent.length < POINT_MIN_LENGTH || trimmedContent.length > maxLength) {
      throw new Error(
        `Point content must be between ${POINT_MIN_LENGTH} and ${maxLength} characters`
      );
    }

    // Check if content actually changed
    if (point.content === trimmedContent) {
      throw new Error("No changes were made to the point");
    }

    // Record the edit in history
    await tx.insert(pointHistoryTable).values({
      pointId: point.id,
      userId,
      action: "edited",
      previousContent: point.content,
      newContent: trimmedContent,
    });

    // Update the point
    const updateResult = await tx
      .update(pointsTable)
      .set({
        content: trimmedContent,
        isEdited: true,
        editedAt: new Date(),
        editedBy: userId,
        editCount: point.editCount + 1,
      })
      .where(eq(pointsTable.id, pointId))
      .returning({ id: pointsTable.id, space: pointsTable.space });

    if (updateResult.length === 0) {
      throw new Error("Failed to update point");
    }

    const updatedPoint = updateResult[0];

    // Update embeddings and keywords asynchronously
    waitUntil(addEmbedding({ content: trimmedContent, id: pointId }));
    waitUntil(addKeywords({ content: trimmedContent, id: pointId }));

    // Fetch affected relationships for impact visualization
    const affectedRelationships = await fetchAffectedRelationships(pointId);

    // Revalidate the space page to show updated content
    revalidatePath(`/s/${updatedPoint.space}`);

    return {
      pointId: updatedPoint.id,
      affectedRelationships,
    };
  });
};
