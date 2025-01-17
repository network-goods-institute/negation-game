"use server";

import { pointFavorHistoryView } from "@/db/schema";
import { Point } from "@/db/tables/pointsTable";
import { timelineScale, TimelineScale } from "@/lib/timelineScale";
import { db } from "@/services/db";
import { and, desc, sql, eq } from "drizzle-orm";
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
      ? { bucketSize: 1 * minute, period: 10 * year }
      : timelineScale[scale];

  // Make the interval explicit
  const rangeStart = sql`CURRENT_TIMESTAMP - make_interval(secs => ${period}::integer)`;

  // First get the last favor value before our range
  const beforeRangeValue = await db
    .select({
      timestamp: sql<Date>`to_timestamp(floor(extract(epoch from event_time)::integer / ${bucketSize}::integer) * ${bucketSize}::integer)`,
      favor: pointFavorHistoryView.favor,
    })
    .from(pointFavorHistoryView)
    .where(
      and(
        eq(pointFavorHistoryView.pointId, pointId),
        sql`event_time < ${rangeStart}`
      )
    )
    .orderBy(desc(sql`event_time`))
    .limit(1)
    .then(rows => rows[0]);

  // Then get the values within our range
  const rangeValues = await db
    .select({
      timestamp: sql<Date>`to_timestamp(floor(extract(epoch from event_time)::integer / ${bucketSize}::integer) * ${bucketSize}::integer)`.as('bucket_timestamp'),
      favor: sql<number>`max(favor)`,
    })
    .from(pointFavorHistoryView)
    .where(
      and(
        eq(pointFavorHistoryView.pointId, pointId),
        sql`event_time >= ${rangeStart}`
      )
    )
    .groupBy(sql`bucket_timestamp`)
    .orderBy(sql`bucket_timestamp`);

  // Combine results
  if (!beforeRangeValue) return rangeValues;

  const endOfRange = last(rangeValues)?.timestamp.getTime() ?? Date.now();
  const startOfRange = endOfRange - period * 1000;

  return [
    { ...beforeRangeValue, timestamp: new Date(startOfRange) },
    ...rangeValues
  ];
}
