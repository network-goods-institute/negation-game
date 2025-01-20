import { restakesTable, slashesTable, doubtsTable } from "@/db/schema";
import { sql } from "drizzle-orm";
import { pgView } from "drizzle-orm/pg-core";

export const effectiveRestakesView = pgView("effective_restakes_view").as((qb) => 
  qb
    .select({
      userId: restakesTable.userId,
      pointId: restakesTable.pointId,
      negationId: restakesTable.negationId,
      amount: restakesTable.amount,
      slashedAmount: sql<number>`
        COALESCE((
          SELECT ${slashesTable.amount}
          FROM ${slashesTable}
          WHERE ${slashesTable.restakeId} = ${restakesTable.id}
          AND ${slashesTable.amount} > 0 
          AND ${slashesTable.createdAt} > ${restakesTable.createdAt}
        ), 0)
      `.as("slashed_amount"),
      doubtedAmount: sql<number>`
        COALESCE((
          SELECT SUM(${doubtsTable.amount})
          FROM ${doubtsTable}
          WHERE ${doubtsTable.pointId} = ${restakesTable.pointId}
          AND ${doubtsTable.negationId} = ${restakesTable.negationId}
        ), 0)
      `.as("doubted_amount"),
      effectiveAmount: sql<number>`
        GREATEST(0, ${restakesTable.amount} - 
          COALESCE((
            SELECT ${slashesTable.amount}
            FROM ${slashesTable}
            WHERE ${slashesTable.restakeId} = ${restakesTable.id}
            AND ${slashesTable.amount} > 0 
            AND ${slashesTable.createdAt} > ${restakesTable.createdAt}
          ), 0)
        )
      `.as("effective_amount"),
      isActive: sql<boolean>`
        ${restakesTable.amount} > (
          COALESCE((
            SELECT ${slashesTable.amount}
            FROM ${slashesTable}
            WHERE ${slashesTable.restakeId} = ${restakesTable.id}
            AND ${slashesTable.amount} > 0 
            AND ${slashesTable.createdAt} > ${restakesTable.createdAt}
          ), 0) +
          COALESCE((
            SELECT SUM(${doubtsTable.amount})
            FROM ${doubtsTable}
            WHERE ${doubtsTable.pointId} = ${restakesTable.pointId}
            AND ${doubtsTable.negationId} = ${restakesTable.negationId}
          ), 0)
        )
      `.as("is_active")
    })
    .from(restakesTable)
    .where(sql`${restakesTable.amount} > 0`)
); 