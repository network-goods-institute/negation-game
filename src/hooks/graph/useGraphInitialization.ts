"use client";

import { useEffect, useLayoutEffect, Dispatch, SetStateAction } from "react";
import type { ReactFlowInstance, Node, Edge } from "@xyflow/react";

export interface GraphInitializationParams<N extends Node<any>> {
  flowInstance: ReactFlowInstance<any> | null;
  defaultNodes?: N[];
  defaultEdges?: Edge[];
  nodes: N[];
  edges: Edge[];
  setNodes: Dispatch<SetStateAction<N[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
}

/**
 * Ensures default nodes/edges load and fixes copy-related layout issues.
 */
export function useGraphInitialization<N extends Node<any>>({
  flowInstance,
  defaultNodes,
  defaultEdges,
  nodes,
  edges,
  setNodes,
  setEdges,
}: GraphInitializationParams<N>) {
  // Load defaults if state is empty
  useEffect(() => {
    if (
      (nodes == null || nodes.length === 0) &&
      defaultNodes &&
      defaultNodes.length > 0
    ) {
      setNodes(defaultNodes);
    }
    if (
      (edges == null || edges.length === 0) &&
      defaultEdges &&
      defaultEdges.length > 0
    ) {
      setEdges(defaultEdges);
    }
  }, [nodes, edges, defaultNodes, defaultEdges, setNodes, setEdges]);

  // Fix missing nodes/edges after copy operations
  useLayoutEffect(() => {
    if (
      flowInstance &&
      defaultNodes &&
      defaultNodes.length > 0 &&
      nodes.length === 0
    ) {
      const timer = setTimeout(() => {
        setNodes([...defaultNodes]);
        flowInstance.setNodes(defaultNodes);
        if (defaultEdges && defaultEdges.length > 0) {
          setEdges([...defaultEdges]);
          flowInstance.setEdges(defaultEdges);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [
    flowInstance,
    defaultNodes,
    defaultEdges,
    nodes.length,
    setNodes,
    setEdges,
  ]);
}
