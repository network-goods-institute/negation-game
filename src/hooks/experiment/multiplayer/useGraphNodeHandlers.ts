import React from "react";
import { useReactFlow } from "@xyflow/react";
import { toast } from "sonner";import { logger } from "@/lib/logger";
import { useNodeDragSnapping } from "./useNodeDragSnapping";

interface UseGraphNodeHandlersProps {
  graph: any;
  grabMode?: boolean;
  selectMode: boolean;
  onNodeClick?: (e: any, node: any) => void;
  onNodeDragStart?: (e: any, node: any) => void;
  onNodeDragStop?: (e: any, node: any) => void;
  altCloneMapRef: React.MutableRefObject<
    Map<string, { dupId: string; origin: { x: number; y: number } }>
  >;
}

export const useGraphNodeHandlers = ({
  graph,
  grabMode,
  selectMode,
  onNodeClick,
  onNodeDragStart,
  onNodeDragStop,
  altCloneMapRef,
}: UseGraphNodeHandlersProps) => {
  const rf = useReactFlow();
  const [draggedNodeId, setDraggedNodeId] = React.useState<string | null>(null);
  const [draggedPosition, setDraggedPosition] = React.useState<{ x: number; y: number } | null>(null);

  const snapResult = useNodeDragSnapping({
    draggedNodeId,
    draggedPosition,
    enabled: true,
  });

  const handleNodeClick = React.useCallback(
    (e: any, node: any) => {
      if (grabMode) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Mindchange directional pick: if in mindchange mode, only allow valid picks
      try {
        if (
          (graph as any)?.mindchangeMode &&
          (graph as any)?.mindchangeEdgeId
        ) {
          const mcEdgeId = String((graph as any)?.mindchangeEdgeId);
          const allEdges = rf.getEdges();
          const mcEdge = allEdges.find((ed: any) => String(ed.id) === mcEdgeId);
          if (mcEdge) {
            if ((mcEdge as any).type === "objection") {
              // Valid pick is the objection node itself (source). Base edge is handled by edge click.
              const isObjectionNode =
                String(mcEdge.source) === String(node?.id);
              if (isObjectionNode) {
                (graph as any)?.setSelectedEdge?.(mcEdge.id);
                (graph as any)?.setMindchangeNextDir?.("forward");
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              // Block other node clicks while in mindchange mode
              e.preventDefault();
              e.stopPropagation();
              return;
            } else {
              // Negation/support/etc.: valid picks are the two endpoints
              const isSource = String(mcEdge.source) === String(node?.id);
              const isTarget = String(mcEdge.target) === String(node?.id);
              if (isSource || isTarget) {
                const dir = isSource ? "forward" : "backward";
                try {
                  logger.log("[Mindchange:Select] node pick", {
                    baseEdgeId: mcEdge.id,
                    pickedNodeId: node?.id,
                    dir,
                  });
                } catch {}
                (graph as any)?.setSelectedEdge?.(mcEdge.id);
                (graph as any)?.setMindchangeNextDir?.(dir);
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              // Block other node clicks while in mindchange mode
              e.preventDefault();
              e.stopPropagation();
              return;
            }
          } else {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }
      } catch {}

      if (e.shiftKey && selectMode) {
        e.preventDefault();
        e.stopPropagation();

        const currentNodes = rf.getNodes();
        const currentNode = currentNodes.find((n: any) => n.id === node.id);

        if (currentNode) {
          const updatedNodes = currentNodes.map((n: any) =>
            n.id === node.id ? { ...n, selected: !n.selected } : n
          );
          rf.setNodes(updatedNodes);
        }
        return;
      }

      onNodeClick?.(e, node);
    },
    [grabMode, selectMode, rf, onNodeClick, graph]
  );

  const handleNodeDragStart = React.useCallback(
    (e: any, node: any) => {
      setDraggedNodeId(node.id);
      setDraggedPosition(node.position);
      onNodeDragStart?.(e, node);
      try {
        // Block dragging a node if any objection connected to an edge with this node as endpoint is being edited
        try {
          const edgesAll = rf.getEdges();
          const nodesAll = rf.getNodes();
          const relatedObjections = nodesAll.filter(
            (n: any) => n.type === "objection" && n.data?.parentEdgeId
          );
          for (const obj of relatedObjections) {
            const base = edgesAll.find(
              (ed: any) => ed.id === obj.data.parentEdgeId
            );
            if (!base) continue;
            const isEndpoint =
              String(base.source) === node.id ||
              String(base.target) === node.id;
            if (!isEndpoint) continue;
            const editors = graph?.getEditorsForNode?.(obj.id) || [];
            if (editors.length > 0) {
              e?.preventDefault?.();
              e?.stopPropagation?.();
              toast.warning(`Locked by ${editors[0]?.name || "another user"}`);
              return;
            }
          }
        } catch {}

        if ((node as any)?.type === "objection") {
          const allEdges = rf.getEdges();
          const objEdge = allEdges.find(
            (ed: any) =>
              (ed.type || "") === "objection" && ed.source === node.id
          );
          if (objEdge) {
            const anchorId = String(objEdge.target || "");
            const anchor: any = rf.getNode(anchorId);
            if (anchor && anchor.type === "edge_anchor") {
              const parentEdgeId: string | undefined =
                anchor.data?.parentEdgeId;
              if (parentEdgeId) {
                graph.ensureEdgeAnchor?.(
                  anchor.id,
                  parentEdgeId,
                  anchor.position?.x ?? 0,
                  anchor.position?.y ?? 0
                );
              }
            } else {
              // Anchor not in local RF yet; derive parent edge id from target and ensure presence using midpoint
              const parentEdgeId = anchorId.startsWith("anchor:")
                ? anchorId.slice("anchor:".length)
                : null;
              if (parentEdgeId) {
                const base = allEdges.find((e: any) => e.id === parentEdgeId);
                if (base) {
                  const src = rf.getNode(String(base.source));
                  const tgt = rf.getNode(String(base.target));
                  const midX =
                    (((src as any)?.position?.x ?? 0) +
                      ((tgt as any)?.position?.x ?? 0)) /
                    2;
                  const midY =
                    (((src as any)?.position?.y ?? 0) +
                      ((tgt as any)?.position?.y ?? 0)) /
                    2;
                  graph.ensureEdgeAnchor?.(anchorId, parentEdgeId, midX, midY);
                }
              }
            }
          }
        }
      } catch {}

      // Option/Alt-drag to duplicate: create duplicate at start and route movement to it
      try {
        if (
          (e?.altKey || e?.nativeEvent?.altKey) &&
          String(node?.type) !== "edge_anchor"
        ) {
          const originX = node?.position?.x ?? 0;
          const originY = node?.position?.y ?? 0;
          const flowPos = rf.screenToFlowPosition({
            x: e.clientX,
            y: e.clientY,
          });
          const dx = flowPos.x - originX;
          const dy = flowPos.y - originY;
          const dupId = graph?.duplicateNodeWithConnections?.(node.id, {
            x: dx,
            y: dy,
          });
          if (dupId) {
            altCloneMapRef.current.set(String(node.id), {
              dupId: String(dupId),
              origin: { x: originX, y: originY },
            });
            try {
              graph?.unlockNode?.(node.id);
            } catch {}
            try {
              graph?.lockNode?.(String(dupId), "drag");
            } catch {}
          }
        }
      } catch {}
    },
    [rf, graph, onNodeDragStart, altCloneMapRef]
  );

  const handleNodeDrag = React.useCallback(
    (_: any, node: any) => {
      try {
        setDraggedPosition(node.position);

        const mapping = altCloneMapRef.current.get(String(node.id));
        if (mapping) {
          graph.updateNodePosition?.(
            mapping.dupId,
            node.position?.x ?? 0,
            node.position?.y ?? 0
          );
          graph.updateNodePosition?.(
            node.id,
            mapping.origin.x,
            mapping.origin.y
          );
        } else {
          const finalX = snapResult?.x ?? node.position?.x ?? 0;
          const finalY = snapResult?.y ?? node.position?.y ?? 0;
          graph.updateNodePosition?.(
            node.id,
            finalX,
            finalY
          );
        }
      } catch {}
    },
    [graph, altCloneMapRef, snapResult]
  );

  const handleNodeDragStop = React.useCallback(
    (e: any, node: any) => {
      setDraggedNodeId(null);
      setDraggedPosition(null);
      onNodeDragStop?.(e, node);
      graph?.stopCapturing?.();
      const mapping = altCloneMapRef.current.get(String(node.id));
      if (mapping) {
        graph?.unlockNode?.(mapping.dupId);
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        altCloneMapRef.current.delete(String(node.id));
      }
    },
    [graph, onNodeDragStop, altCloneMapRef]
  );

  return {
    handleNodeClick,
    handleNodeDragStart,
    handleNodeDrag,
    handleNodeDragStop,
    snapResult,
  };
};
