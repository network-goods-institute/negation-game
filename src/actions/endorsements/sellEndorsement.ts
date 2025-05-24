"use server";
import { getUserId } from "@/actions/users/getUserId";
import { usersTable } from "@/db/schema";
import { endorsementsTable } from "@/db/tables/endorsementsTable";
import { db } from "@/services/db";
import { eq, sql, and, gt } from "drizzle-orm";

export const sellEndorsement = async ({
  pointId,
  amountToSell,
}: {
  pointId: number;
  amountToSell: number;
}): Promise<void> => {
  const userId = await getUserId();

  if (!userId) {
    throw new Error("Must be authenticated to sell an endorsement");
  }

  if (amountToSell <= 0) {
    throw new Error("Amount to sell must be positive");
  }

  const userData = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  await db.transaction(async (tx) => {
    const currentEndorsements = await tx
      .select()
      .from(endorsementsTable)
      .where(
        and(
          eq(endorsementsTable.userId, userId),
          eq(endorsementsTable.pointId, pointId),
          gt(endorsementsTable.cred, 0)
        )
      )
      .orderBy(endorsementsTable.createdAt);

    if (!currentEndorsements.length) {
      throw new Error("No active endorsements found");
    }

    const totalCred = currentEndorsements.reduce(
      (sum, endorsement) => sum + endorsement.cred,
      0
    );

    if (amountToSell > totalCred) {
      throw new Error(
        `Cannot sell more than the endorsed amount. Available: ${totalCred}, Attempted to sell: ${amountToSell}`
      );
    }

    await tx
      .update(usersTable)
      .set({
        cred: sql`${usersTable.cred} + ${amountToSell}`,
      })
      .where(eq(usersTable.id, userId));

    let remainingToSell = amountToSell;

    for (const endorsement of currentEndorsements) {
      if (remainingToSell <= 0) break;

      const currentEndorsementCred = endorsement.cred;
      const amountToDeductFromThis = Math.min(
        remainingToSell,
        currentEndorsementCred
      );
      const newEndorsementCred =
        currentEndorsementCred - amountToDeductFromThis;

      if (newEndorsementCred > 0) {
        await tx
          .update(endorsementsTable)
          .set({ cred: newEndorsementCred })
          .where(eq(endorsementsTable.id, endorsement.id));
      } else {
        await tx
          .delete(endorsementsTable)
          .where(eq(endorsementsTable.id, endorsement.id));
      }

      remainingToSell -= amountToDeductFromThis;
    }

    await tx
      .delete(endorsementsTable)
      .where(
        and(
          eq(endorsementsTable.userId, userId),
          eq(endorsementsTable.pointId, pointId),
          eq(endorsementsTable.cred, 0)
        )
      );
  });
};
