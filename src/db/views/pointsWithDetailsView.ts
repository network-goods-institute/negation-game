import { endorsementsTable, negationsTable, pointsTable } from "@/db/schema";
import { InferSelectViewModel } from "../utils/InferSelectViewModel";
import { sql } from "drizzle-orm";
import { pgView } from "drizzle-orm/pg-core";

export const pointsWithDetailsView = pgView("point_with_details_view").as(
  (qb) =>
    qb
      .select({
        id: pointsTable.id,
        content: pointsTable.content,
        createdAt: pointsTable.createdAt,
        createdBy: pointsTable.createdBy,
        viewerCred: sql<number>`
        COALESCE((
          SELECT cred
          FROM ${endorsementsTable}
          WHERE point_id = ${pointsTable}.id
          AND user_id = current_user
        ), 0)
      `.as("viewer_cred"),
        amountNegations: sql<number>`
        COALESCE((
          SELECT COUNT(*)
          FROM (
            SELECT older_point_id AS point_id FROM ${negationsTable}
            UNION ALL
            SELECT newer_point_id AS point_id FROM ${negationsTable}
          ) sub
          WHERE point_id = ${pointsTable}.id
        ), 0)
      `
          .mapWith(Number)
          .as("amount_negations"),
        amountSupporters: sql<number>`
        COALESCE((
          SELECT COUNT(DISTINCT ${endorsementsTable.userId})
          FROM ${endorsementsTable}
          WHERE ${endorsementsTable.pointId} = ${pointsTable}.id
        ), 0)
      `
          .mapWith(Number)
          .as("amount_supporters"),
        cred: sql<number>`
        COALESCE((
          SELECT SUM(${endorsementsTable.cred})
          FROM ${endorsementsTable}
          WHERE ${endorsementsTable.pointId} = ${pointsTable}.id
        ), 0)
      `
          .mapWith(Number)
          .as("cred"),
        negationsCred: sql<number>`
        COALESCE((
          SELECT SUM(${endorsementsTable.cred})
          FROM ${endorsementsTable}
          WHERE ${endorsementsTable.pointId} IN (
            SELECT newer_point_id
            FROM ${negationsTable}
            WHERE older_point_id = ${pointsTable}.id
            UNION
            SELECT older_point_id
            FROM ${negationsTable}
            WHERE newer_point_id = ${pointsTable}.id
          )
        ), 0)
      `
          .mapWith(Number)
          .as("negations_cred"),
        negationIds: sql<number[]>`
          ARRAY(
            SELECT older_point_id
            FROM ${negationsTable}
            WHERE newer_point_id = ${pointsTable}.id
            UNION
            SELECT newer_point_id
            FROM ${negationsTable}
            WHERE older_point_id = ${pointsTable}.id
          )
        `.as("negation_ids"),
      })
      .from(pointsTable)
      .$dynamic()
);

export type PointWithDetails = InferSelectViewModel<
  typeof pointsWithDetailsView
> & {
  viewerCred?: number;
};
