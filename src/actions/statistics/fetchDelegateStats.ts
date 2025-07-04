"use server";

import { db } from "@/services/db";
import {
  usersTable,
  pointsTable,
  viewpointsTable,
  endorsementsTable,
  credEventsTable,
} from "@/db/schema";
import { getUserId } from "@/actions/users/getUserId";
import { requireSpaceAdmin } from "@/utils/adminUtils";
import { sql } from "drizzle-orm";

export interface DelegateStats {
  userId: string;
  username: string;
  totalCred: number;
  pointsCreated: number;
  rationalesCreated: number;
  totalEndorsementsMade: number;
  totalCredEndorsed: number;
  pointsReceivingEndorsements: number;
  totalCredReceived: number;
  lastActive: string | null;
  joinedDate: string;
}

export async function fetchDelegateStats(
  spaceId: string
): Promise<DelegateStats[]> {
  const currentUserId = await getUserId();
  if (!currentUserId) {
    throw new Error("Must be authenticated to view delegate statistics");
  }

  await requireSpaceAdmin(currentUserId, spaceId);

  // Get all active users in the space with their basic stats
  const delegateStats = await db.execute(sql`
    WITH user_activity AS (
      SELECT 
        u.id as user_id,
        u.username,
        u.cred as total_cred,
        u.created_at as joined_date,
        -- Points created
        COALESCE(points_created.count, 0) as points_created,
        -- Rationales created
        COALESCE(rationales_created.count, 0) as rationales_created,
        -- Endorsements made
        COALESCE(endorsements_made.count, 0) as total_endorsements_made,
        COALESCE(endorsements_made.total_cred, 0) as total_cred_endorsed,
        -- Endorsements received
        COALESCE(endorsements_received.points_count, 0) as points_receiving_endorsements,
        COALESCE(endorsements_received.total_cred, 0) as total_cred_received,
        -- Last activity
        COALESCE(
          GREATEST(
            last_point.created_at,
            last_rationale.created_at,
            last_endorsement.created_at,
            last_cred_event.ts
          ),
          u.created_at
        ) as last_active
      FROM ${usersTable} u
      
      -- Points created by user
      LEFT JOIN (
        SELECT 
          created_by,
          COUNT(*) as count
        FROM ${pointsTable}
        WHERE space = ${spaceId} AND is_active = true
        GROUP BY created_by
      ) points_created ON u.id = points_created.created_by
      
      -- Rationales created by user
      LEFT JOIN (
        SELECT 
          created_by,
          COUNT(*) as count
        FROM ${viewpointsTable}
        WHERE space = ${spaceId} AND is_active = true
        GROUP BY created_by
      ) rationales_created ON u.id = rationales_created.created_by
      
      -- Endorsements made by user
      LEFT JOIN (
        SELECT 
          user_id,
          COUNT(*) as count,
          SUM(cred) as total_cred
        FROM ${endorsementsTable}
        WHERE space = ${spaceId} AND cred > 0
        GROUP BY user_id
      ) endorsements_made ON u.id = endorsements_made.user_id
      
      -- Endorsements received (on user's points)
      LEFT JOIN (
        SELECT 
          p.created_by,
          COUNT(DISTINCT e.point_id) as points_count,
          SUM(e.cred) as total_cred
        FROM ${pointsTable} p
        INNER JOIN ${endorsementsTable} e ON p.id = e.point_id
        WHERE p.space = ${spaceId} AND p.is_active = true AND e.cred > 0
        GROUP BY p.created_by
      ) endorsements_received ON u.id = endorsements_received.created_by
      
      -- Last point created
      LEFT JOIN (
        SELECT 
          created_by,
          MAX(created_at) as created_at
        FROM ${pointsTable}
        WHERE space = ${spaceId} AND is_active = true
        GROUP BY created_by
      ) last_point ON u.id = last_point.created_by
      
      -- Last rationale created
      LEFT JOIN (
        SELECT 
          created_by,
          MAX(created_at) as created_at
        FROM ${viewpointsTable}
        WHERE space = ${spaceId} AND is_active = true
        GROUP BY created_by
      ) last_rationale ON u.id = last_rationale.created_by
      
      -- Last endorsement made
      LEFT JOIN (
        SELECT 
          user_id,
          MAX(created_at) as created_at
        FROM ${endorsementsTable}
        WHERE space = ${spaceId}
        GROUP BY user_id
      ) last_endorsement ON u.id = last_endorsement.user_id
      
      -- Last cred event (broader activity)
      LEFT JOIN (
        SELECT 
          user_id,
          MAX(ts) as ts
        FROM ${credEventsTable} ce
        WHERE EXISTS (
          SELECT 1 FROM ${pointsTable} p 
          WHERE p.id = ce.point_id 
          AND p.space = ${spaceId}
        )
        GROUP BY user_id
      ) last_cred_event ON u.id = last_cred_event.user_id
      
      WHERE u.is_active = true
    )
    SELECT 
      user_id,
      username,
      total_cred,
      points_created,
      rationales_created,
      total_endorsements_made,
      total_cred_endorsed,
      points_receiving_endorsements,
      total_cred_received,
      last_active,
      joined_date
    FROM user_activity
    ORDER BY total_cred DESC, username ASC
  `);

  return (delegateStats as any[]).map((row: any) => ({
    userId: row.user_id,
    username: row.username,
    totalCred: Number(row.total_cred || 0),
    pointsCreated: Number(row.points_created || 0),
    rationalesCreated: Number(row.rationales_created || 0),
    totalEndorsementsMade: Number(row.total_endorsements_made || 0),
    totalCredEndorsed: Number(row.total_cred_endorsed || 0),
    pointsReceivingEndorsements: Number(row.points_receiving_endorsements || 0),
    totalCredReceived: Number(row.total_cred_received || 0),
    lastActive: row.last_active
      ? new Date(row.last_active).toISOString()
      : null,
    joinedDate: new Date(row.joined_date).toISOString(),
  }));
}
