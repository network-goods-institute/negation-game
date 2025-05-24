import { useEffect, useState } from "react";
import { useReactFlow, Node } from "@xyflow/react";
import { PreviewAppNode, PreviewAppEdge } from "@/types/rationaleGraph";
import { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { PreviewStatementNodeData } from "@/components/chatbot/preview/PreviewStatementNode";
import { PreviewPointNodeData } from "@/components/chatbot/preview/PreviewPointNode";
import { PreviewAddPointNodeData } from "@/components/chatbot/preview/PreviewAddPointNode";

interface UseRationaleGraphLayoutProps {
  graphData: ViewpointGraph;
  nodes: PreviewAppNode[];
  edges: PreviewAppEdge[];
  setNodes: (
    nodes:
      | PreviewAppNode[]
      | ((prevNodes: PreviewAppNode[]) => PreviewAppNode[])
  ) => void;
  setEdges: (
    edges:
      | PreviewAppEdge[]
      | ((prevEdges: PreviewAppEdge[]) => PreviewAppEdge[])
  ) => void;
}

export function useRationaleGraphLayout({
  graphData,
  nodes: currentNodesFromState,
  edges: currentEdgesFromState,
  setNodes,
  setEdges,
}: UseRationaleGraphLayoutProps) {
  const [lastGraphDataHash, setLastGraphDataHash] = useState("");
  const reactFlowInstance = useReactFlow<PreviewAppNode, PreviewAppEdge>();

  useEffect(() => {
    if (!graphData) return;

    const newGraphHash = JSON.stringify({
      nodes: graphData.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        data: n.data,
      })),
      edges: graphData.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
    });

    if (newGraphHash === lastGraphDataHash) return;
    setLastGraphDataHash(newGraphHash);

    const currentNodesMap = new Map(
      currentNodesFromState.map((node) => [node.id, node])
    );
    const incomingNodesMap = new Map(
      graphData.nodes.map((node) => [node.id, node as Node])
    ); // Cast to Node

    const verticalSpacing = 150;
    const estimatedNodeWidth = 280;
    const estimatedNodeHeight = 140;
    const horizontalGap = 40;
    const siblingGroupWidth = estimatedNodeWidth + horizontalGap;
    let orphanCascadeY = 50;
    const orphanCascadeX = -200;
    const collisionPadding = 15;
    const maxCollisionIterations = 8;

    const processedNodes: PreviewAppNode[] = graphData.nodes.map(
      (incomingNodeDoc) => {
        const incomingNode = incomingNodeDoc as Node; // Treat as basic Node for structure
        const existingNode = currentNodesMap.get(incomingNode.id) as
          | PreviewAppNode
          | undefined;

        if (existingNode) {
          let finalNodeData:
            | PreviewStatementNodeData
            | PreviewPointNodeData
            | PreviewAddPointNodeData = { ...(existingNode.data as any) };

          if (existingNode.type === "point" && incomingNode.type === "point") {
            const incomingAsPreviewPointData =
              incomingNode.data as unknown as PreviewPointNodeData;
            finalNodeData = {
              content: incomingAsPreviewPointData.content,
              cred:
                incomingAsPreviewPointData.cred !== undefined
                  ? incomingAsPreviewPointData.cred
                  : (existingNode.data as PreviewPointNodeData).cred,
            };
          } else if (
            existingNode.type === "statement" &&
            incomingNode.type === "statement"
          ) {
            finalNodeData = {
              ...(incomingNode.data as unknown as PreviewStatementNodeData),
            };
          } else if (
            existingNode.type === "addPoint" &&
            incomingNode.type === "addPoint"
          ) {
            finalNodeData = {
              ...(incomingNode.data as unknown as PreviewAddPointNodeData),
            };
          } else if (existingNode.type !== incomingNode.type) {
            if (incomingNode.type === "point")
              finalNodeData =
                incomingNode.data as unknown as PreviewPointNodeData;
            else if (incomingNode.type === "statement")
              finalNodeData =
                incomingNode.data as unknown as PreviewStatementNodeData;
            else if (incomingNode.type === "addPoint")
              finalNodeData =
                incomingNode.data as unknown as PreviewAddPointNodeData;
          } else {
            finalNodeData = { ...(incomingNode.data as any) };
          }

          return {
            ...existingNode,
            id: incomingNode.id,
            type: incomingNode.type as "point" | "statement" | "addPoint",
            data: finalNodeData,
            position: existingNode.position,
          } as PreviewAppNode;
        } else {
          let newNodeData:
            | PreviewStatementNodeData
            | PreviewPointNodeData
            | PreviewAddPointNodeData;
          if (incomingNode.type === "point")
            newNodeData = incomingNode.data as unknown as PreviewPointNodeData;
          else if (incomingNode.type === "statement")
            newNodeData =
              incomingNode.data as unknown as PreviewStatementNodeData;
          else if (incomingNode.type === "addPoint")
            newNodeData =
              incomingNode.data as unknown as PreviewAddPointNodeData;
          else
            newNodeData = {
              content: "Unknown Type",
              cred: 0,
            } as unknown as PreviewPointNodeData;

          return {
            id: incomingNode.id,
            type: incomingNode.type as "point" | "statement" | "addPoint",
            data: newNodeData,
            position: { x: NaN, y: NaN },
          } as PreviewAppNode;
        }
      }
    );

    let nodesToLayout = processedNodes.filter((n) => isNaN(n.position.x));
    const finalPositions = new Map<string, { x: number; y: number }>(
      processedNodes
        .filter((n) => !isNaN(n.position.x))
        .map((n) => [n.id, n.position])
    );

    let layoutIterations = 0;
    const MAX_HIERARCHICAL_ITERATIONS = nodesToLayout.length + 5;

    while (
      nodesToLayout.length > 0 &&
      layoutIterations < MAX_HIERARCHICAL_ITERATIONS
    ) {
      let positionedThisIteration = 0;
      const nextNodesToLayout = [];

      for (const node of nodesToLayout) {
        const edgeToThisNode = graphData.edges.find(
          (edge) => edge.target === node.id
        );

        if (!edgeToThisNode || !incomingNodesMap.has(edgeToThisNode.source)) {
          finalPositions.set(node.id, { x: orphanCascadeX, y: orphanCascadeY });
          orphanCascadeY += verticalSpacing * 0.75;
          positionedThisIteration++;
        } else {
          const parentId = edgeToThisNode.source;
          if (finalPositions.has(parentId)) {
            const parentPosition = finalPositions.get(parentId)!;

            const siblingNodesInLayoutPass = nodesToLayout.filter((sibling) => {
              const edgeToSibling = graphData.edges.find(
                (e) => e.target === sibling.id
              );
              return edgeToSibling && edgeToSibling.source === parentId;
            });

            const numSiblings = siblingNodesInLayoutPass.length;
            const totalWidth =
              numSiblings * estimatedNodeWidth +
              Math.max(0, numSiblings - 1) * horizontalGap;
            const startX =
              parentPosition.x - totalWidth / 2 + estimatedNodeWidth / 2;

            siblingNodesInLayoutPass.forEach((sibling, index) => {
              if (!finalPositions.has(sibling.id)) {
                const posX = startX + index * siblingGroupWidth;
                const posY = parentPosition.y + verticalSpacing;
                finalPositions.set(sibling.id, { x: posX, y: posY });
                positionedThisIteration++;
              }
            });
          } else {
            nextNodesToLayout.push(node);
          }
        }
      }
      nodesToLayout = nextNodesToLayout.filter(
        (n) => !finalPositions.has(n.id)
      );
      layoutIterations++;
      if (positionedThisIteration === 0 && nodesToLayout.length > 0) {
        nodesToLayout.forEach((n) => {
          if (!finalPositions.has(n.id)) {
            finalPositions.set(n.id, { x: orphanCascadeX, y: orphanCascadeY });
            orphanCascadeY += verticalSpacing * 0.75;
          }
        });
        break;
      }
    }

    let layoutAppliedNodes: PreviewAppNode[] = processedNodes
      .map((node) => ({
        ...node,
        position: finalPositions.get(node.id) || node.position,
      }))
      .filter((node) => incomingNodesMap.has(node.id)); // Ensure only nodes present in incoming graphData are kept

    // --- Collision Avoidance Pass ---
    for (let iter = 0; iter < maxCollisionIterations; iter++) {
      let collisionsFoundThisIteration = false;
      for (let i = 0; i < layoutAppliedNodes.length; i++) {
        for (let j = i + 1; j < layoutAppliedNodes.length; j++) {
          const nodeA = layoutAppliedNodes[i];
          const nodeB = layoutAppliedNodes[j];

          const effectiveWidthA =
            (nodeA.width || estimatedNodeWidth) + collisionPadding;
          const effectiveHeightA =
            (nodeA.height || estimatedNodeHeight) + collisionPadding;
          const effectiveWidthB =
            (nodeB.width || estimatedNodeWidth) + collisionPadding;
          const effectiveHeightB =
            (nodeB.height || estimatedNodeHeight) + collisionPadding;

          const centerAx = nodeA.position.x + effectiveWidthA / 2;
          const centerAy = nodeA.position.y + effectiveHeightA / 2;
          const centerBx = nodeB.position.x + effectiveWidthB / 2;
          const centerBy = nodeB.position.y + effectiveHeightB / 2;

          const dx = centerAx - centerBx;
          const dy = centerAy - centerBy;

          const minDistanceX = effectiveWidthA / 2 + effectiveWidthB / 2;
          const minDistanceY = effectiveHeightA / 2 + effectiveHeightB / 2;

          const overlapX = minDistanceX - Math.abs(dx);
          const overlapY = minDistanceY - Math.abs(dy);

          if (overlapX > 0 && overlapY > 0) {
            collisionsFoundThisIteration = true;
            const pushFactor = 0.3;

            if (overlapX < overlapY) {
              const push = (dx < 0 ? -overlapX : overlapX) * pushFactor;
              nodeA.position = {
                ...nodeA.position,
                x: nodeA.position.x + push / 2,
              };
              nodeB.position = {
                ...nodeB.position,
                x: nodeB.position.x - push / 2,
              };
            } else {
              const push = (dy < 0 ? -overlapY : overlapY) * pushFactor;
              nodeA.position = {
                ...nodeA.position,
                y: nodeA.position.y + push / 2,
              };
              nodeB.position = {
                ...nodeB.position,
                y: nodeB.position.y - push / 2,
              };
            }
          }
        }
      }
      if (!collisionsFoundThisIteration) break;
    }

    // --- Final Check & Update React Flow State ---
    const stringifyNodeForCompare = (n: PreviewAppNode) =>
      JSON.stringify({
        id: n.id,
        x: n.position.x,
        y: n.position.y,
        data: n.data,
        type: n.type,
      });
    const stringifyEdgeForCompare = (e: PreviewAppEdge) =>
      JSON.stringify({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
      });

    const currentNodesComparable = currentNodesFromState
      .map(stringifyNodeForCompare)
      .sort()
      .join(",");
    const finalNodesComparable = layoutAppliedNodes
      .map(stringifyNodeForCompare)
      .sort()
      .join(",");
    const areNodesEqual = currentNodesComparable === finalNodesComparable;

    const currentEdgesComparable = currentEdgesFromState
      .map(stringifyEdgeForCompare)
      .sort()
      .join(",");
    const finalEdgesComparable = graphData.edges
      .map((e) => stringifyEdgeForCompare(e as PreviewAppEdge))
      .sort()
      .join(",");
    const areEdgesEqual = currentEdgesComparable === finalEdgesComparable;

    let nodesActuallyChanged = false;
    if (!areNodesEqual) {
      setNodes(layoutAppliedNodes);
      nodesActuallyChanged = true;
    }

    let edgesActuallyChanged = false;
    if (!areEdgesEqual) {
      setEdges(graphData.edges as PreviewAppEdge[]);
      edgesActuallyChanged = true;
    }

    if ((nodesActuallyChanged || edgesActuallyChanged) && reactFlowInstance) {
      requestAnimationFrame(() => {
        reactFlowInstance.fitView({ duration: 600, padding: 0.15 });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    graphData,
    lastGraphDataHash,
    setLastGraphDataHash,
    setNodes,
    setEdges,
    reactFlowInstance,
  ]);
}
