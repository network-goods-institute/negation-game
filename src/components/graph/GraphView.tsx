"use client";

import { AddPointNode } from "@/components/graph/AddPointNode";
import { AppNode } from "@/components/graph/AppNode";
import { NegationEdge } from "@/components/graph/NegationEdge";
import { PointNode } from "@/components/graph/PointNode";
import { StatementNode } from "@/components/graph/StatementNode";
import { Button } from "@/components/ui/button";
import {
  Background,
  BackgroundVariant,
  ColorMode,
  Controls,
  Edge,
  EdgeChange,
  MiniMap,
  NodeChange,
  Panel,
  ReactFlow,
  ReactFlowInstance,
  ReactFlowProps,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { XIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useMemo, useEffect, useState } from "react";
import { useEditMode as localEditMode } from "./EditModeContext";
import { useSetAtom, useAtom } from "jotai";
import { collapsedPointIdsAtom } from "@/app/s/[space]/viewpoint/viewpointAtoms";
import { ViewpointGraph } from "@/app/s/[space]/viewpoint/viewpointAtoms";
import React from "react";
import { updateViewpointGraph } from "@/actions/updateViewpointGraph";
import { useParams, useRouter } from "next/navigation";
import { useBasePath } from "@/hooks/useBasePath";
import {
  viewpointStatementAtom,
  viewpointReasoningAtom,
  viewpointGraphAtom,
} from "@/app/s/[space]/viewpoint/viewpointAtoms";
import { useViewpoint } from "@/queries/useViewpoint";
import { AuthenticatedActionButton } from "@/components/ui/button";

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): {
  (...args: Parameters<T>): void;
  cancel: () => void;
} {
  let timeout: NodeJS.Timeout | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced;
}

export interface GraphViewProps
  extends Omit<ReactFlowProps<AppNode>, "onDelete"> {
  onSaveChanges?: () => void;
  canModify?: boolean;
  rootPointId?: number;
  statement?: string;
  onClose?: () => void;
  closeButtonClassName?: string;
  editFlowInstance?: ReactFlowInstance<AppNode> | null;
  setLocalGraph?: (graph: ViewpointGraph) => void;
  isSaving?: boolean;
  isNew?: boolean;
}

