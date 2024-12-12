import { restakesTable, slashesTable, restakeHistoryTable } from "@/db/schema";
import { sql } from "drizzle-orm";
import { pgView } from "drizzle-orm/pg-core";

export const effectiveRestakesView = pgView("effective_restakes_view").as((qb) => 
  qb
    .select({
      userId: restakesTable.userId,
      pointId: restakesTable.pointId,
      negationId: restakesTable.negationId,
      originalAmount: restakesTable.amount,
      slashedAmount: sql<number>`
        COALESCE((
          SELECT SUM(${slashesTable.amount})
          FROM ${slashesTable}
          WHERE ${slashesTable.userId} = ${restakesTable.userId}
            AND ${slashesTable.pointId} = ${restakesTable.pointId}
            AND ${slashesTable.negationId} = ${restakesTable.negationId}
            AND ${slashesTable.active} = true
            AND ${slashesTable.createdAt} > (
              SELECT MAX(${restakeHistoryTable.createdAt})
              FROM ${restakeHistoryTable}
              WHERE ${restakeHistoryTable.pointId} = ${restakesTable.pointId}
                AND ${restakeHistoryTable.negationId} = ${restakesTable.negationId}
                AND ${restakeHistoryTable.userId} = ${restakesTable.userId}
            )
        ), 0)
      `.as("slashed_amount"),
      effectiveAmount: sql<number>`
        ${restakesTable.amount} - COALESCE((
          SELECT SUM(${slashesTable.amount})
          FROM ${slashesTable}
          WHERE ${slashesTable.userId} = ${restakesTable.userId}
            AND ${slashesTable.pointId} = ${restakesTable.pointId}
            AND ${slashesTable.negationId} = ${restakesTable.negationId}
            AND ${slashesTable.active} = true
        ), 0)
      `.as("effective_amount"),
      isActive: sql<boolean>`
        ${restakesTable.active} AND (
          ${restakesTable.amount} > COALESCE((
            SELECT SUM(${slashesTable.amount})
            FROM ${slashesTable}
            WHERE ${slashesTable.userId} = ${restakesTable.userId}
              AND ${slashesTable.pointId} = ${restakesTable.pointId}
              AND ${slashesTable.negationId} = ${restakesTable.negationId}
              AND ${slashesTable.active} = true
          ), 0)
        )
      `.as("is_active")
    })
    .from(restakesTable)
    .where(sql`${restakesTable.active} = true`)
); 