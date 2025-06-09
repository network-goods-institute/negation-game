"use server";

import { db } from "@/services/db";
import { viewpointsTable } from "@/db/tables/viewpointsTable";
import {
  negationsTable,
  endorsementsTable,
  objectionsTable,
} from "@/db/schema";
import { or, and, eq } from "drizzle-orm";
import { makePoint } from "@/actions/points/makePoint";
import { endorse } from "@/actions/endorsements/endorse";
import { nanoid } from "nanoid";
import { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { Node as ReactFlowNode, Edge as ReactFlowEdge } from "@xyflow/react";
import { PreviewPointNodeData } from "@/components/chatbot/preview/PreviewPointNode";
import { PreviewStatementNodeData } from "@/components/chatbot/preview/PreviewStatementNode";
import { AppNode } from "@/components/graph/nodes/AppNode";
import { AppEdge } from "@/components/graph/edges/AppEdge";
import { fetchUserEndorsements } from "@/actions/endorsements/fetchUserEndorsements";
import { sellEndorsement } from "@/actions/endorsements/sellEndorsement";
import { fetchPointsByExactContent } from "@/actions/points/fetchPointsByExactContent";

interface CreateRationaleParams {
  userId: string;
  spaceId: string;
  title: string;
  description: string;
  topicId?: number;
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  resolvedMappings: Map<string, number | null>;
}

export async function createRationaleFromPreview({
  userId,
  spaceId,
  title,
  description,
  topicId,
  nodes: previewNodes,
  edges: previewEdges,
  resolvedMappings,
}: CreateRationaleParams): Promise<{
  success: boolean;
  rationaleId?: string;
  error?: string;
}> {
  if (!userId) return { success: false, error: "User not authenticated" };
  if (!spaceId) return { success: false, error: "Space ID is required" };

  const finalPointIdMap = new Map<string, number>();
  const endorsementsToProcess: { pointId: number; targetCred: number }[] = [];
  let statementNodeContent = { title, description };
  const contentToNewPointIdMap = new Map<string, number>();

  try {
    for (const node of previewNodes) {
      if (node.type === "statement") {
        const data = node.data as PreviewStatementNodeData;
        statementNodeContent = {
          title: data.statement || title,
          description,
        };
      } else if (node.type === "point") {
        const data = node.data as PreviewPointNodeData;
        let finalPointId: number;

        if (
          data.existingPointId !== undefined &&
          data.existingPointId !== null
        ) {
          finalPointId = data.existingPointId;
        } else {
          const existingPointIdFromMappings = resolvedMappings.get(node.id);

          if (
            resolvedMappings.has(node.id) &&
            existingPointIdFromMappings === null
          ) {
            if (contentToNewPointIdMap.has(data.content)) {
              finalPointId = contentToNewPointIdMap.get(data.content)!;
            } else {
              finalPointId = await makePoint({
                content: data.content,
                cred: 0,
              });
              contentToNewPointIdMap.set(data.content, finalPointId);
            }
          } else if (
            existingPointIdFromMappings !== undefined &&
            existingPointIdFromMappings !== null
          ) {
            finalPointId = existingPointIdFromMappings;
          } else {
            if (contentToNewPointIdMap.has(data.content)) {
              finalPointId = contentToNewPointIdMap.get(data.content)!;
            } else {
              const existingGlobalPoints = await fetchPointsByExactContent(
                [data.content],
                spaceId
              );
              if (existingGlobalPoints.length > 0) {
                finalPointId = existingGlobalPoints[0].id;
                contentToNewPointIdMap.set(data.content, finalPointId);
              } else {
                finalPointId = await makePoint({
                  content: data.content,
                  cred: 0,
                });
                contentToNewPointIdMap.set(data.content, finalPointId);
              }
            }
          }
        }

        finalPointIdMap.set(node.id, finalPointId);
        if (typeof data.cred === "number") {
          endorsementsToProcess.push({
            pointId: finalPointId,
            targetCred: data.cred,
          });
        }
      }
    }

    const endorsementsMap = new Map<number, number>();
    endorsementsToProcess.forEach(({ pointId, targetCred }) => {
      const prev = endorsementsMap.get(pointId) ?? 0;
      endorsementsMap.set(pointId, Math.max(prev, targetCred));
    });
    const uniqueEndorsementsToProcess = Array.from(
      endorsementsMap.entries()
    ).map(([pointId, targetCred]) => ({ pointId, targetCred }));

    if (uniqueEndorsementsToProcess.length > 0) {
      const pointIdsToFetch = [
        ...new Set(uniqueEndorsementsToProcess.map((e) => e.pointId)),
      ];
      const currentUserEndorsementsArray = await fetchUserEndorsements(
        userId,
        pointIdsToFetch
      );
      const currentUserEndorsementsMap = new Map(
        currentUserEndorsementsArray.map((e) => [e.pointId, e.cred])
      );

      for (const { pointId, targetCred } of uniqueEndorsementsToProcess) {
        const currentCredForPoint =
          currentUserEndorsementsMap.get(pointId) || 0;
        const delta = targetCred - currentCredForPoint;

        if (delta > 0) {
          await endorse({ pointId, cred: delta });
        } else if (delta < 0) {
          await sellEndorsement({ pointId, amountToSell: Math.abs(delta) });
        }
      }
    }

    const finalNodes: ReactFlowNode[] = [];
    const finalEdges: ReactFlowEdge[] = [];

    const previewToFinalIdMap = new Map<string, string>();
    previewNodes.forEach((node) => {
      if (node.type === "statement") {
        finalNodes.push({
          id: "statement",
          type: "statement",
          position: node.position || { x: 0, y: 0 },
          data: { statement: statementNodeContent.title },
        });
        previewToFinalIdMap.set(node.id, "statement");
      } else if (node.type === "point") {
        const finalId = finalPointIdMap.get(node.id);
        if (finalId !== undefined) {
          const nodeId = nanoid();
          const parentEdge = previewEdges.find((e) => e.target === node.id);
          const parentPreviewId = parentEdge?.source || "statement";
          const parentFinalId = previewToFinalIdMap.get(parentPreviewId)!;

          // Preserve objection data if this is an objection
          const nodeData = node.data as PreviewPointNodeData;
          const finalNodeData: any = {
            pointId: finalId,
            parentId: parentFinalId,
          };

          // If this is an objection, preserve the objection metadata for display
          if (
            nodeData.isObjection &&
            nodeData.objectionTargetId &&
            nodeData.objectionContextId
          ) {
            finalNodeData.isObjection = true;
            // Resolve objection IDs to final point IDs for the final graph
            if (typeof nodeData.objectionTargetId === "string") {
              const targetFinalId = finalPointIdMap.get(
                nodeData.objectionTargetId
              );
              if (targetFinalId !== undefined) {
                finalNodeData.objectionTargetId = targetFinalId;
              }
            } else {
              finalNodeData.objectionTargetId = nodeData.objectionTargetId;
            }

            if (typeof nodeData.objectionContextId === "string") {
              const contextFinalId = finalPointIdMap.get(
                nodeData.objectionContextId
              );
              if (contextFinalId !== undefined) {
                finalNodeData.objectionContextId = contextFinalId;
              }
            } else {
              finalNodeData.objectionContextId = nodeData.objectionContextId;
            }
          }

          finalNodes.push({
            id: nodeId,
            type: "point",
            position: node.position || { x: 0, y: 0 },
            data: finalNodeData,
          });
          previewToFinalIdMap.set(node.id, nodeId);
        }
      }
    });

    previewEdges.forEach((edge) => {
      const parentFinalId = previewToFinalIdMap.get(edge.source);
      const childFinalId = previewToFinalIdMap.get(edge.target);
      if (!parentFinalId || !childFinalId) return;
      const edgeType = edge.source === "statement" ? "statement" : "negation";
      finalEdges.push({
        id: `edge-${nanoid()}`,
        type: edgeType,
        source: childFinalId,
        target: parentFinalId,
      } as ReactFlowEdge);
    });

    const finalGraph: ViewpointGraph = {
      nodes: finalNodes as AppNode[],
      edges: finalEdges as AppEdge[],
      description: statementNodeContent.description,
    };
    const statementNodeFromPreview = previewNodes.find(
      (n) => n.type === "statement"
    );
    const currentLinkUrl = (
      statementNodeFromPreview?.data as PreviewStatementNodeData | undefined
    )?.linkUrl;
    if (currentLinkUrl) {
      finalGraph.linkUrl = currentLinkUrl;
    }

    for (const edge of previewEdges) {
      if (edge.source === "statement") continue;
      const sourcePointFinalId = finalPointIdMap.get(edge.source);
      const targetPointFinalId = finalPointIdMap.get(edge.target);

      if (sourcePointFinalId != null && targetPointFinalId != null) {
        if (sourcePointFinalId === targetPointFinalId) {
          continue;
        }

        const olderPointId = Math.min(sourcePointFinalId, targetPointFinalId);
        const newerPointId = Math.max(sourcePointFinalId, targetPointFinalId);

        if (olderPointId === newerPointId) {
          continue;
        }

        await db
          .insert(negationsTable)
          .values({
            olderPointId,
            newerPointId,
            createdBy: userId,
            space: spaceId,
          })
          .onConflictDoNothing();
      }
    }

    for (const node of previewNodes) {
      if (node.type === "point") {
        const data = node.data as PreviewPointNodeData;

        if (
          data.isObjection &&
          data.objectionTargetId &&
          data.objectionContextId
        ) {
          const objectionPointId = finalPointIdMap.get(node.id);

          if (objectionPointId) {
            try {
              // Resolve target and context IDs to actual point IDs
              let targetPointId: number;
              let contextPointId: number;

              // If objectionTargetId is a string, it's a node ID - resolve it
              if (typeof data.objectionTargetId === "string") {
                const targetPointIdFromMap = finalPointIdMap.get(
                  data.objectionTargetId
                );
                if (targetPointIdFromMap === undefined) {
                  console.warn(
                    `Could not resolve target node ID ${data.objectionTargetId} to point ID`
                  );
                  continue;
                }
                targetPointId = targetPointIdFromMap;
              } else {
                // It's already a point ID
                targetPointId = data.objectionTargetId;
              }

              // If objectionContextId is a string, it's a node ID - resolve it
              if (typeof data.objectionContextId === "string") {
                const contextPointIdFromMap = finalPointIdMap.get(
                  data.objectionContextId
                );
                if (contextPointIdFromMap === undefined) {
                  console.warn(
                    `Could not resolve context node ID ${data.objectionContextId} to point ID`
                  );
                  continue;
                }
                contextPointId = contextPointIdFromMap;
              } else {
                // It's already a point ID
                contextPointId = data.objectionContextId;
              }

              const negationRelationship = await db
                .select({ id: negationsTable.id })
                .from(negationsTable)
                .where(
                  or(
                    and(
                      eq(
                        negationsTable.olderPointId,
                        Math.min(targetPointId, contextPointId)
                      ),
                      eq(
                        negationsTable.newerPointId,
                        Math.max(targetPointId, contextPointId)
                      )
                    )
                  )
                );

              if (negationRelationship.length > 0) {
                const parentEdgeId = negationRelationship[0].id;

                const endorsement = await db
                  .select({ id: endorsementsTable.id })
                  .from(endorsementsTable)
                  .where(
                    and(
                      eq(endorsementsTable.pointId, objectionPointId),
                      eq(endorsementsTable.userId, userId)
                    )
                  )
                  .limit(1);

                let endorsementId: number;

                if (endorsement.length > 0) {
                  endorsementId = endorsement[0].id;
                } else {
                  const newEndorsement = await db
                    .insert(endorsementsTable)
                    .values({
                      cred: 0,
                      pointId: objectionPointId,
                      userId,
                      space: spaceId,
                    })
                    .returning({ id: endorsementsTable.id });

                  endorsementId = newEndorsement[0].id;
                }

                await db.insert(objectionsTable).values({
                  objectionPointId,
                  targetPointId,
                  contextPointId,
                  parentEdgeId,
                  endorsementId,
                  createdBy: userId,
                  space: spaceId,
                });
              } else {
                console.warn(
                  `[createRationaleFromPreview] No negation relationship found between target ${targetPointId} and context ${contextPointId}`
                );
              }
            } catch (error) {
              console.error("Failed to create objection relationship:", error);
            }
          }
        }
      }
    }

    const newViewpointId = `vp_${nanoid()}`;
    await db.insert(viewpointsTable).values({
      id: newViewpointId,
      title: statementNodeContent.title,
      description: statementNodeContent.description,
      topicId: topicId ?? null,
      graph: finalGraph,
      createdBy: userId,
      space: spaceId,
    });

    return { success: true, rationaleId: newViewpointId };
  } catch (error: any) {
    console.error("[createRationaleFromPreview] Error:", error);
    return {
      success: false,
      error: error.message || "Failed to create rationale",
    };
  }
}
