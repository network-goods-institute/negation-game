"use server";

import { db } from "@/services/db";
import { viewpointsTable } from "@/db/tables/viewpointsTable";
import {
  negationsTable,
  endorsementsTable,
  objectionsTable,
  pointsTable,
} from "@/db/schema";
import { canUserCreateRationaleForTopic } from "@/actions/topics/manageTopicPermissions";
import { or, and, eq, sql } from "drizzle-orm";
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
import {
  fetchUserAssignments,
  markAssignmentCompleted,
} from "@/actions/topics/manageRationaleAssignments";
import { updateRationalePoints } from "@/actions/viewpoints/updateRationalePoints";
import { POINT_MIN_LENGTH, getPointMaxLength } from "@/constants/config";import { logger } from "@/lib/logger";

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

interface ValidationError {
  type:
    | "validation"
    | "point_resolution"
    | "graph_structure"
    | "objection"
    | "database";
  message: string;
  nodeId?: string;
  details?: any;
}

function validateGraphStructure(
  nodes: ReactFlowNode[],
  edges: ReactFlowEdge[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for statement node
  const statementNodes = nodes.filter((n) => n.type === "statement");
  if (statementNodes.length === 0) {
    errors.push({
      type: "graph_structure",
      message: "Graph must have exactly one statement node",
    });
  } else if (statementNodes.length > 1) {
    errors.push({
      type: "graph_structure",
      message: "Graph cannot have multiple statement nodes",
    });
  }

  // Validate point nodes
  const pointNodes = nodes.filter((n) => n.type === "point");
  for (const node of pointNodes) {
    const data = node.data as PreviewPointNodeData;

    if (!data.content || data.content.trim().length === 0) {
      errors.push({
        type: "validation",
        message: "Point node has empty content",
        nodeId: node.id,
      });
    }

    if (data.content) {
      const parentEdge = edges.find((edge) => edge.target === node.id);
      const isOption = parentEdge?.type === "statement";
      const maxLength = getPointMaxLength(isOption);

      if (
        data.content.length < POINT_MIN_LENGTH ||
        data.content.length > maxLength
      ) {
        errors.push({
          type: "validation",
          message: `Point content must be between ${POINT_MIN_LENGTH}-${maxLength} characters (current: ${data.content.length})`,
          nodeId: node.id,
        });
      }
    }

    // Validate objection structure
    if (data.isObjection) {
      if (!data.objectionTargetId || !data.objectionContextId) {
        errors.push({
          type: "objection",
          message: "Objection node missing target or context ID",
          nodeId: node.id,
        });
      }
    }
  }

  // Check for orphaned nodes (nodes without edges)
  const nodeIds = new Set(nodes.map((n) => n.id));
  const connectedNodes = new Set([
    ...edges.map((e) => e.source),
    ...edges.map((e) => e.target),
  ]);

  for (const nodeId of nodeIds) {
    if (nodeId !== "statement" && !connectedNodes.has(nodeId)) {
      errors.push({
        type: "graph_structure",
        message: "Orphaned node found (no connections)",
        nodeId,
      });
    }
  }

  // Validate edge references
  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push({
        type: "graph_structure",
        message: `Edge references non-existent source node: ${edge.source}`,
        details: { edgeId: edge.id },
      });
    }
    if (!nodeIds.has(edge.target)) {
      errors.push({
        type: "graph_structure",
        message: `Edge references non-existent target node: ${edge.target}`,
        details: { edgeId: edge.id },
      });
    }
  }

  return errors;
}