export const GraphView = ({
  rootPointId,
  statement: statement,
  onClose,
  closeButtonClassName,
  onNodesChange: onNodesChangeProp,
  onEdgesChange: onEdgesChangeProp,
  onSaveChanges,
  setLocalGraph,
  isSaving,
  canModify,
  isNew,
  ...props
}: GraphViewProps) => {
  const [collapsedPointIds] = useAtom(collapsedPointIdsAtom);
  const [flowInstance, setFlowInstance] =
    useState<ReactFlowInstance<AppNode> | null>(null);
  const [nodes, setNodes, onNodesChangeDefault] = useNodesState<AppNode>([]);
  const [edges, setEdges, onEdgesChangeDefault] = useEdgesState<Edge>([]);
  const { theme } = useTheme();
  const editMode = localEditMode();
  const setCollapsedPointIds = useSetAtom(collapsedPointIdsAtom);
  const router = useRouter();
  const basePath = useBasePath();
  const setStatement = useSetAtom(viewpointStatementAtom);
  const setReasoning = useSetAtom(viewpointReasoningAtom);
  const setNewGraph = useSetAtom(viewpointGraphAtom);

  // Get the current viewpoint ID from the route params first
  const params = useParams();
  const viewpointId = params.viewpointId as string;

  // Then use it in the hook
  const { data: viewpoint } = useViewpoint(viewpointId, {
    enabled: !isNew,
  });

  // Debounced function to update localGraph
  const debouncedSetLocalGraph = useMemo(
    () =>
      debounce((graph: ViewpointGraph) => {
        setLocalGraph?.(graph);
      }, 250),
    [setLocalGraph]
  );

  // Debounced function to update global graph (non-edit mode)
  const debouncedSetGraph = useMemo(
    () =>
      debounce((graph: ViewpointGraph) => {
        setLocalGraph?.(graph);
      }, 250),
    [setLocalGraph]
  );

  // Filter nodes and edges based on collapsedPointIds
  const filteredNodes = useMemo(() => {
    if (!editMode) return nodes;
    return nodes.filter((n) => {
      return n.type !== "point" || !collapsedPointIds.has(n.data.pointId as number);
    });
  }, [nodes, collapsedPointIds, editMode]);

  const filteredEdges = useMemo(() => {
    if (!editMode) return edges;
    return edges.filter(
      (e) =>
        filteredNodes.some((n) => n.id === e.source) &&
        filteredNodes.some((n) => n.id === e.target)
    );
  }, [edges, filteredNodes, editMode]);

  const onNodesChange = useCallback(
    (nodes: NodeChange<AppNode>[]) => {
      if (editMode) {
        onNodesChangeDefault(nodes);
        onNodesChangeProp?.(nodes);

        if (flowInstance && setLocalGraph) {
          const { viewport, ...graph } = flowInstance.toObject();
          debouncedSetLocalGraph(graph);
        }
      }
    },
    [
      onNodesChangeDefault,
      onNodesChangeProp,
      editMode,
      flowInstance,
      setLocalGraph,
      debouncedSetLocalGraph,
    ]
  );

  const onEdgesChange = useCallback(
    (edges: EdgeChange[]) => {
      if (editMode) {
        onEdgesChangeDefault(edges);
        onEdgesChangeProp?.(edges);
        if (flowInstance && setLocalGraph) {
          const { viewport, ...graph } = flowInstance.toObject();
          debouncedSetLocalGraph(graph);
        }
      }
    },
    [
      onEdgesChangeDefault,
      onEdgesChangeProp,
      setLocalGraph,
      editMode,
      flowInstance,
      debouncedSetLocalGraph,
    ]
  );

  // Cleanup both debounced functions on unmount
  useEffect(() => {
    return () => {
      debouncedSetLocalGraph.cancel();
      debouncedSetGraph.cancel();
    };
  }, [debouncedSetLocalGraph, debouncedSetGraph]);

  // Memoize nodeTypes and edgeTypes
  const nodeTypes = useMemo(
    () => ({
      point: (props: any) => <PointNode {...props} />,
      statement: StatementNode,
      addPoint: AddPointNode,
    }),
    []
  );

  const edgeTypes = useMemo(() => ({ negation: NegationEdge }), []);

  const { defaultNodes, defaultEdges, onInit, ...otherProps } = props;
  const effectiveProps = editMode
    ? otherProps
    : {
      ...otherProps,
      defaultNodes,
      defaultEdges,
      ...(onInit && { onInit }),
    };

  useEffect(() => {
    if (editMode) {
      if (
        (!nodes || nodes.length === 0) &&
        defaultNodes &&
        defaultNodes.length > 0
      ) {
        setNodes(defaultNodes);
      }
      if (
        (!edges || edges.length === 0) &&
        defaultEdges &&
        defaultEdges.length > 0
      ) {
        setEdges(defaultEdges);
      }
    }
  }, [editMode, nodes, edges, defaultNodes, defaultEdges, setNodes, setEdges]);

  const handleSave = useCallback(
    async () => {
      if (!canModify) {
        if (!flowInstance || !viewpoint) return;

        // Filter out collapsed nodes/edges
        const filteredNodes = nodes.filter((n) => {
          return n.type !== "point" || !collapsedPointIds.has(n.data.pointId as number)
        });
        const filteredEdges = edges.filter((e) =>
          filteredNodes.some((n) => n.id === e.source) &&
          filteredNodes.some((n) => n.id === e.target)
        );

        // Set up the new viewpoint data using the atoms
        setStatement(viewpoint.title + " (copy)");
        setReasoning(viewpoint.description);
        setNewGraph({ nodes: filteredNodes, edges: filteredEdges });

        // Navigate to new viewpoint page - no query params needed
        router.push(`${basePath}/viewpoint/new`);
        return;
      }

      // Existing save logic for when canModify is true
      if (!flowInstance) return;
      const filteredNodes = nodes.filter((n) => {
        return (
          n.type !== "point" || !collapsedPointIds.has(n.data.pointId as number)
        );
      });
      const filteredEdges = edges.filter(
        (e) =>
          filteredNodes.some((n) => n.id === e.source) &&
          filteredNodes.some((n) => n.id === e.target)
      );
      const filteredGraph = {
        nodes: filteredNodes,
        edges: filteredEdges,
      };

      setLocalGraph?.(filteredGraph);

      try {
        await updateViewpointGraph({ id: viewpointId, graph: filteredGraph });
        await onSaveChanges?.();
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === "Must be authenticated to update viewpoint") {
            alert(
              "You must be logged in to save changes. Copying viewpoints will be implemented soon."
            );
          } else if (
            error.message === "Only the owner can update this viewpoint"
          ) {
            alert(
              "Only the owner can update this viewpoint. Copying viewpoints will be implemented soon."
            );
          } else {
            alert("Failed to save changes. Please try again.");
          }
        }
        if (setLocalGraph && props.defaultNodes && props.defaultEdges) {
          const originalGraph = {
            nodes: props.defaultNodes,
            edges: props.defaultEdges,
          };
          setLocalGraph(originalGraph);
        }
        throw error;
      }
    },
    [
      nodes,
      edges,
      flowInstance,
      onSaveChanges,
      collapsedPointIds,
      setLocalGraph,
      viewpointId,
      canModify,
      router,
      basePath,
      setStatement,
      setReasoning,
      setNewGraph,
      viewpoint,
      props.defaultNodes,
      props.defaultEdges,
    ]
  );

  return (
    <ReactFlow
      onInit={setFlowInstance}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodes={filteredNodes}
      onNodesChange={onNodesChange}
      edges={filteredEdges}
      onEdgesChange={onEdgesChange}
      panOnScroll
      zoomOnPinch
      minZoom={0.2}
      colorMode={theme as ColorMode}
      proOptions={{ hideAttribution: true }}
      {...effectiveProps}
    >
      {!!onClose && (
        <Panel position="top-right" className={closeButtonClassName}>
          <Button size="icon" variant={"ghost"} onClick={onClose}>
            <XIcon />
          </Button>
        </Panel>
      )}
      <Background
        bgColor="hsl(var(--background))"
        color="hsl(var(--muted))"
        variant={BackgroundVariant.Dots}
      />
      <MiniMap
        zoomable
        pannable
        className="[&>svg]:w-[120px] [&>svg]:h-[90px] sm:[&>svg]:w-[200px] sm:[&>svg]:h-[150px]"
      />
      <Controls />
      {editMode && onSaveChanges && (
        <Panel
          style={{
            top: "95%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
          className="z-50"
        >
          <AuthenticatedActionButton
            variant="default"
            onClick={async () => {
              try {
                await handleSave();
              } catch (error) {
                console.error("[GraphView] Error during save:", error);
              }
            }}
            disabled={isSaving}
            rightLoading={isSaving}
          >
            {canModify ? (
              isSaving ? "Saving..." : "Save Changes"
            ) : (
              isSaving ? "Copying..." : "Copy Viewpoint"
            )}
          </AuthenticatedActionButton>
        </Panel>
      )}
    </ReactFlow>
  );
};
