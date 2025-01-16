"use server";

import { getUserId } from "@/actions/getUserId";
import { db } from "@/services/db";
import { and, eq, sql, desc } from "drizzle-orm";
import { doubtsTable, endorsementsTable, restakesTable, usersTable } from "@/db/schema";

const calculateEarnings = (userId: string) => {
  return db
    .select({
      doubt_id: doubtsTable.id,
      point_id: doubtsTable.pointId,
      negation_id: doubtsTable.negationId,
      doubt_amount: doubtsTable.amount,
      createdAt: doubtsTable.createdAt,
      hours_since_payout: sql<number>`EXTRACT(EPOCH FROM (NOW() - ${doubtsTable.lastEarningsAt}))/3600`,
      negation_favor: sql<number>`COALESCE((
        SELECT favor 
        FROM point_favor_history
        WHERE point_id = ${doubtsTable.negationId}
        AND event_type = 'favor_queried'
        ORDER BY event_time DESC 
        LIMIT 1
      ), 0)`,
      hourly_rate: sql<number>`(EXP(LN(0.05) + LN(COALESCE((
        SELECT favor 
        FROM point_favor_history
        WHERE point_id = ${doubtsTable.negationId}
        AND event_type = 'favor_queried'
        ORDER BY event_time DESC 
        LIMIT 1
      ), 0) + 0.0001)) * ${doubtsTable.amount}) / (365 * 24)`,
      available_endorsement: sql<number>`(
        SELECT SUM(e.cred)
        FROM endorsements e
        WHERE e.point_id = ${doubtsTable.pointId}
        AND e.created_at <= ${sql.raw(`'${new Date().toISOString()}'`)}
        AND e.user_id IN (
          SELECT user_id 
          FROM restakes 
          WHERE point_id = ${doubtsTable.pointId}
          AND negation_id = ${doubtsTable.negationId}
          AND created_at <= ${sql.raw(`'${new Date().toISOString()}'`)}
        )
      )`
    })
    .from(doubtsTable)
    .where(eq(doubtsTable.userId, userId));
};

export const previewEarnings = async () => {
  const userId = await getUserId();
  if (!userId) {
    throw new Error("Must be authenticated to preview earnings");
  }

  const earningsQuery = await calculateEarnings(userId);
  
  let totalEarnings = 0;
  for (const doubt of earningsQuery) {
    const rawEarnings = doubt.hourly_rate * doubt.hours_since_payout;
    const earnings = Math.min(rawEarnings, doubt.available_endorsement);
    totalEarnings += earnings; // Keep decimals for preview
  }

  return totalEarnings;
};

export const collectEarnings = async () => {
  const userId = await getUserId();
  if (!userId) {
    throw new Error("Must be authenticated to collect earnings");
  }

  return await db.transaction(async (tx) => {
    const earningsQuery = await calculateEarnings(userId);
    console.log('Initial earnings query:', earningsQuery);

    let totalEarnings = 0;

    for (const doubt of earningsQuery) {
      const rawEarnings = doubt.hourly_rate * doubt.hours_since_payout;
      const earnings = Math.floor(Math.min(rawEarnings, doubt.available_endorsement));
      console.log('Processing doubt:', {
        doubtId: doubt.doubt_id,
        rawEarnings,
        earnings,
        hourlyRate: doubt.hourly_rate,
        hoursSinceLastPayout: doubt.hours_since_payout,
        availableEndorsement: doubt.available_endorsement
      });
      
      if (earnings > 0) { 
        const restakersEndorsements = await tx
          .select({
            user_id: endorsementsTable.userId,
            total_cred: sql<number>`SUM(${endorsementsTable.cred})`,
          })
          .from(endorsementsTable)
          .where(and(
            eq(endorsementsTable.pointId, doubt.point_id),
            sql`${endorsementsTable.createdAt} <= ${sql.raw(`'${doubt.createdAt.toISOString()}'`)}`,
            sql`${endorsementsTable.userId} IN (
              SELECT user_id 
              FROM ${restakesTable}
              WHERE point_id = ${doubt.point_id}
              AND negation_id = ${doubt.negation_id}
              AND created_at <= ${sql.raw(`'${doubt.createdAt.toISOString()}'`)}
            )`
          ))
          .groupBy(endorsementsTable.userId);

        console.log('Found restakers endorsements:', restakersEndorsements);

        let actuallyCollected = 0;
        let remainingEarnings = earnings;

        for (const endorsement of restakersEndorsements) {
          const proportion = endorsement.total_cred / doubt.available_endorsement;
          const deduction = endorsement === restakersEndorsements[restakersEndorsements.length - 1]
            ? remainingEarnings
            : Math.floor(earnings * proportion);

          console.log('Processing endorsement:', {
            userId: endorsement.user_id,
            totalCred: endorsement.total_cred,
            proportion,
            deduction,
            remainingEarnings
          });

          if (deduction > 0) {
            const userEndorsements = await tx
              .select()
              .from(endorsementsTable)
              .where(and(
                eq(endorsementsTable.pointId, doubt.point_id),
                eq(endorsementsTable.userId, endorsement.user_id),
                sql`${endorsementsTable.createdAt} <= ${sql.raw(`'${doubt.createdAt.toISOString()}'`)}`
              ))
              .orderBy(desc(endorsementsTable.cred));

            console.log('User endorsements found:', userEndorsements);

            let remainingDeduction = deduction;
            for (const e of userEndorsements) {
              const toDeduct = Math.min(remainingDeduction, e.cred);
              console.log('Deducting from endorsement:', {
                endorsementId: e.id,
                currentCred: e.cred,
                toDeduct,
                remainingDeduction
              });

              if (toDeduct > 0) {
                await tx
                  .update(endorsementsTable)
                  .set({ 
                    cred: e.cred - toDeduct
                  })
                  .where(and(
                    eq(endorsementsTable.pointId, doubt.point_id),
                    eq(endorsementsTable.id, e.id)
                  ));
                remainingDeduction -= toDeduct;
                actuallyCollected += toDeduct;
                remainingEarnings -= toDeduct;
                console.log('After deduction:', {
                  remainingDeduction,
                  actuallyCollected
                });
              }
              if (remainingDeduction <= 0) break;
            }
          }
        }

        console.log('Finished processing doubt:', {
          doubtId: doubt.doubt_id,
          actuallyCollected,
          totalEarnings
        });

        if (actuallyCollected > 0) {
          await tx
            .update(doubtsTable)
            .set({ 
              lastEarningsAt: sql`NOW()`
            })
            .where(eq(doubtsTable.id, doubt.doubt_id));

          await tx
            .update(usersTable)
            .set({
              cred: sql`${usersTable.cred} + ${actuallyCollected}`
            })
            .where(eq(usersTable.id, userId));

          totalEarnings += actuallyCollected;
          console.log('Updated last earnings at and total:', {
            doubtId: doubt.doubt_id,
            totalEarnings,
            addedToUser: actuallyCollected
          });
        }
      }
    }

    console.log('Final total earnings:', totalEarnings);
    return totalEarnings;
  });
}; 