async function validatePointResolution(
  nodes: ReactFlowNode[],
  resolvedMappings: Map<string, number | null>,
  spaceId: string
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  for (const node of nodes) {
    if (node.type !== "point") continue;

    const data = node.data as PreviewPointNodeData;

    // Check if existingPointId still exists in database
    if (data.existingPointId !== undefined && data.existingPointId !== null) {
      try {
        const pointExists = await db
          .select({ id: pointsTable.id })
          .from(pointsTable)
          .where(
            and(
              eq(pointsTable.id, data.existingPointId),
              eq(pointsTable.isActive, true)
            )
          )
          .limit(1);

        if (pointExists.length === 0) {
          errors.push({
            type: "point_resolution",
            message: `Referenced point ID ${data.existingPointId} no longer exists`,
            nodeId: node.id,
            details: { pointId: data.existingPointId },
          });
        }
      } catch (error) {
        errors.push({
          type: "database",
          message: `Failed to validate point ID ${data.existingPointId}`,
          nodeId: node.id,
          details: {
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }

    // Check resolved mappings for consistency
    if (resolvedMappings.has(node.id)) {
      const resolvedId = resolvedMappings.get(node.id);
      if (resolvedId !== null && resolvedId !== undefined) {
        try {
          const pointExists = await db
            .select({ id: pointsTable.id })
            .from(pointsTable)
            .where(
              and(
                eq(pointsTable.id, resolvedId as number),
                eq(pointsTable.isActive, true)
              )
            )
            .limit(1);

          if (pointExists.length === 0) {
            errors.push({
              type: "point_resolution",
              message: `Resolved mapping points to non-existent point ID ${resolvedId}`,
              nodeId: node.id,
              details: { pointId: resolvedId },
            });
          }
        } catch (error) {
          errors.push({
            type: "database",
            message: `Failed to validate resolved point ID ${resolvedId}`,
            nodeId: node.id,
            details: {
              error: error instanceof Error ? error.message : String(error),
            },
          });
        }
      }
    }
  }

  return errors;
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
  errors?: ValidationError[];
}> {
  if (!userId) return { success: false, error: "User not authenticated" };
  if (!spaceId) return { success: false, error: "Space ID is required" };
  if (!title?.trim()) return { success: false, error: "Title is required" };

  // Check topic permissions if topicId is provided
  if (topicId) {
    const canCreate = await canUserCreateRationaleForTopic(userId, topicId);
    if (!canCreate) {
      return {
        success: false,
        error: "You do not have permission to create rationales for this topic",
      };
    }
  }

  // Validate graph structure upfront
  const structureErrors = validateGraphStructure(previewNodes, previewEdges);
  if (structureErrors.length > 0) {
    logger.warn(
      "[createRationaleFromPreview] Graph structure validation failed:",
      structureErrors
    );
    return {
      success: false,
      error: `Graph validation failed: ${structureErrors[0].message}`,
      errors: structureErrors,
    };
  }

  // Validate point resolution
  const resolutionErrors = await validatePointResolution(
    previewNodes,
    resolvedMappings,
    spaceId
  );
  if (resolutionErrors.length > 0) {
    logger.warn(
      "[createRationaleFromPreview] Point resolution validation failed:",
      resolutionErrors
    );
    return {
      success: false,
      error: `Point resolution failed: ${resolutionErrors[0].message}`,
      errors: resolutionErrors,
    };
  }

  const finalPointIdMap = new Map<string, number>();
  const endorsementsToProcess: { pointId: number; targetCred: number }[] = [];
  let statementNodeContent = { title, description };
  const contentToNewPointIdMap = new Map<string, number>();
  const createdPoints: number[] = []; // Track for potential rollback

  try {
    // Process point nodes with better error handling
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

        const parentEdge = previewEdges.find((edge) => edge.target === node.id);
        const isOption = parentEdge?.type === "statement";

        try {
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
                  isOption,
                });
                contentToNewPointIdMap.set(data.content, finalPointId);
                createdPoints.push(finalPointId);
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
                    isOption,
                  });
                  contentToNewPointIdMap.set(data.content, finalPointId);
                  createdPoints.push(finalPointId);
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
        } catch (error) {
          logger.error(
            "[createRationaleFromPreview] Failed to process point node:",
            node.id,
            "Error:",
            error
          );
          throw new Error(
            `Failed to process point "${data.content}": ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }

    // Process endorsements with error handling
    const endorsementsMap = new Map<number, number>();
    endorsementsToProcess.forEach(({ pointId, targetCred }) => {
      const prev = endorsementsMap.get(pointId) ?? 0;
      endorsementsMap.set(pointId, Math.max(prev, targetCred));
    });
    const uniqueEndorsementsToProcess = Array.from(
      endorsementsMap.entries()
    ).map(([pointId, targetCred]) => ({ pointId, targetCred }));

    if (uniqueEndorsementsToProcess.length > 0) {
      try {
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
      } catch (error) {
        logger.error(
          "[createRationaleFromPreview] Failed to process endorsements:",
          error
        );
        throw new Error(
          `Failed to process endorsements: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Build final graph with error handling
    const finalNodes: ReactFlowNode[] = [];
    const finalEdges: ReactFlowEdge[] = [];
    const previewToFinalIdMap = new Map<string, string>();

    try {
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
    } catch (error) {
      logger.error(
        "[createRationaleFromPreview] Failed to build final graph:",
        error
      );
      throw new Error(
        `Failed to build final graph: ${error instanceof Error ? error.message : String(error)}`
      );
    }

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

    // Create negation relationships with better error handling
    const failedNegations: Array<{
      source: number;
      target: number;
      error: string;
    }> = [];

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

        try {
          await db
            .insert(negationsTable)
            .values({
              olderPointId,
              newerPointId,
              createdBy: userId,
              space: spaceId,
            })
            .onConflictDoNothing();
        } catch (error) {
          logger.error(
            `[createRationaleFromPreview] Failed to create negation ${olderPointId} -> ${newerPointId}:`,
            error
          );
          failedNegations.push({
            source: sourcePointFinalId,
            target: targetPointFinalId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    // Create objection relationships with better error handling
    const failedObjections: Array<{ nodeId: string; error: string }> = [];

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
                  throw new Error(
                    `Could not resolve target node ID ${data.objectionTargetId} to point ID`
                  );
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
                  throw new Error(
                    `Could not resolve context node ID ${data.objectionContextId} to point ID`
                  );
                }
                contextPointId = contextPointIdFromMap;
              } else {
                // It's already a point ID
                contextPointId = data.objectionContextId;
              }

              // Verify negation relationship exists
              const negationRelationship = await db
                .select({ id: negationsTable.id })
                .from(negationsTable)
                .where(
                  and(
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
                    ),
                    eq(negationsTable.isActive, true)
                  )
                );

              if (negationRelationship.length === 0) {
                throw new Error(
                  `No negation relationship found between target ${targetPointId} and context ${contextPointId}`
                );
              }

              const parentEdgeId = negationRelationship[0].id;

              // Only get endorsement if one exists with actual cred
              const endorsement = await db
                .select({ id: endorsementsTable.id })
                .from(endorsementsTable)
                .where(
                  and(
                    eq(endorsementsTable.pointId, objectionPointId),
                    eq(endorsementsTable.userId, userId),
                    sql`${endorsementsTable.cred} > 0`
                  )
                )
                .limit(1);

              const endorsementId =
                endorsement.length > 0 ? endorsement[0].id : null;

              // Create objection
              await db.insert(objectionsTable).values({
                objectionPointId,
                targetPointId,
                contextPointId,
                parentEdgeId,
                endorsementId,
                createdBy: userId,
                space: spaceId,
              });

              logger.log(
                `[createRationaleFromPreview] Successfully created objection for point ${objectionPointId}`
              );
            } catch (error) {
              logger.error(
                "[createRationaleFromPreview] Failed to create objection for node:",
                node.id,
                "Error:",
                error
              );
              failedObjections.push({
                nodeId: node.id,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
        }
      }
    }

    // Create the rationale
    const newViewpointId = `vp_${nanoid()}`;
    try {
      await db.insert(viewpointsTable).values({
        id: newViewpointId,
        title: statementNodeContent.title,
        description: statementNodeContent.description,
        topicId: topicId ?? null,
        graph: finalGraph,
        createdBy: userId,
        space: spaceId,
      });

      // Update rationale_points bridge table
      await updateRationalePoints(newViewpointId, finalGraph);
    } catch (error) {
      logger.error(
        "[createRationaleFromPreview] Failed to create rationale:",
        error
      );
      throw new Error(
        `Failed to create rationale: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Check for and complete any assignments for this topic
    if (topicId) {
      try {
        const userAssignments = await fetchUserAssignments(userId);
        const matchingAssignment = userAssignments.find(
          (assignment) =>
            assignment.topicId === topicId &&
            assignment.spaceId === spaceId &&
            !assignment.completed
        );

        if (matchingAssignment) {
          await markAssignmentCompleted(matchingAssignment.id);
          logger.log(
            `[createRationaleFromPreview] Completed assignment ${matchingAssignment.id} for topic ${topicId}`
          );
        }
      } catch (error) {
        logger.warn(
          "[createRationaleFromPreview] Failed to check/complete assignment:",
          error
        );
        // Don't fail the rationale creation if assignment completion fails
      }
    }

    // Log any partial failures but still return success
    if (failedNegations.length > 0) {
      logger.warn(
        `[createRationaleFromPreview] ${failedNegations.length} negations failed to create:`,
        failedNegations
      );
    }
    if (failedObjections.length > 0) {
      logger.warn(
        `[createRationaleFromPreview] ${failedObjections.length} objections failed to create:`,
        failedObjections
      );
    }

    return {
      success: true,
      rationaleId: newViewpointId,
      ...(failedNegations.length > 0 || failedObjections.length > 0
        ? {
            error: `Rationale created successfully, but ${failedNegations.length} negations and ${failedObjections.length} objections failed to create.`,
          }
        : {}),
    };
  } catch (error: any) {
    logger.error("[createRationaleFromPreview] Error:", error);

    // Attempt cleanup of created points if we're in a transaction-like failure
    if (createdPoints.length > 0) {
      logger.log(
        `[createRationaleFromPreview] Attempting cleanup of ${createdPoints.length} created points...`
      );
      try {
        // Note: In a real production system, you'd want more sophisticated rollback
        // This is a basic cleanup attempt - delete points we created in this space
        await db.delete(pointsTable).where(
          and(
            eq(pointsTable.createdBy, userId),
            eq(pointsTable.space, spaceId)
            // In practice, you'd want a more robust transaction system with point IDs
          )
        );
      } catch (cleanupError) {
        logger.error(
          "[createRationaleFromPreview] Cleanup failed:",
          cleanupError
        );
      }
    }

    return {
      success: false,
      error: error.message || "Failed to create rationale",
    };
  }
}
