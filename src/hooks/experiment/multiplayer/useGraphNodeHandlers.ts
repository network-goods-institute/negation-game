import React from "react";
import { useReactFlow } from "@xyflow/react";
import { toast } from "sonner";

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

  const handleNodeClick = React.useCallback(
    (e: any, node: any) => {
      if (grabMode) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

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
    [grabMode, selectMode, rf, onNodeClick]
  );

  const handleNodeDragStart = React.useCallback(
    (e: any, node: any) => {
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
          (node?.type === "point" || node?.type === "objection" || node?.type === "statement")
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
          graph.updateNodePosition?.(
            node.id,
            node.position?.x ?? 0,
            node.position?.y ?? 0
          );
        }
      } catch {}
    },
    [graph, altCloneMapRef]
  );

  const handleNodeDragStop = React.useCallback(
    (e: any, node: any) => {
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
  };
};
