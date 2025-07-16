"use server";

import {
  negationsTable,
  endorsementsTable,
  restakesTable,
  doubtsTable,
  viewpointsTable,
} from "@/db/schema";
import { db } from "@/services/db";
import { eq, or, and, sql } from "drizzle-orm";

export interface AffectedRelationship {
  type: "negation" | "endorsement" | "restake" | "doubt" | "viewpoint";
  id: number | string;
  relatedPointId?: number;
  userId?: string;
  amount?: number;
  description: string;
}

export const fetchAffectedRelationships = async (
  pointId: number
): Promise<AffectedRelationship[]> => {
  const relationships: AffectedRelationship[] = [];

  // 1. Find negations where this point is involved (as parent or child)
  const negations = await db
    .select({
      id: negationsTable.id,
      olderPointId: negationsTable.olderPointId,
      newerPointId: negationsTable.newerPointId,
    })
    .from(negationsTable)
    .where(
      or(
        eq(negationsTable.olderPointId, pointId),
        eq(negationsTable.newerPointId, pointId)
      )
    );

  negations.forEach((negation) => {
    const isParent = negation.olderPointId === pointId;
    const relatedPointId = isParent
      ? negation.newerPointId
      : negation.olderPointId;

    relationships.push({
      type: "negation",
      id: negation.id,
      relatedPointId,
      description: isParent
        ? `This point is negated by point ${relatedPointId}`
        : `This point negates point ${relatedPointId}`,
    });
  });

  // 2. Find endorsements on this point
  const endorsements = await db
    .select({
      id: endorsementsTable.id,
      userId: endorsementsTable.userId,
      cred: endorsementsTable.cred,
    })
    .from(endorsementsTable)
    .where(eq(endorsementsTable.pointId, pointId));

  endorsements.forEach((endorsement) => {
    relationships.push({
      type: "endorsement",
      id: endorsement.id,
      userId: endorsement.userId,
      amount: endorsement.cred,
      description: `User ${endorsement.userId} endorsed this point with ${endorsement.cred} cred`,
    });
  });

  // 3. Find restakes involving this point (as parent or negation)
  const restakes = await db
    .select({
      id: restakesTable.id,
      userId: restakesTable.userId,
      pointId: restakesTable.pointId,
      negationId: restakesTable.negationId,
      amount: restakesTable.amount,
    })
    .from(restakesTable)
    .where(
      or(
        eq(restakesTable.pointId, pointId),
        eq(restakesTable.negationId, pointId)
      )
    );

  restakes.forEach((restake) => {
    const isParent = restake.pointId === pointId;
    const relatedPointId = isParent ? restake.negationId : restake.pointId;

    relationships.push({
      type: "restake",
      id: restake.id,
      userId: restake.userId,
      relatedPointId,
      amount: restake.amount,
      description: isParent
        ? `User ${restake.userId} restaked ${restake.amount} cred from this point to point ${relatedPointId}`
        : `User ${restake.userId} restaked ${restake.amount} cred from point ${relatedPointId} to this point`,
    });
  });

  // 4. Find doubts involving this point (through restakes)
  const doubts = await db
    .select({
      id: doubtsTable.id,
      userId: doubtsTable.userId,
      pointId: doubtsTable.pointId,
      negationId: doubtsTable.negationId,
      amount: doubtsTable.amount,
    })
    .from(doubtsTable)
    .where(
      or(eq(doubtsTable.pointId, pointId), eq(doubtsTable.negationId, pointId))
    );

  doubts.forEach((doubt) => {
    const isParent = doubt.pointId === pointId;
    const relatedPointId = isParent ? doubt.negationId : doubt.pointId;

    relationships.push({
      type: "doubt",
      id: doubt.id,
      userId: doubt.userId,
      relatedPointId,
      amount: doubt.amount,
      description: isParent
        ? `User ${doubt.userId} doubted ${doubt.amount} cred on restakes from this point to point ${relatedPointId}`
        : `User ${doubt.userId} doubted ${doubt.amount} cred on restakes from point ${relatedPointId} to this point`,
    });
  });

  // 5. Find viewpoints (rationales) that include this point
  const viewpoints = await db
    .select({
      id: viewpointsTable.id,
      title: viewpointsTable.title,
      createdBy: viewpointsTable.createdBy,
    })
    .from(viewpointsTable)
    .where(
      and(
        sql`${viewpointsTable.graph}::text LIKE ${'%"pointId":' + pointId + "%"}`,
        eq(viewpointsTable.isActive, true)
      )
    );

  viewpoints.forEach((viewpoint) => {
    relationships.push({
      type: "viewpoint",
      id: viewpoint.id,
      userId: viewpoint.createdBy,
      description: `This point is included in rationale "${viewpoint.title}" by user ${viewpoint.createdBy}`,
    });
  });

  return relationships;
};
