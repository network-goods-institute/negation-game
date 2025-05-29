import { useEffect, useState } from "react";
import { useReactFlow, Node } from "@xyflow/react";
import { PreviewAppNode, PreviewAppEdge } from "@/types/rationaleGraph";
import { ViewpointGraph } from "@/atoms/viewpointAtoms";

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
  const reactFlowInstance = useReactFlow<PreviewAppNode, PreviewAppEdge>();

  useEffect(() => {
    if (!graphData) return;
    const HSPACE = 320;
    const VSPACE = 150;

    const oldPos = new Map<string, { x: number; y: number }>();
    currentNodesFromState.forEach((n) => oldPos.set(n.id, n.position));

    const nodeMap = new Map<string, PreviewAppNode>();
    graphData.nodes.forEach((n) => {
      const copy = { ...n } as PreviewAppNode;
      copy.position = oldPos.get(n.id) ?? { x: NaN, y: NaN };
      nodeMap.set(n.id, copy);
    });

    const childrenMap = new Map<string, string[]>();
    graphData.edges.forEach((e) => {
      const arr = childrenMap.get(e.source) || [];
      arr.push(e.target);
      childrenMap.set(e.source, arr);
    });

    const incoming = new Set(graphData.edges.map((e) => e.target));
    const roots: PreviewAppNode[] = graphData.nodes
      .filter((n) => !incoming.has(n.id))
      .map((n) => nodeMap.get(n.id)!);

    let anyNew = false;
    const queue = [...roots];
    while (queue.length) {
      const parent = queue.shift()!;
      const kids = childrenMap.get(parent.id) || [];
      const count = kids.length;
      kids.forEach((childId, idx) => {
        const child = nodeMap.get(childId)!;
        if (!oldPos.has(childId)) {
          const x = parent.position.x + (idx - (count - 1) / 2) * HSPACE;
          const y = parent.position.y + VSPACE;
          child.position = { x, y };
          anyNew = true;
        }
        queue.push(child);
      });
    }

    if (anyNew) {
      setNodes(Array.from(nodeMap.values()));
      if (reactFlowInstance) {
        requestAnimationFrame(() => {
          reactFlowInstance.fitView({ duration: 600, padding: 0.15 });
        });
      }
    }
  }, [graphData, setNodes, reactFlowInstance]);
}
