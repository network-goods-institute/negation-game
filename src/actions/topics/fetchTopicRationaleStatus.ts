"use server";

import { db } from "@/services/db";
import { topicsTable, viewpointsTable, usersTable } from "@/db/schema";
import { getUserId } from "@/actions/users/getUserId";
import { requireSpaceAdmin } from "@/utils/adminUtils";
import { eq, and, sql } from "drizzle-orm";

export interface TopicRationaleStatus {
  topicId: number;
  topicName: string;
  users: {
    userId: string;
    username: string;
    hasPublishedRationale: boolean;
    rationaleCount: number;
  }[];
}

export async function fetchTopicRationaleStatus(
  spaceId: string,
  topicId?: number
): Promise<TopicRationaleStatus[]> {
  const currentUserId = await getUserId();
  if (!currentUserId) {
    throw new Error("Must be authenticated to view rationale status");
  }

  await requireSpaceAdmin(currentUserId, spaceId);

  // Get all users in the space
  const spaceUsers = await db
    .select({
      userId: usersTable.id,
      username: usersTable.username,
    })
    .from(usersTable)
    .where(eq(usersTable.isActive, true));

  // Get topics for this space
  const topics = topicId 
    ? await db
        .select({
          id: topicsTable.id,
          name: topicsTable.name,
        })
        .from(topicsTable)
        .where(and(eq(topicsTable.space, spaceId), eq(topicsTable.id, topicId)))
    : await db
        .select({
          id: topicsTable.id,
          name: topicsTable.name,
        })
        .from(topicsTable)
        .where(eq(topicsTable.space, spaceId));

  // Get rationale counts for each topic-user combination
  const rationaleStats = await db
    .select({
      topicId: viewpointsTable.topicId,
      createdBy: viewpointsTable.createdBy,
      rationaleCount: sql<number>`COUNT(*)`.as("rationaleCount"),
    })
    .from(viewpointsTable)
    .where(
      and(
        eq(viewpointsTable.space, spaceId),
        topicId ? eq(viewpointsTable.topicId, topicId) : sql`${viewpointsTable.topicId} IS NOT NULL`
      )
    )
    .groupBy(viewpointsTable.topicId, viewpointsTable.createdBy);

  // Build the result
  const result: TopicRationaleStatus[] = topics.map((topic: { id: number; name: string }) => {
    const users = spaceUsers.map((user) => {
      const userStats = rationaleStats.find(
        (stat) => stat.topicId === topic.id && stat.createdBy === user.userId
      );
      
      return {
        userId: user.userId,
        username: user.username,
        hasPublishedRationale: !!userStats && userStats.rationaleCount > 0,
        rationaleCount: userStats?.rationaleCount || 0,
      };
    });

    return {
      topicId: topic.id,
      topicName: topic.name,
      users: users.sort((a, b) => a.username.localeCompare(b.username)),
    };
  });

  return result;
}