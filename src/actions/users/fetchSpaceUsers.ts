"use server";

import { db } from "@/services/db";
import { usersTable } from "@/db/tables/usersTable";
import { viewpointsTable } from "@/db/tables/viewpointsTable";
import { pointsTable } from "@/db/tables/pointsTable";
import { endorsementsTable } from "@/db/tables/endorsementsTable";
import { restakesTable } from "@/db/tables/restakesTable";
import { slashesTable } from "@/db/tables/slashesTable";
import { doubtsTable } from "@/db/tables/doubtsTable";
import { sql, or, desc } from "drizzle-orm";

export async function fetchSpaceUsers(spaceId: string) {
  // Get users who have any activity in this space
  const results = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      cred: usersTable.cred,
      delegationUrl: usersTable.delegationUrl,
      agoraLink: usersTable.agoraLink,
      scrollDelegateLink: usersTable.scrollDelegateLink,
    })
    .from(usersTable)
    .where(
      or(
        // Users who have created viewpoints in this space
        sql`EXISTS (
          SELECT 1 FROM ${viewpointsTable} v 
          WHERE v.created_by = ${usersTable.id} 
          AND v.space = ${spaceId}
        )`,
        // Users who have created points in this space
        sql`EXISTS (
          SELECT 1 FROM ${pointsTable} p 
          WHERE p.created_by = ${usersTable.id} 
          AND p.space = ${spaceId}
        )`,
        // Users who have endorsed points in this space
        sql`EXISTS (
          SELECT 1 FROM ${endorsementsTable} e 
          JOIN ${pointsTable} p ON e.point_id = p.id 
          WHERE e.user_id = ${usersTable.id} 
          AND p.space = ${spaceId}
        )`,
        // Users who have restaked on points in this space
        sql`EXISTS (
          SELECT 1 FROM ${restakesTable} r 
          JOIN ${pointsTable} p ON r.point_id = p.id 
          WHERE r.user_id = ${usersTable.id} 
          AND p.space = ${spaceId}
        )`,
        // Users who have slashed restakes on points in this space
        sql`EXISTS (
          SELECT 1 FROM ${slashesTable} s 
          JOIN ${pointsTable} p ON s.point_id = p.id 
          WHERE s.user_id = ${usersTable.id} 
          AND p.space = ${spaceId}
        )`,
        // Users who have doubted restakes on points in this space
        sql`EXISTS (
          SELECT 1 FROM ${doubtsTable} d 
          JOIN ${pointsTable} p ON d.point_id = p.id 
          WHERE d.user_id = ${usersTable.id} 
          AND p.space = ${spaceId}
        )`
      )
    )
    .limit(100)
    .orderBy(desc(usersTable.cred));

  return results;
}
