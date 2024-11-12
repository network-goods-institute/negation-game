"use server";

import { pointFavorHistoryView } from "@/db/schema";
import { Point } from "@/db/tables/pointsTable";
import { timelineScale, TimelineScale } from "@/lib/timelineScale";
import { db } from "@/services/db";
import { and, desc, sql } from "drizzle-orm";
import { last } from "remeda";

export interface FetchFavorHistoryParams {
  pointId: Point["id"];
  scale?: TimelineScale;
}

const minute = 60;
const year = 60 * 60 * 24 * 365;

export async function fetchFavorHistory({
  pointId,
  scale = "1W",
}: FetchFavorHistoryParams) {
  const { bucketSize, period } =
    scale === "ALL"
      ? //TODO make bucket size dynamic based on how old the point is
        { bucketSize: 1 * minute, period: 10 * year }
      : timelineScale[scale];

  const startOfRange = sql`(CURRENT_TIMESTAMP - interval '${period} seconds')`;

  return await db
    .select({
      timestamp:
        sql<Date>`to_timestamp(ceil(extract(epoch from ${pointFavorHistoryView.eventTime}) / ${bucketSize}) * ${bucketSize})`
          .mapWith((d) => new Date(d))
          .as("timestamp"),
      favor: sql<number>`max(${pointFavorHistoryView.favor})`
        .mapWith(Number)
        .as("favor"),
      insideRange: sql<boolean>`true`.mapWith(Boolean).as("inside_range"),
    })
    .from(pointFavorHistoryView)
    .where(
      and(
        sql`${pointFavorHistoryView.pointId} = ${pointId}`,
        sql`${pointFavorHistoryView.eventTime} >= ${startOfRange}`.inlineParams()
      )
    )
    .groupBy(sql`timestamp`)
    // select the first favor value before the start of the range to make sure the graph starts at the correct value
    .union(
      db
        .select({
          timestamp:
            sql<Date>`to_timestamp(ceil(extract(epoch from ${pointFavorHistoryView.eventTime}) / ${bucketSize}) * ${bucketSize})`
              .mapWith((d) => new Date(d))
              .as("timestamp"),
          favor: pointFavorHistoryView.favor,
          insideRange: sql<boolean>`false`.mapWith(Boolean).as("inside_range"),
        })
        .from(pointFavorHistoryView)
        .where(
          and(
            sql`${pointFavorHistoryView.pointId} = ${pointId}`,
            sql`${pointFavorHistoryView.eventTime} < ${startOfRange}`.inlineParams()
          )
        )
        .orderBy(desc(sql`timestamp`))
        .limit(1)
    )
    .orderBy(sql`timestamp`)
    .then(([firstResult, ...restOfResults]) => {
      const pickDesiredFields = ({ timestamp, favor }: typeof firstResult) => ({
        timestamp,
        favor,
      });
      if (firstResult.insideRange)
        return [firstResult, ...restOfResults].map(pickDesiredFields);

      const endOfRange = last(restOfResults)!.timestamp.getTime();
      const startOfRange = endOfRange - period * 1000;

      return [
        { ...firstResult, timestamp: new Date(startOfRange) },
        ...restOfResults,
      ].map(pickDesiredFields);
    });
}
