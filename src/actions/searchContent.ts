"use server";

import { getSpace } from "@/actions/getSpace";
import { db } from "@/services/db";
import { sql, SQL, eq, inArray, and, desc, or } from "drizzle-orm";
import { addFavor } from "@/db/utils/addFavor";
import {
  pointsTable,
  endorsementsTable,
  pointFavorHistoryView,
  pointsWithDetailsView,
} from "@/db/schema";
import { getUserId } from "./getUserId";

const RESULT_LIMIT = 20;

type PointResultBeforeFavor = {
  pointId: number;
  content: string;
  createdAt: Date;
  createdBy: string;
  space: string | null;
  amountNegations: number;
  amountSupporters: number;
  cred: number;
  negationsCred: number;
  negationIds: number[];
  username: string;
  relevance: number;
  viewerCred: number;
};

export type SearchResult = {
  type: "point" | "rationale";
  id: number | string;
  content: string;
  title?: string;
  createdAt: Date;
  author: string;
  authorId?: string;
  relevance: number;
  pointData?: PointResultBeforeFavor & { favor: number };
  description?: string;
  space?: string | null;
  statistics?: {
    views: number;
    copies: number;
    totalCred: number;
    averageFavor: number;
  };
};

export const searchContent = async (
  keywords: string[]
): Promise<SearchResult[]> => {
  const validKeywords = keywords.filter((k) => k && k.trim().length >= 2);
  if (validKeywords.length === 0) {
    return [];
  }
  const space = await getSpace();
  const viewerId = await getUserId();

  const searchTerms = validKeywords.map((k) => `%${k.trim().toLowerCase()}%`);

  const pointOrConditions: SQL[] = searchTerms.map(
    (term) => or(sql`p.content ILIKE ${term}`, sql`u.username ILIKE ${term}`)!
  );
  const combinedPointCondition = or(...pointOrConditions);

  const viewpointOrConditions: SQL[] = searchTerms.map(
    (term) =>
      or(
        sql`v.title ILIKE ${term}`,
        sql`v.content ILIKE ${term}`,
        sql`u.username ILIKE ${term}`
      )!
  );
  const combinedViewpointCondition = or(...viewpointOrConditions);
  const pointResultsBeforeFavor = await db
    .execute<
      Omit<PointResultBeforeFavor, "createdAt" | "relevance"> & {
        createdAt: string | Date;
      }
    >(
      sql`SELECT
              p.id as "pointId", p.content as "content", p.created_at as "createdAt",
              p.created_by as "createdBy", p.space as "space", p.amount_negations as "amountNegations",
              p.amount_supporters as "amountSupporters", p.cred as "cred", p.negations_cred as "negationsCred",
              p.negation_ids as "negationIds", u.username as "username",
              COALESCE((
                SELECT SUM(e.cred) FROM ${endorsementsTable} e
                WHERE e.point_id = p.id AND e.user_id = ${viewerId}
              ), 0) as "viewerCred"
            FROM ${pointsWithDetailsView} p
            INNER JOIN users u ON u.id = p.created_by
            WHERE p.space = ${space}
            AND (${combinedPointCondition})
            ORDER BY p.created_at DESC
            LIMIT 50`
    )
    .then((result) => {
      const points: PointResultBeforeFavor[] = result.map((row) => ({
        pointId: Number(row.pointId),
        content: row.content,
        createdAt: new Date(row.createdAt),
        createdBy: row.createdBy,
        space: row.space,
        amountNegations: Number(row.amountNegations ?? 0),
        amountSupporters: Number(row.amountSupporters ?? 0),
        cred: Number(row.cred ?? 0),
        negationsCred: Number(row.negationsCred ?? 0),
        negationIds: Array.isArray(row.negationIds)
          ? row.negationIds.map(Number)
          : [],
        username: row.username,
        viewerCred: Number(row.viewerCred ?? 0),
        relevance: 1,
      }));
      return points;
    });

  const pointResults = await addFavor(pointResultsBeforeFavor);

  const viewpointResultsKeyword = await db.execute(sql`
    SELECT
      v.id as "id", v.title as "title", v.content as "description",
      v.created_by as "createdBy", v.created_at as "createdAt", v.space as "space", v.created_by as "authorId",
      v.graph as "graph", u.username as "username",
      vi.views as "views", vi.copies as "copies"
    FROM viewpoints v
    INNER JOIN users u ON u.id = v.created_by
    LEFT JOIN viewpoint_interactions vi ON vi.viewpoint_id = v.id
    WHERE v.space = ${space}
    AND (${combinedViewpointCondition})
    ORDER BY v.created_at DESC
    LIMIT 50
  `);

  let viewpointResultsPointInclusion: any[] = [];
  const foundPointIds = pointResults.map((p) => p.pointId);

  if (foundPointIds.length > 0) {
    viewpointResultsPointInclusion = await db.execute(sql`
      SELECT
        v.id as "id", v.title as "title", v.content as "description",
        v.created_by as "createdBy", v.created_at as "createdAt", v.space as "space", v.created_by as "authorId",
        v.graph as "graph", u.username as "username",
        vi.views as "views", vi.copies as "copies"
      FROM viewpoints v
      INNER JOIN users u ON u.id = v.created_by
      LEFT JOIN viewpoint_interactions vi ON vi.viewpoint_id = v.id
      WHERE v.space = ${space}
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v.graph->'nodes') AS node
        WHERE node->>'type' = 'point'
        AND (node->'data'->>'pointId')::int IN ${sql`${foundPointIds}`}
      )
      ORDER BY v.created_at DESC
      LIMIT 50 -- Apply limit here too, although merging might reduce final count
    `);
  }

  const combinedViewpointResultsMap = new Map<string, any>();
  viewpointResultsKeyword.forEach((vp: any) =>
    combinedViewpointResultsMap.set(vp.id, vp)
  );
  viewpointResultsPointInclusion.forEach((vp: any) =>
    combinedViewpointResultsMap.set(vp.id, vp)
  );
  const combinedViewpointResults = Array.from(
    combinedViewpointResultsMap.values()
  );

  const uniqueResultsMap = new Map<string, SearchResult>();

  pointResults.forEach((point) => {
    const key = `point-${point.pointId}`;
    if (!uniqueResultsMap.has(key)) {
      uniqueResultsMap.set(key, {
        type: "point",
        id: point.pointId,
        content: point.content,
        createdAt: point.createdAt,
        author: point.username,
        authorId: point.createdBy,
        relevance: 1,
        pointData: point,
      });
    }
  });

  await Promise.all(
    combinedViewpointResults.map(async (viewpoint: any) => {
      const key = `rationale-${viewpoint.id}`;
      if (uniqueResultsMap.has(key)) return;

      let totalCred = 0;
      let averageFavor = 0;
      try {
        const pointIds: number[] = [];
        if (viewpoint.graph && viewpoint.graph.nodes) {
          viewpoint.graph.nodes.forEach((node: any) => {
            if (node.type === "point" && node.data && node.data.pointId) {
              pointIds.push(node.data.pointId);
            }
          });
        }

        if (pointIds.length > 0) {
          const endorsements = await db
            .select({
              pointId: pointsTable.id,
              cred: sql`SUM(${endorsementsTable.cred})`,
            })
            .from(pointsTable)
            .innerJoin(
              endorsementsTable,
              eq(endorsementsTable.pointId, pointsTable.id)
            )
            .where(
              and(
                inArray(pointsTable.id, pointIds),
                eq(endorsementsTable.userId, viewpoint.createdBy)
              )
            )
            .groupBy(pointsTable.id);

          totalCred = endorsements.reduce(
            (sum, row) => sum + Number(row.cred),
            0
          );

          const endorsedPointIds = endorsements.map((e) => e.pointId);
          if (endorsedPointIds.length > 0) {
            const favorValues = await db
              .select({
                pointId: pointFavorHistoryView.pointId,
                favor: pointFavorHistoryView.favor,
                eventTime: pointFavorHistoryView.eventTime,
              })
              .from(pointFavorHistoryView)
              .where(inArray(pointFavorHistoryView.pointId, endorsedPointIds))
              .orderBy(desc(pointFavorHistoryView.eventTime));

            const latestFavorByPoint = new Map();
            favorValues.forEach((row) => {
              if (!latestFavorByPoint.has(row.pointId)) {
                latestFavorByPoint.set(row.pointId, row.favor);
              }
            });

            const pointsWithFavor = Array.from(
              latestFavorByPoint.values()
            ).filter((favor) => favor > 0);
            const totalFavor = pointsWithFavor.reduce(
              (sum, favor) => sum + Number(favor),
              0
            );
            averageFavor =
              pointsWithFavor.length > 0
                ? Math.round(totalFavor / pointsWithFavor.length)
                : 0;
          }
        }
      } catch (e) {}

      uniqueResultsMap.set(key, {
        type: "rationale",
        id: viewpoint.id,
        title: viewpoint.title,
        content: viewpoint.description,
        description: viewpoint.description,
        createdAt: new Date(viewpoint.createdAt),
        author: viewpoint.username,
        authorId: viewpoint.authorId,
        relevance: 1, // placeholder
        statistics: {
          views: viewpoint.views || 0,
          copies: viewpoint.copies || 0,
          totalCred,
          averageFavor,
        },
      });
    })
  );

  const finalResults = Array.from(uniqueResultsMap.values());

  finalResults.sort((a, b) => {
    const dateA =
      a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
    const dateB =
      b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
    return dateB.getTime() - dateA.getTime();
  });

  return finalResults.slice(0, RESULT_LIMIT);
};
