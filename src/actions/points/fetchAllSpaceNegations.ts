"use server";

import { getSpace } from "@/actions/spaces/getSpace";
import { negationsTable } from "@/db/schema";
import { db } from "@/services/db";
import { eq } from "drizzle-orm";

export interface SpaceNegation {
  olderPointId: number;
  newerPointId: number;
  createdBy: string | null;
  createdAt: Date;
}

export const fetchAllSpaceNegations = async (): Promise<SpaceNegation[]> => {
  const space = await getSpace();

  if (!space) {
    return [];
  }

  try {
    const negations = await db
      .select({
        olderPointId: negationsTable.olderPointId,
        newerPointId: negationsTable.newerPointId,
        createdBy: negationsTable.createdBy,
        createdAt: negationsTable.createdAt,
      })
      .from(negationsTable)
      .where(eq(negationsTable.space, space));

    return negations;
  } catch (error) {
    console.error("Error fetching space negations:", error);
    return [];
  }
};
