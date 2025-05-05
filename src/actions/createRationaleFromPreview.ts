"use server";

import { db } from "@/services/db";
import { viewpointsTable } from "@/db/tables/viewpointsTable";
import { makePoint } from "@/actions/makePoint";
import { endorse } from "@/actions/endorse";
import { nanoid } from "nanoid";
import { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { Node, Edge } from "@xyflow/react";
import { PreviewPointNodeData } from "@/components/chatbot/PreviewPointNode";
import { PreviewStatementNodeData } from "@/components/chatbot/PreviewStatementNode";

interface CreateRationaleParams {
  userId: string;
  spaceId: string;
  title: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
  resolvedMappings: Map<string, number | null>;
}

export async function createRationaleFromPreview({
  userId,
  spaceId,
  title,
  description,
  nodes: previewNodes,
  edges: previewEdges,
  resolvedMappings,
}: CreateRationaleParams): Promise<{
  success: boolean;
  rationaleId?: string;
  error?: string;
}> {
  console.log("[createRationaleFromPreview] Input previewNodes:", previewNodes);
  console.log("[createRationaleFromPreview] Input previewEdges:", previewEdges);
  console.log(
    "[createRationaleFromPreview] Resolved mappings:",
    resolvedMappings
  );
  if (!userId) return { success: false, error: "User not authenticated" };
  if (!spaceId) return { success: false, error: "Space ID is required" };

  const finalPointIdMap = new Map<string, number>();
  const endorsementsToMake: { pointId: number; cred: number }[] = [];
  let statementNodeContent = { title, description };

  try {
    console.log(
      "[createRationaleFromPreview] Starting node and nodes processing"
    );
    for (const node of previewNodes) {
      if (node.type === "statement") {
        const data = node.data as PreviewStatementNodeData;
        statementNodeContent = {
          title: data.statement || title,
          description: description,
        };
        finalPointIdMap.set(node.id, 0);
      } else if (node.type === "point") {
        const data = node.data as PreviewPointNodeData;
        const previewNodeId = node.id;
        const existingPointId = resolvedMappings.get(previewNodeId);

        let finalPointId: number;

        if (existingPointId === null) {
          const newPoint = await makePoint({
            content: data.content,
            cred: 0,
          });
          finalPointId = newPoint;
        } else if (existingPointId !== undefined) {
          finalPointId = existingPointId;
        } else {
          const newPoint = await makePoint({
            content: data.content,
            cred: 0,
          });
          finalPointId = newPoint;
        }

        finalPointIdMap.set(previewNodeId, finalPointId);

        if (data.viewerCred && data.viewerCred > 0) {
          endorsementsToMake.push({
            pointId: finalPointId,
            cred: data.viewerCred,
          });
        }
      }
    }

    for (const endorsement of endorsementsToMake) {
      await endorse({
        pointId: endorsement.pointId,
        cred: endorsement.cred,
      });
    }

    const finalNodes: any[] = [];
    const finalEdges: any[] = [];

    console.log(
      "[createRationaleFromPreview] finalPointIdMap:",
      Array.from(finalPointIdMap.entries())
    );

    const pointParentMap = new Map<string, string>();
    previewEdges.forEach((edge) => {
      if (edge.type === "negation") {
        const targetNode = previewNodes.find((n) => n.id === edge.target);
        const sourceNode = previewNodes.find((n) => n.id === edge.source);
        if (targetNode?.type === "statement" && sourceNode?.type === "point") {
          pointParentMap.set(sourceNode.id, "statement");
        }
      }
    });

    previewNodes.forEach((node) => {
      if (node.type === "statement") {
        finalNodes.push({
          id: "statement",
          type: "statement",
          position: node.position,
          data: { statement: statementNodeContent.title },
        });
      } else if (node.type === "point") {
        const finalId = finalPointIdMap.get(node.id);
        if (finalId !== undefined) {
          finalNodes.push({
            id: `point-${finalId}`,
            type: "point",
            position: node.position,
            data: {
              pointId: finalId,
              parentId: pointParentMap.get(node.id) || undefined,
            },
          });
        }
      }
    });

    previewEdges.forEach((edge) => {
      const sourceFinalId = finalPointIdMap.get(edge.source);
      const targetFinalId = finalPointIdMap.get(edge.target);
      const sourceNode = previewNodes.find((n) => n.id === edge.source);
      const targetNode = previewNodes.find((n) => n.id === edge.target);

      let finalSourceId: string | undefined;
      let finalTargetId: string | undefined;

      if (sourceNode?.type === "statement") finalSourceId = "statement";
      else if (sourceFinalId !== undefined)
        finalSourceId = `point-${sourceFinalId}`;

      if (targetNode?.type === "statement") finalTargetId = "statement";
      else if (targetFinalId !== undefined)
        finalTargetId = `point-${targetFinalId}`;

      if (finalSourceId && finalTargetId) {
        if (edge.type === "negation") {
          finalEdges.push({
            id: edge.id,
            source: finalTargetId,
            target: finalSourceId,
            type: "negation",
          });
        } else {
          finalEdges.push({
            id: edge.id,
            source: finalSourceId,
            target: finalTargetId,
            type: edge.type,
          });
        }
      }
    });

    console.log("[createRationaleFromPreview] finalNodes:", finalNodes);
    console.log("[createRationaleFromPreview] finalEdges:", finalEdges);
    const finalGraph: ViewpointGraph = { nodes: finalNodes, edges: finalEdges };
    console.log(
      "[createRationaleFromPreview] finalGraph before DB insert:",
      finalGraph
    );

    const newViewpointId = `vp_${nanoid()}`;
    await db.insert(viewpointsTable).values({
      id: newViewpointId,
      title: statementNodeContent.title,
      description: statementNodeContent.description,
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
