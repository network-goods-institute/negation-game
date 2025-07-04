"use server";

import { db } from "@/services/db";
import { rationaleAssignmentsTable, topicsTable } from "@/db/schema";
import { getUserId } from "@/actions/users/getUserId";
import { requireSpaceAdmin } from "@/utils/adminUtils";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function assignRationaleToUser(
  topicId: number,
  userId: string,
  promptMessage?: string
) {
  const currentUserId = await getUserId();
  if (!currentUserId) {
    throw new Error("Must be authenticated to assign rationales");
  }

  const topic = await db
    .select({ space: topicsTable.space })
    .from(topicsTable)
    .where(eq(topicsTable.id, topicId))
    .limit(1);

  if (!topic[0]) {
    throw new Error("Topic not found");
  }

  await requireSpaceAdmin(currentUserId, topic[0].space);

  // Check if assignment already exists
  const existing = await db
    .select()
    .from(rationaleAssignmentsTable)
    .where(
      and(
        eq(rationaleAssignmentsTable.topicId, topicId),
        eq(rationaleAssignmentsTable.userId, userId)
      )
    )
    .limit(1);

  if (existing[0]) {
    // Update existing assignment
    const [assignment] = await db
      .update(rationaleAssignmentsTable)
      .set({
        promptMessage,
        assignedBy: currentUserId,
      })
      .where(eq(rationaleAssignmentsTable.id, existing[0].id))
      .returning();

    return assignment;
  } else {
    // Create new assignment
    const [assignment] = await db
      .insert(rationaleAssignmentsTable)
      .values({
        id: nanoid(),
        topicId,
        userId,
        spaceId: topic[0].space,
        assignedBy: currentUserId,
        promptMessage,
      })
      .returning();

    return assignment;
  }
}

export async function removeRationaleAssignment(topicId: number, userId: string) {
  const currentUserId = await getUserId();
  if (!currentUserId) {
    throw new Error("Must be authenticated to remove assignments");
  }

  const topic = await db
    .select({ space: topicsTable.space })
    .from(topicsTable)
    .where(eq(topicsTable.id, topicId))
    .limit(1);

  if (!topic[0]) {
    throw new Error("Topic not found");
  }

  await requireSpaceAdmin(currentUserId, topic[0].space);

  await db
    .delete(rationaleAssignmentsTable)
    .where(
      and(
        eq(rationaleAssignmentsTable.topicId, topicId),
        eq(rationaleAssignmentsTable.userId, userId)
      )
    );

  return { success: true };
}

export async function fetchTopicAssignments(spaceId: string) {
  const currentUserId = await getUserId();
  if (!currentUserId) {
    throw new Error("Must be authenticated to view assignments");
  }

  await requireSpaceAdmin(currentUserId, spaceId);

  const assignments = await db
    .select({
      id: rationaleAssignmentsTable.id,
      topicId: rationaleAssignmentsTable.topicId,
      topicName: topicsTable.name,
      userId: rationaleAssignmentsTable.userId,
      promptMessage: rationaleAssignmentsTable.promptMessage,
      completed: rationaleAssignmentsTable.completed,
      completedAt: rationaleAssignmentsTable.completedAt,
      createdAt: rationaleAssignmentsTable.createdAt,
    })
    .from(rationaleAssignmentsTable)
    .leftJoin(topicsTable, eq(rationaleAssignmentsTable.topicId, topicsTable.id))
    .where(eq(rationaleAssignmentsTable.spaceId, spaceId))
    .orderBy(rationaleAssignmentsTable.createdAt);

  return assignments;
}

export async function fetchUserAssignments(userId: string) {
  const assignments = await db
    .select({
      id: rationaleAssignmentsTable.id,
      topicId: rationaleAssignmentsTable.topicId,
      topicName: topicsTable.name,
      spaceId: rationaleAssignmentsTable.spaceId,
      promptMessage: rationaleAssignmentsTable.promptMessage,
      completed: rationaleAssignmentsTable.completed,
      createdAt: rationaleAssignmentsTable.createdAt,
    })
    .from(rationaleAssignmentsTable)
    .leftJoin(topicsTable, eq(rationaleAssignmentsTable.topicId, topicsTable.id))
    .where(
      and(
        eq(rationaleAssignmentsTable.userId, userId),
        eq(rationaleAssignmentsTable.completed, false)
      )
    )
    .orderBy(rationaleAssignmentsTable.createdAt);

  return assignments;
}

export async function markAssignmentCompleted(assignmentId: string) {
  const currentUserId = await getUserId();
  if (!currentUserId) {
    throw new Error("Must be authenticated to complete assignments");
  }

  const [assignment] = await db
    .update(rationaleAssignmentsTable)
    .set({
      completed: true,
      completedAt: new Date(),
    })
    .where(
      and(
        eq(rationaleAssignmentsTable.id, assignmentId),
        eq(rationaleAssignmentsTable.userId, currentUserId)
      )
    )
    .returning();

  return assignment;
}