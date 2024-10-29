import { negationsTable } from "@/db/schema";
import { pgView } from "drizzle-orm/pg-core";

export const pointCounterpointsJoinView = pgView(
  "point_counterpoints_join_view"
).as((qb) =>
  qb
    .select({
      pointId: negationsTable.newerPointId,
      counterpointId: negationsTable.olderPointId,
    })
    .from(negationsTable)
    .union(
      qb
        .select({
          pointId: negationsTable.olderPointId,
          counterpointId: negationsTable.newerPointId,
        })
        .from(negationsTable)
    )
);
