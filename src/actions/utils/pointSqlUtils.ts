import {
  endorsementsTable,
  effectiveRestakesView,
  doubtsTable,
  pointsWithDetailsView,
  pointsTable,
} from "@/db/schema";
import { sql } from "drizzle-orm";
import { PgColumn, PgTable, PgView } from "drizzle-orm/pg-core";

type AnyTableOrView = PgTable<any> | PgView<any>;

/**
 * SQL fragment to calculate the viewer's total endorsed cred for a point.
 * Requires viewerId to be passed.
 * NOTE: This still specifically references pointsWithDetailsView.pointId.
 *       If this needs to be dynamic too, it requires further changes.
 */
export const viewerCredSql = (viewerId: string | null) =>
  viewerId
    ? sql<number>`COALESCE((
        SELECT SUM(${endorsementsTable.cred})
        FROM ${endorsementsTable}
        WHERE ${endorsementsTable.pointId} = ${pointsWithDetailsView.pointId} 
          AND ${endorsementsTable.userId} = ${viewerId}
      ), 0)`.mapWith(Number)
    : sql<number>`0`.mapWith(Number);

/**
 * SQL fragment to calculate the total *active* restake amount on a point's negations.
 * This is the sum of amounts where slashedAmount < originalAmount.
 * NOTE: This still specifically references pointsWithDetailsView.pointId and negationIds.
 *       If this needs to be dynamic too, it requires further changes.
 */
export const totalRestakeAmountSql = sql<number>`
  COALESCE((
    SELECT SUM(CASE 
      WHEN er.slashed_amount >= er.amount THEN 0
      ELSE er.amount
    END)
    FROM ${effectiveRestakesView} AS er
    WHERE er.point_id = ${pointsWithDetailsView.pointId}
    AND er.negation_id = ANY(${pointsWithDetailsView.negationIds})
  ), 0)
`.mapWith(Number);

function getIdColumn<T extends AnyTableOrView>(table: T): PgColumn {
  const column = (table as any).pointId ?? (table as any).id;
  if (!column || !(column instanceof PgColumn)) {
    throw new Error(
      `Table/View ${JSON.stringify(table)} must have a valid 'id' or 'pointId' column.`
    );
  }
  return column;
}

/**
 * SQL fragment to calculate the sum of original amounts from *active* restakes
 * (where slashed_amount < amount) associated directly with a point.
 */
export const restakesByPointSql = <T extends AnyTableOrView>(table: T) =>
  sql<number>`
  COALESCE((
    SELECT SUM(er1.amount)
    FROM ${effectiveRestakesView} AS er1
    WHERE er1.point_id = ${getIdColumn(table)}
    AND er1.slashed_amount < er1.amount
  ), 0)
`.mapWith(Number);

/**
 * SQL fragment to calculate the total slashed amount across all restakes
 * associated directly with a point.
 */
export const slashedAmountSql = <T extends AnyTableOrView>(table: T) =>
  sql<number>`
  COALESCE((
    SELECT SUM(er1.slashed_amount)
    FROM ${effectiveRestakesView} AS er1
    WHERE er1.point_id = ${getIdColumn(table)}
  ), 0)
`.mapWith(Number);

/**
 * SQL fragment to calculate the total doubted amount across all restakes
 * associated directly with a point.
 */
export const doubtedAmountSql = <T extends AnyTableOrView>(table: T) =>
  sql<number>`
  COALESCE((
    SELECT SUM(er1.doubted_amount)
    FROM ${effectiveRestakesView} AS er1
    WHERE er1.point_id = ${getIdColumn(table)}
  ), 0)
`.mapWith(Number);

/**
 * Object containing SQL fragments for viewer-specific doubt information.
 * Requires viewerId to be passed.
 */
export const viewerDoubtSql = (viewerId: string | null) => ({
  id: doubtsTable.id,
  amount: doubtsTable.amount,
  userAmount: viewerId
    ? sql<number>`CASE WHEN ${doubtsTable.userId} = ${viewerId} THEN ${doubtsTable.amount} ELSE 0 END`.mapWith(
        Number
      )
    : sql<number>`0`.mapWith(Number),
  isUserDoubt: viewerId
    ? sql<boolean>`${doubtsTable.userId} = ${viewerId}`.mapWith(Boolean)
    : sql<boolean>`false`.mapWith(Boolean),
});
