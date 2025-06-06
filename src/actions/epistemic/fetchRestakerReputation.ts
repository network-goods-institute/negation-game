"use server";

import { db } from "@/services/db";
import { and, eq, sql } from "drizzle-orm";
import {
  restakesTable,
  slashesTable,
  doubtsTable,
  usersTable,
} from "@/db/schema";
import { sqids } from "@/services/sqids";

export type RestakerReputation = {
  username: string | null;
  userId: string;
  hashedUserId: string;
  amount: number;
  reputation: number;
};

export const fetchRestakerReputation = async (
  pointId: number,
  negationId: number
) => {
  // Get all active restakers for this point-negation pair
  const restakers = await db
    .select({
      username: usersTable.username,
      userId: sql<string>`r.user_id`.as("user_id"),
      amount: sql<number>`SUM(r.amount)`.as("amount"),
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
                      WHERE r2.user_id = r.user_id
                    )
                  ),
                  0
                )
                FROM ${slashesTable} s
                WHERE s.user_id = r.user_id
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
                      WHERE r2.user_id = r.user_id
                    )
                  ),
                  0
                )
                FROM ${doubtsTable} d
                WHERE d.point_id IN (
                  SELECT point_id 
                  FROM ${restakesTable} r2 
                  WHERE r2.user_id = r.user_id
                )
                AND NOT EXISTS (
                  SELECT 1 
                  FROM ${slashesTable} s 
                  WHERE s.point_id = d.point_id 
                  AND s.negation_id = d.negation_id
                  AND s.user_id = r.user_id
                )
              ),
              0
            ))
          )
        )
      `.as("reputation"),
    })
    .from(sql`${restakesTable} r`)
    .leftJoin(usersTable, eq(usersTable.id, sql`r.user_id`))
    .where(
      and(eq(sql`r.point_id`, pointId), eq(sql`r.negation_id`, negationId))
    )
    .groupBy(sql`r.user_id`, usersTable.username);

  const restakersWithHashedIds = restakers.map((r) => ({
    username: r.username,
    userId: r.userId,
    hashedUserId: sqids.encode([
      r.userId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0),
    ]),
    amount: r.amount,
    reputation: r.reputation,
  }));

  const totalAmount = restakersWithHashedIds.reduce(
    (sum, r) => sum + r.amount,
    0
  );
  const aggregateReputation =
    totalAmount > 0
      ? Math.round(
          restakersWithHashedIds.reduce(
            (sum, r) => sum + r.reputation * r.amount,
            0
          ) / totalAmount
        )
      : 50; // Default to 50% if no restakers, although this should never happen

  return {
    restakers: restakersWithHashedIds,
    aggregateReputation,
  };
};
