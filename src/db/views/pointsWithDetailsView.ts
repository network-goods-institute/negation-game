import { endorsementsTable, negationsTable, pointsTable } from "@/db/schema";
import { InferSelectViewModel } from "@/db/utils/InferSelectViewModel";
import { sql, eq } from "drizzle-orm";
import { pgView } from "drizzle-orm/pg-core";

export const pointsWithDetailsView = pgView("point_with_details_view").as(
  (qb) =>
    qb
      .select({
        pointId: pointsTable.id,
        content: pointsTable.content,
        createdAt: pointsTable.createdAt,
        createdBy: pointsTable.createdBy,
        space: pointsTable.space,
        isCommand: pointsTable.isCommand,
        isActive: pointsTable.isActive,
        deletedAt: pointsTable.deletedAt,
        deletedBy: pointsTable.deletedBy,
        amountNegations: sql<number>`
        COALESCE((
          SELECT COUNT(*)
          FROM (
            SELECT ${negationsTable.olderPointId} AS point_id FROM ${negationsTable}
            WHERE ${negationsTable.isActive} = true
            UNION ALL
            SELECT ${negationsTable.newerPointId} AS point_id FROM ${negationsTable}
            WHERE ${negationsTable.isActive} = true
          ) sub
          WHERE sub.point_id = ${pointsTable.id}
        ), 0)
      `
          .mapWith(Number)
          .as("amount_negations"),
        amountSupporters: sql<number>`
        COALESCE((
          SELECT COUNT(DISTINCT ${endorsementsTable.userId})
          FROM ${endorsementsTable}
          WHERE ${endorsementsTable.pointId} = ${pointsTable.id}
        ), 0)
      `
          .mapWith(Number)
          .as("amount_supporters"),
        cred: sql<number>`
        COALESCE((
          SELECT SUM(${endorsementsTable.cred})
          FROM ${endorsementsTable}
          WHERE ${endorsementsTable.pointId} = ${pointsTable.id}
        ), 0)
      `
          .mapWith(Number)
          .as("cred"),
        negationsCred: sql<number>`
        COALESCE((
          SELECT SUM(${endorsementsTable.cred})
          FROM ${endorsementsTable}
          WHERE ${endorsementsTable.pointId} IN (
            SELECT ${negationsTable.newerPointId}
            FROM ${negationsTable}
            WHERE ${negationsTable.olderPointId} = ${pointsTable.id}
            AND ${negationsTable.isActive} = true
            UNION
            SELECT ${negationsTable.olderPointId}
            FROM ${negationsTable}
            WHERE ${negationsTable.newerPointId} = ${pointsTable.id}
            AND ${negationsTable.isActive} = true
          )
        ), 0)
      `
          .mapWith(Number)
          .as("negations_cred"),
        negationIds: sql<number[]>`
        ARRAY(
          SELECT ${negationsTable.olderPointId}
          FROM ${negationsTable}
          WHERE ${negationsTable.newerPointId} = ${pointsTable.id}
          AND ${negationsTable.isActive} = true
          UNION ALL
          SELECT ${negationsTable.newerPointId}
          FROM ${negationsTable}
          WHERE ${negationsTable.olderPointId} = ${pointsTable.id}
          AND ${negationsTable.isActive} = true
        )
      `.as("negation_ids"),
      })
      .from(pointsTable)
      .where(eq(pointsTable.isActive, true))
      .$dynamic()
);

export type PointWithDetails = InferSelectViewModel<
  typeof pointsWithDetailsView
>;
