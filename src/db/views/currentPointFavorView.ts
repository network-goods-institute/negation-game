import { endorsementsTable, negationsTable, pointsTable } from "@/db/schema";
import { effectiveRestakesView } from "@/db/views/effectiveRestakesView";
import { InferSelectViewModel } from "@/db/utils/InferSelectViewModel";
import { sql } from "drizzle-orm";
import { pgView } from "drizzle-orm/pg-core";

export const currentPointFavorView = pgView("current_point_favor").as((qb) =>
  qb
    .select({
      pointId: pointsTable.id,
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
      restakeBonus: sql<number>`
        COALESCE((
          SELECT SUM(
            GREATEST(
              0,
              ${effectiveRestakesView.amount} - GREATEST(${effectiveRestakesView.slashedAmount}, ${effectiveRestakesView.doubtedAmount})
            )
          )
          FROM ${effectiveRestakesView}
          WHERE ${effectiveRestakesView.pointId} = ${pointsTable.id}
        ), 0)
      `
        .mapWith(Number)
        .as("restake_bonus"),
      favor: sql<number>`(
        CASE
          WHEN COALESCE((
            SELECT SUM(${endorsementsTable.cred})
            FROM ${endorsementsTable}
            WHERE ${endorsementsTable.pointId} = ${pointsTable.id}
          ), 0) = 0 THEN 0
          WHEN COALESCE((
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
          ), 0) = 0 THEN 100
          ELSE FLOOR(
            100.0 * COALESCE((
              SELECT SUM(${endorsementsTable.cred})
              FROM ${endorsementsTable}
              WHERE ${endorsementsTable.pointId} = ${pointsTable.id}
            ), 0) / 
            (
              COALESCE((
                SELECT SUM(${endorsementsTable.cred})
                FROM ${endorsementsTable}
                WHERE ${endorsementsTable.pointId} = ${pointsTable.id}
              ), 0) + 
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
            )
          )
        END
      ) + COALESCE((
        SELECT SUM(
          GREATEST(
            0, 
            ${effectiveRestakesView.amount} - GREATEST(${effectiveRestakesView.slashedAmount}, ${effectiveRestakesView.doubtedAmount})
          )
        )
        FROM ${effectiveRestakesView}
        WHERE ${effectiveRestakesView.pointId} = ${pointsTable.id}
      ), 0)::integer
      `
        .mapWith(Number)
        .as("favor"),
    })
    .from(pointsTable)
    .where(sql`${pointsTable.isActive} = true`)
);

export type CurrentPointFavor = InferSelectViewModel<
  typeof currentPointFavorView
>;
