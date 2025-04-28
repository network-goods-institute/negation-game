"use server";
import { getUserId } from "@/actions/getUserId";
import { usersTable } from "@/db/schema";
import { endorsementsTable } from "@/db/tables/endorsementsTable";
import { db } from "@/services/db";
import { eq, sql } from "drizzle-orm";

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
        eq(endorsementsTable.userId, userId) &&
          eq(endorsementsTable.pointId, pointId)
      )
      .orderBy(endorsementsTable.createdAt);

    if (!currentEndorsements.length) {
      throw new Error("Endorsement not found");
    }

    const totalCred = currentEndorsements.reduce(
      (sum, endorsement) => sum + endorsement.cred,
      0
    );
    if (amountToSell > totalCred) {
      throw new Error("Cannot sell more than the endorsed amount");
    }

    const totalEndorsed = currentEndorsements.reduce(
      (sum, e) => sum + e.cred,
      0
    );

    if (amountToSell > totalEndorsed) {
      throw new Error(
        `Cannot sell more endorsements than possessed. Attempted to sell: ${amountToSell}, Total endorsed: ${totalEndorsed}`
      );
    }

    const userUpdateResult = await tx
      .update(usersTable)
      .set({
        cred: sql`${usersTable.cred} + ${amountToSell}`,
      })
      .where(eq(usersTable.id, userId));

    const updatedUserData = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

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
        const updateResult = await tx
          .update(endorsementsTable)
          .set({ cred: newEndorsementCred })
          .where(eq(endorsementsTable.id, endorsement.id));
      } else {
        const deleteResult = await tx
          .delete(endorsementsTable)
          .where(eq(endorsementsTable.id, endorsement.id));
      }

      remainingToSell -= amountToDeductFromThis;
    }
  });

  const finalUserData = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
};
