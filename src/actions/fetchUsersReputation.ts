"use server";

import { db } from "@/services/db";
import { sql } from "drizzle-orm";
import {
  restakesTable,
  slashesTable,
  doubtsTable,
  usersTable,
} from "@/db/schema";

export interface UserReputation {
  userId: string;
  username: string;
  reputation: number;
}

export const fetchUsersReputation = async (
  userIds: string[]
): Promise<Record<string, number>> => {
  if (userIds.length === 0) return {};

  const reputations = await db
    .select({
      userId: usersTable.id,
      reputation: sql<number>`
        ROUND(
          (
            -- Base score of 50
            50 +
            -- Self-slash ratio (+50 if they always self-slash when doubted)
            (50 * COALESCE(
              (
                SELECT CAST(COUNT(*) AS float) / NULLIF(
                  (
                    SELECT COUNT(*) 
                    FROM ${doubtsTable} d2 
                    WHERE d2.point_id IN (
                      SELECT point_id 
                      FROM ${restakesTable} r2 
                      WHERE r2.user_id = ${usersTable.id}
                    )
                  ),
                  0
                )
                FROM ${slashesTable} s
                WHERE s.user_id = ${usersTable.id}
                AND EXISTS (
                  SELECT 1 
                  FROM ${doubtsTable} d 
                  WHERE d.point_id = s.point_id 
                  AND d.negation_id = s.negation_id
                )
              ),
              0
            )) -
            -- Penalty for unresolved doubts (-50 if all doubts are unresolved)
            (50 * COALESCE(
              (
                SELECT CAST(COUNT(*) AS float) / NULLIF(
                  (
                    SELECT COUNT(*) 
                    FROM ${doubtsTable} d2 
                    WHERE d2.point_id IN (
                      SELECT point_id 
                      FROM ${restakesTable} r2 
                      WHERE r2.user_id = ${usersTable.id}
                    )
                  ),
                  0
                )
                FROM ${doubtsTable} d
                WHERE d.point_id IN (
                  SELECT point_id 
                  FROM ${restakesTable} r2 
                  WHERE r2.user_id = ${usersTable.id}
                )
                AND NOT EXISTS (
                  SELECT 1 
                  FROM ${slashesTable} s 
                  WHERE s.point_id = d.point_id 
                  AND s.negation_id = d.negation_id
                  AND s.user_id = ${usersTable.id}
                )
              ),
              0
            ))
          )
        )
      `.as("reputation"),
    })
    .from(usersTable)
    .where(sql`${usersTable.id} = ANY(${userIds})`);

  // Convert to a map of userId -> reputation for easy lookup
  return reputations.reduce(
    (acc, { userId, reputation }) => {
      acc[userId] = reputation;
      return acc;
    },
    {} as Record<string, number>
  );
};
