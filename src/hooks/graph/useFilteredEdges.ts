"use client";

import { useMemo } from "react";
import type { Edge } from "@xyflow/react";
import type { AppNode } from "@/components/graph/nodes/AppNode";

/**
 * Filters out edges not connected to current nodes and removes duplicates by source-target.
 */
export function useFilteredEdges(nodes: AppNode[], edges: Edge[]): Edge[] {
  return useMemo(() => {
    // Include only edges connecting visible nodes
    const visibleEdges = edges.filter(
      (e) =>
        nodes.some((n) => n.id === e.source) &&
        nodes.some((n) => n.id === e.target)
    );

    // Remove duplicate edges based on source-target *and* edge type
    const edgeMap = new Map<string, Edge>();
    const uniqueEdges: Edge[] = [];

    for (const edge of visibleEdges) {
      const key = `${edge.source}->${edge.target}:${edge.type ?? "default"}`;
      if (!edgeMap.has(key)) {
        edgeMap.set(key, edge);
        uniqueEdges.push(edge);
      }
    }

    return uniqueEdges;
  }, [nodes, edges]);
}
