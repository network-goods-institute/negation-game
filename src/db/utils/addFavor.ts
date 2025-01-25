import { db } from "@/services/db";
import { pointFavorHistoryView } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";

export function addFavor<T extends { id?: number; pointId?: number }>(
  points: T[]
): Promise<(T & { favor: number })[]> {
  if (points.length === 0) return Promise.resolve([]);

  const pointIds = points.map((p) => p.id ?? p.pointId);

  return db
    .select({
      pointId: pointFavorHistoryView.pointId,
      favor: pointFavorHistoryView.favor,
    })
    .from(pointFavorHistoryView)
    .where(inArray(pointFavorHistoryView.pointId, pointIds))
    .orderBy(desc(pointFavorHistoryView.eventTime))
    .then((favorRows) => {
      // Take the first (most recent) favor value for each point
      const favorMap = new Map(
        pointIds.map((id) => [
          id,
          favorRows.find((row) => row.pointId === id)?.favor ?? 0,
        ])
      );

      // Attach favor to original points
      const result = points.map((point) => ({
        ...point,
        favor: favorMap.get(point.id ?? point.pointId) ?? 0,
      }));

      return result;
    });
}
