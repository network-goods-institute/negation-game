"use server";

import { db } from "@/services/db";
import { viewpointsTable } from "@/db/tables/viewpointsTable";
import { makePoint } from "@/actions/makePoint";
import { endorse } from "@/actions/endorse";
import { nanoid } from "nanoid";
import { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { Node as ReactFlowNode, Edge as ReactFlowEdge } from "@xyflow/react";
import { PreviewPointNodeData } from "@/components/chatbot/PreviewPointNode";
import { PreviewStatementNodeData } from "@/components/chatbot/PreviewStatementNode";
import { AppNode } from "@/components/graph/AppNode";
import { AppEdge } from "@/components/graph/AppEdge";

interface CreateRationaleParams {
  userId: string;
  spaceId: string;
  title: string;
  description: string;
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
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
      "[createRationaleFromPreview] Starting node and point creation processing"
    );
    for (const node of previewNodes) {
      if (node.type === "statement") {
        const data = node.data as PreviewStatementNodeData;
        statementNodeContent = {
          title: data.statement || title,
          description,
        };
      } else if (node.type === "point") {
        const data = node.data as PreviewPointNodeData;
        const existingPointId = resolvedMappings.get(node.id);
        let finalPointId: number;
        if (existingPointId != null) {
          finalPointId = existingPointId as number;
        } else {
          finalPointId = await makePoint({ content: data.content, cred: 0 });
        }
        finalPointIdMap.set(node.id, finalPointId);
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

    const finalNodes: ReactFlowNode[] = [];
    const finalEdges: ReactFlowEdge[] = [];

    console.log(
      "[createRationaleFromPreview] finalPointIdMap:",
      Array.from(finalPointIdMap.entries())
    );

    // First create all nodes and build an ID mapping
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
          // Determine parent preview ID then map to final ID
          const parentEdge = previewEdges.find((e) => e.target === node.id);
          const parentPreviewId = parentEdge?.source || "statement";
          const parentFinalId = previewToFinalIdMap.get(parentPreviewId)!;

          finalNodes.push({
            id: nodeId,
            type: "point",
            position: node.position || { x: 0, y: 0 },
            data: {
              content: (node.data as PreviewPointNodeData).content,
              pointId: finalId,
              parentId: parentFinalId,
              hasContent: true,
            },
          });
          previewToFinalIdMap.set(node.id, nodeId);
        }
      }
    });

    // Create edges: always connect child -> parent, type based on preview source
    previewEdges.forEach((edge) => {
      // Map preview source/target to final IDs
      const parentFinalId = previewToFinalIdMap.get(edge.source);
      const childFinalId = previewToFinalIdMap.get(edge.target);
      if (!parentFinalId || !childFinalId) return;
      const edgeType = edge.source === "statement" ? "negation" : "statement";
      finalEdges.push({
        id: `edge-${nanoid()}`,
        type: edgeType,
        // child -> parent orientation
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

    console.log(
      "[createRationaleFromPreview] finalGraph before DB insert:",
      JSON.stringify(finalGraph, null, 2)
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
