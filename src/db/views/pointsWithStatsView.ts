import { endorsementsTable, negationsTable, pointsTable } from "@/db/schema";
import { InferColumnsDataTypes, sql, InferModelFromColumns } from "drizzle-orm";
import { pgView } from "drizzle-orm/pg-core";

export const pointsWithStatsView = pgView("point_with_stats_view").as((qb) =>
  qb
    .select({
      id: pointsTable.id,
      content: pointsTable.content,
      createdAt: pointsTable.createdAt,
      createdBy: pointsTable.createdBy,
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
    })
    .from(pointsTable)
);