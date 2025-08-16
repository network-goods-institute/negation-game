"use server";

import { db } from "@/services/db";
import { viewpointsTable, pointsTable, endorsementsTable } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { PointNodeData } from "@/components/graph/nodes/PointNode";
import { ViewpointGraph } from "@/atoms/viewpointAtoms";

export interface EndorsedPoint {
  pointId: number;
  content: string;
  cred: number;
}

export interface TopicRationaleAlignment {
  topicId: number;
  topicName: string;
  selectedDelegates: {
    userId: string;
    username: string;
    rationaleId: string;
    rationaleTitle: string;
    endorsedPoints: EndorsedPoint[];
  }[];

  sharedEndorsements: EndorsedPoint[];
  conflictingPoints: {
    pointId: number;
    content: string;
    rationaleContexts: {
      rationaleId: string;
      rationaleTitle: string;
      authorUsername: string;
    }[];
    delegatePositions: {
      userId: string;
      username: string;
      cred: number;
      fromRationale: string;
    }[];
  }[];

  overallAlignment: number;
}

export async function analyzeTopicAlignment(
  topicId: number,
  topicName: string,
  delegateRationales: {
    userId: string;
    username: string;
    rationaleId: string;
    rationaleTitle: string;
  }[]
): Promise<TopicRationaleAlignment> {
  const selectedDelegates: TopicRationaleAlignment["selectedDelegates"] = [];

  for (const delegate of delegateRationales) {
    const rationale = await db.query.viewpointsTable.findFirst({
      where: eq(viewpointsTable.id, delegate.rationaleId),
    });

    if (!rationale) continue;

    const pointIds = extractPointIdsFromGraph(rationale.graph);

    if (pointIds.length === 0) {
      selectedDelegates.push({
        ...delegate,
        endorsedPoints: [],
      });
      continue;
    }

    const points = await db
      .select({
        id: pointsTable.id,
        content: pointsTable.content,
      })
      .from(pointsTable)
      .where(
        and(inArray(pointsTable.id, pointIds), eq(pointsTable.isActive, true))
      );

    const endorsements = await db
      .select({
        pointId: endorsementsTable.pointId,
        cred: endorsementsTable.cred,
      })
      .from(endorsementsTable)
      .where(
        and(
          eq(endorsementsTable.userId, delegate.userId),
          inArray(endorsementsTable.pointId, pointIds)
        )
      );

    const endorsedPoints: EndorsedPoint[] = endorsements
      .filter((e) => e.cred > 0)
      .map((e) => {
        const point = points.find((p) => p.id === e.pointId);
        return {
          pointId: e.pointId,
          content: point?.content || "[Content not found]",
          cred: e.cred,
        };
      });

    selectedDelegates.push({
      ...delegate,
      endorsedPoints,
    });
  }

  const sharedEndorsements: EndorsedPoint[] = [];
  if (selectedDelegates.length > 1) {
    const allEndorsedPointIds = selectedDelegates.flatMap((d) =>
      d.endorsedPoints.map((p) => p.pointId)
    );
    const uniquePointIds = [...new Set(allEndorsedPointIds)];

    for (const pointId of uniquePointIds) {
      const endorsedByAll = selectedDelegates.every((d) =>
        d.endorsedPoints.some((p) => p.pointId === pointId)
      );

      if (endorsedByAll) {
        const firstEndorsement = selectedDelegates[0].endorsedPoints.find(
          (p) => p.pointId === pointId
        );
        if (firstEndorsement) {
          sharedEndorsements.push(firstEndorsement);
        }
      }
    }
  }

  const conflictingPoints: TopicRationaleAlignment["conflictingPoints"] = [];
  const allUniquePointIds = [
    ...new Set(
      selectedDelegates.flatMap((d) => d.endorsedPoints.map((p) => p.pointId))
    ),
  ];

  for (const pointId of allUniquePointIds) {
    const positions = selectedDelegates.map((d) => {
      const endorsement = d.endorsedPoints.find((p) => p.pointId === pointId);
      return {
        userId: d.userId,
        username: d.username,
        cred: endorsement?.cred || 0,
        fromRationale: d.rationaleTitle,
      };
    });

    const credValues = positions.map((p) => p.cred);
    const hasDisagreement =
      credValues.some((c) => c === 0) ||
      Math.max(...credValues) - Math.min(...credValues.filter((c) => c > 0)) >
        0;

    if (
      hasDisagreement &&
      !sharedEndorsements.some((s) => s.pointId === pointId)
    ) {
      const point = selectedDelegates
        .flatMap((d) => d.endorsedPoints)
        .find((p) => p.pointId === pointId);

      if (point) {
        conflictingPoints.push({
          pointId,
          content: point.content,
          rationaleContexts: selectedDelegates
            .filter((d) => d.endorsedPoints.some((p) => p.pointId === pointId))
            .map((d) => ({
              rationaleId: d.rationaleId,
              rationaleTitle: d.rationaleTitle,
              authorUsername: d.username,
            })),
          delegatePositions: positions,
        });
      }
    }
  }

  const totalUniquePoints = allUniquePointIds.length;
  const sharedCount = sharedEndorsements.length;
  const overallAlignment =
    totalUniquePoints > 0 ? sharedCount / totalUniquePoints : 1;

  return {
    topicId,
    topicName,
    selectedDelegates,
    sharedEndorsements,
    conflictingPoints,
    overallAlignment,
  };
}

function extractPointIdsFromGraph(graph: ViewpointGraph): number[] {
  if (!graph?.nodes) return [];

  return graph.nodes
    .filter((node) => {
      if (node.type !== "point" || !node.data) return false;
      return (
        typeof node.data === "object" &&
        "pointId" in node.data &&
        typeof (node.data as PointNodeData).pointId === "number"
      );
    })
    .map((node) => (node.data as PointNodeData).pointId)
    .filter((value, index, self) => self.indexOf(value) === index);
}
