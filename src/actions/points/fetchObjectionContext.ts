"use server";

import { db } from "@/services/db";
import { objectionsTable, pointsTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const fetchObjectionContext = async (
  objectionId: number,
  targetId: number
): Promise<number | null> => {
  try {
    const objection = await db
      .select({
        contextPointId: objectionsTable.contextPointId,
      })
      .from(objectionsTable)
      .where(
        and(
          eq(objectionsTable.objectionPointId, objectionId),
          eq(objectionsTable.targetPointId, targetId),
          eq(objectionsTable.isActive, true)
        )
      )
      .limit(1);

    return objection.length > 0 ? objection[0].contextPointId : null;
  } catch (error) {
    console.error("Error fetching objection context:", error);
    return null;
  }
};
