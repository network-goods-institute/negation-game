import { restakesTable, slashesTable, doubtsTable } from "@/db/schema";
import { InferSelectViewModel } from "@/db/utils/InferSelectViewModel";
import { sql } from "drizzle-orm";
import { pgView } from "drizzle-orm/pg-core";

export const effectiveRestakesView = pgView("effective_restakes_view").as(
  (qb) =>
    qb
      .select({
        userId: restakesTable.userId,
        pointId: restakesTable.pointId,
        negationId: restakesTable.negationId,
        amount: restakesTable.amount,
        space: restakesTable.space,
        createdAt: restakesTable.createdAt,
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
          AND ${doubtsTable.createdAt} >= ${restakesTable.createdAt}
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
        availableForDoubts: sql<boolean>`
        ${restakesTable.amount} > COALESCE((
          SELECT ${slashesTable.amount}
          FROM ${slashesTable}
          WHERE ${slashesTable.restakeId} = ${restakesTable.id}
          AND ${slashesTable.amount} > 0 
          AND ${slashesTable.createdAt} > ${restakesTable.createdAt}
        ), 0)
      `.as("available_for_doubts"),
      })
      .from(restakesTable)
      .where(sql`"restakes"."amount" > 0`)
);

export type EffectiveRestake = InferSelectViewModel<
  typeof effectiveRestakesView
>;
