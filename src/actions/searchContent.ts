"use server";

import { getSpace } from "@/actions/getSpace";
import { db } from "@/services/db";
import { sql, eq, inArray, and, desc } from "drizzle-orm";
import { addFavor } from "@/db/utils/addFavor";
import {
  pointsTable,
  endorsementsTable,
  pointFavorHistoryView,
  pointsWithDetailsView,
} from "@/db/schema";
import { getUserId } from "./getUserId";

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
  relevance: number;
  // Point-specific fields
  pointData?: PointResultBeforeFavor & { favor: number };
  // Viewpoint-specific fields
  description?: string;
  space?: string | null;
  statistics?: {
    views: number;
    copies: number;
    totalCred: number;
    averageFavor: number;
  };
};

export const searchContent = async (query: string): Promise<SearchResult[]> => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const space = await getSpace();
  const viewerId = await getUserId();
  const searchTerm = `%${query.trim().toLowerCase()}%`;

  const pointResultsBeforeFavor = await db
    .execute<
      Omit<PointResultBeforeFavor, "createdAt" | "relevance"> & {
        createdAt: string | Date;
        relevance: number | string;
      }
    >(
      sql`
    SELECT
      p.id as "pointId",
      p.content as "content",
      p.created_at as "createdAt",
      p.created_by as "createdBy",
      p.space as "space",
      p.amount_negations as "amountNegations",
      p.amount_supporters as "amountSupporters",
      p.cred as "cred",
      p.negations_cred as "negationsCred",
      p.negation_ids as "negationIds",
      u.username as "username",
      COALESCE((
        SELECT SUM(e.cred)
        FROM ${endorsementsTable} e
        WHERE e.point_id = p.id AND e.user_id = ${viewerId}
      ), 0) as "viewerCred",
      1 as "relevance"
    FROM ${pointsWithDetailsView} p
    INNER JOIN users u ON u.id = p.created_by
    WHERE p.space = ${space}
    AND (p.content ILIKE ${searchTerm} OR u.username ILIKE ${searchTerm})
    LIMIT 50
  `
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
        relevance: Number(row.relevance ?? 1),
      }));
      return points;
    });

  const pointResults = await addFavor(pointResultsBeforeFavor);

  const viewpointResults = await db.execute(sql`
    SELECT 
      v.id as "id",
      v.title as "title",
      v.content as "description",
      v.created_by as "createdBy",
      v.created_at as "createdAt",
      v.space as "space",
      v.graph as "graph",
      u.username as "username",
      vi.views as "views",
      vi.copies as "copies",
      1 as "relevance"
    FROM viewpoints v
    INNER JOIN users u ON u.id = v.created_by
    LEFT JOIN viewpoint_interactions vi ON vi.viewpoint_id = v.id
    WHERE v.space = ${space}
    AND (v.title ILIKE ${searchTerm} OR v.content ILIKE ${searchTerm} OR u.username ILIKE ${searchTerm})
    LIMIT 50
  `);

  const pointSearchResults: SearchResult[] = pointResults.map((point) => ({
    type: "point",
    id: point.pointId,
    content: point.content,
    createdAt:
      point.createdAt instanceof Date
        ? point.createdAt
        : new Date(point.createdAt),
    author: point.username,
    relevance: 1,
    pointData: point,
  }));

  const viewpointSearchResults: SearchResult[] = await Promise.all(
    viewpointResults.map(async (viewpoint: any) => {
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
              cred: endorsementsTable.cred,
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
            );

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

            // Calculate average favor from latest values of endorsed points only
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
      } catch (e) {
        console.error("Error calculating viewpoint statistics:", e);
      }

      return {
        type: "rationale",
        id: viewpoint.id,
        title: viewpoint.title,
        content: viewpoint.description,
        description: viewpoint.description,
        createdAt:
          viewpoint.createdAt instanceof Date
            ? viewpoint.createdAt
            : new Date(viewpoint.createdAt),
        author: viewpoint.username,
        space: viewpoint.space,
        relevance: 1,
        statistics: {
          views: viewpoint.views || 0,
          copies: viewpoint.copies || 0,
          totalCred,
          averageFavor,
        },
      };
    })
  );

  const combinedResults = [...pointSearchResults, ...viewpointSearchResults];

  // Simple ranking:
  // Increase relevance if query appears in title/content directly
  const results = combinedResults.map((result) => {
    let relevanceScore = result.relevance;
    const lowerCaseQuery = query.toLowerCase();

    // Check for exact matches in content
    if (result.content.toLowerCase().includes(lowerCaseQuery)) {
      relevanceScore += 2;
    }

    // Check for exact matches in title (for viewpoints)
    if (result.title && result.title.toLowerCase().includes(lowerCaseQuery)) {
      relevanceScore += 3;
    }

    // Check for exact author matches
    if (result.author.toLowerCase().includes(lowerCaseQuery)) {
      relevanceScore += 1;
    }

    return {
      ...result,
      relevance: relevanceScore,
    };
  });

  // Sort by relevance (high to low) and then by creation date (newest first)
  return results.sort((a, b) => {
    if (a.relevance !== b.relevance) {
      return b.relevance - a.relevance;
    }

    // Ensure we're working with Date objects
    const dateA =
      a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
    const dateB =
      b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);

    return dateB.getTime() - dateA.getTime();
  });
};
