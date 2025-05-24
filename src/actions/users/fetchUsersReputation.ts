"use server";

import postgres from "postgres";

const client = postgres(process.env.POSTGRES_URL!, {
  prepare: false,
});

export interface UserReputation {
  userId: string;
  username: string;
  reputation: number;
}

export const fetchUsersReputation = async (
  userIds: string[]
): Promise<Record<string, number>> => {
  if (userIds.length === 0) return {};

  try {
    const rows = await client`
      WITH user_stats AS (
        SELECT 
          r.user_id,
          COUNT(DISTINCT s.id) as slash_count,
          COUNT(DISTINCT d.id) as doubt_count,
          COUNT(DISTINCT CASE WHEN NOT EXISTS (
            SELECT 1 FROM slashes s2 
            WHERE s2.point_id = d.point_id 
            AND s2.negation_id = d.negation_id 
            AND s2.user_id = r.user_id
          ) THEN d.id END) as unresolved_count
        FROM restakes r
        LEFT JOIN doubts d ON 
          d.point_id = r.point_id AND 
          d.negation_id = r.negation_id
        LEFT JOIN slashes s ON 
          s.point_id = r.point_id AND
          s.negation_id = r.negation_id AND
          s.user_id = r.user_id
        GROUP BY r.user_id
      )
      SELECT 
        u.id as "userId",
        CASE 
          WHEN NOT EXISTS (
            SELECT 1 FROM restakes r2 WHERE r2.user_id = u.id
          ) THEN 50
          ELSE (
            50 + COALESCE(
              (
                SELECT 
                  CASE 
                    WHEN doubt_count = 0 THEN 0
                    ELSE CAST(slash_count AS float) * 50 / doubt_count
                  END
                FROM user_stats
                WHERE user_id = u.id
              ),
              0
            ) - COALESCE(
              (
                SELECT 
                  CASE 
                    WHEN doubt_count = 0 THEN 0
                    ELSE CAST(unresolved_count AS float) * 50 / doubt_count
                  END
                FROM user_stats
                WHERE user_id = u.id
              ),
              0
            )
          )
        END as "reputation"
      FROM users u
      WHERE u.id = ANY(${userIds})
    `;

    const result: Record<string, number> = {};

    for (const row of rows) {
      const dbRow = row as Record<string, any>;

      const userId =
        dbRow.userId || dbRow.user_id || dbRow.userid || dbRow["userId"];

      const reputationValue = dbRow.reputation;

      if (userId) {
        if (reputationValue === null || reputationValue === undefined) {
          result[userId] = 50;
        } else {
          const reputation = Number(reputationValue);
          result[userId] = !isNaN(reputation) ? reputation : 50;
        }
      }
    }
    return result;
  } catch (error) {
    return {};
  }
};
