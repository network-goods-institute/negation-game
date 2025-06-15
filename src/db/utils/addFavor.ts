import { db } from "@/services/db";
import { currentPointFavorView } from "@/db/schema";
import { inArray } from "drizzle-orm";

export function addFavor<T extends { id?: number; pointId?: number }>(
  points: T[]
): Promise<(T & { favor: number })[]> {
  if (points.length === 0) return Promise.resolve([]);

  const pointIds = points
    .map((p) => p.id ?? p.pointId)
    .filter((id): id is number => id !== undefined);

  if (pointIds.length === 0) {
    return Promise.resolve(points.map((point) => ({ ...point, favor: 0 })));
  }

  return db
    .select()
    .from(currentPointFavorView)
    .where(inArray(currentPointFavorView.pointId, pointIds))
    .then((favorRows) => {
      const favorMap = new Map(
        favorRows.map((row) => [row.pointId, row.favor])
      );

      const result = points.map((point) => ({
        ...point,
        favor: favorMap.get(point.id ?? point.pointId!) ?? 0,
      }));

      return result;
    });
}
