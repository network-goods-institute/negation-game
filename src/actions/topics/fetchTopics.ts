"use server";

import { db } from "@/services/db";
import { topicsTable } from "@/db/tables/topicsTable";
import { viewpointsTable } from "@/db/tables/viewpointsTable";
import { usersTable } from "@/db/tables/usersTable";
import { asc, eq, sql } from "drizzle-orm";

export async function fetchTopics(space: string) {
  return db
    .select({
      id: topicsTable.id,
      name: topicsTable.name,
      space: topicsTable.space,
      discourseUrl: topicsTable.discourseUrl,
      restrictedRationaleCreation: topicsTable.restrictedRationaleCreation,
      closed: topicsTable.closed,
      createdAt: topicsTable.createdAt,
      rationalesCount: sql<number>`COUNT(${viewpointsTable.id})`
        .mapWith(Number)
        .as("rationalesCount"),
      latestRationaleAt: sql<Date>`MAX(${viewpointsTable.createdAt})`.as(
        "latestRationaleAt"
      ),
      earliestRationaleAt: sql<Date>`MIN(${viewpointsTable.createdAt})`.as(
        "earliestRationaleAt"
      ),
      latestAuthorUsername: sql<string>`(
        SELECT ${usersTable.username}
        FROM ${viewpointsTable} AS v
        JOIN ${usersTable} ON ${usersTable.id} = v.created_by
        WHERE v.topic_id = ${topicsTable.id}
        ORDER BY v.created_at DESC
        LIMIT 1
      )`
        .mapWith((v) => v as string | null)
        .as("latestAuthorUsername"),
    })
    .from(topicsTable)
    .leftJoin(viewpointsTable, eq(viewpointsTable.topicId, topicsTable.id))
    .where(eq(topicsTable.space, space))
    .groupBy(
      topicsTable.id, 
      topicsTable.name, 
      topicsTable.space,
      topicsTable.discourseUrl, 
      topicsTable.restrictedRationaleCreation,
      topicsTable.closed,
      topicsTable.createdAt
    )
    .orderBy(asc(topicsTable.name));
}
