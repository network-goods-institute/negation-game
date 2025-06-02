"use server";

import { getSpace } from "@/actions/spaces/getSpace";
import { endorsementsTable, usersTable } from "@/db/schema";
import { db } from "@/services/db";
import { eq, and, sum } from "drizzle-orm";

export interface EndorsementDetail {
  userId: string;
  username: string;
  cred: number;
}

export const fetchPointEndorsementBreakdown = async (
  pointId: number
): Promise<EndorsementDetail[]> => {
  const space = await getSpace();
  return await db
    .select({
      userId: endorsementsTable.userId,
      cred: sum(endorsementsTable.cred).mapWith(Number),
      username: usersTable.username,
    })
    .from(endorsementsTable)
    .innerJoin(usersTable, eq(usersTable.id, endorsementsTable.userId))
    .where(
      and(
        eq(endorsementsTable.pointId, pointId),
        eq(endorsementsTable.space, space)
      )
    )
    .groupBy(endorsementsTable.userId, usersTable.username);
};
