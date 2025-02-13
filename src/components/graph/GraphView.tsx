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
import { useOriginalPoster } from "./OriginalPosterContext";
import { useUser } from "@/queries/useUser";
import { useSetAtom, useAtom } from "jotai";
import { deletedPointIdsAtom } from "@/app/s/[space]/viewpoint/viewpointAtoms";
import { ViewpointGraph } from "@/app/s/[space]/viewpoint/viewpointAtoms";
import React from "react";
import { updateViewpointGraph } from "@/actions/updateViewpointGraph";
import { useParams } from "next/navigation";

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

export interface GraphViewProps extends ReactFlowProps<AppNode> {
  onSaveChanges?: () => void;
  rootPointId?: number;
  statement?: string;
  onClose?: () => void;
  closeButtonClassName?: string;
  onDeleteNode?: (nodeId: string) => void;
  editFlowInstance?: ReactFlowInstance<AppNode> | null;
  setLocalGraph?: (graph: ViewpointGraph) => void;
  isSaving?: boolean;
}

export const GraphView = ({
  rootPointId,
  statement: statement,
  onClose,
  closeButtonClassName,
  onNodesChange: onNodesChangeProp,
  onEdgesChange: onEdgesChangeProp,
  onDeleteNode,
  onSaveChanges,
  setLocalGraph,
  isSaving,
  ...props
}: GraphViewProps) => {
  const [deletedPointIds] = useAtom(deletedPointIdsAtom);
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance<AppNode> | null>(null);
  const [nodes, setNodes, onNodesChangeDefault] = useNodesState<AppNode>([]);
  const [edges, setEdges, onEdgesChangeDefault] = useEdgesState<Edge>([]);
  const { theme } = useTheme();
  const editMode = localEditMode();
  const { originalPosterId } = useOriginalPoster();
  const { data: user } = useUser();
  const setDeletedPointIds = useSetAtom(deletedPointIdsAtom);

  // Get the current viewpoint ID from the route params
  const params = useParams();
  const viewpointId = params.viewpointId as string;

  const isOriginalPoster = user?.id === originalPosterId;
  const canModify = editMode && isOriginalPoster;

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

  const onNodesChange = useCallback(
    (nodes: NodeChange<AppNode>[]) => {
      if (canModify) {
        onNodesChangeDefault(nodes);
        onNodesChangeProp?.(nodes);
        if (flowInstance && setLocalGraph) {
          const { viewport, ...graph } = flowInstance.toObject();
          // Ensure edges reference valid node IDs
          const validEdges = graph.edges.filter(edge =>
            graph.nodes.some(n => n.id === edge.source) &&
            graph.nodes.some(n => n.id === edge.target)
          );
          graph.edges = validEdges;
          setLocalGraph(graph);
        }
      }
    },
    [onNodesChangeDefault, onNodesChangeProp, canModify, flowInstance, setLocalGraph]
  );

  const onEdgesChange = useCallback(
    (edges: EdgeChange[]) => {
      if (canModify) {
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
      canModify,
      flowInstance,
      debouncedSetLocalGraph,
      props.defaultNodes,
      props.defaultEdges,
    ]
  );

  // Cleanup both debounced functions on unmount
  useEffect(() => {
    return () => {
      debouncedSetLocalGraph.cancel();
      debouncedSetGraph.cancel();
    };
  }, [debouncedSetLocalGraph, debouncedSetGraph]);

  const handleNodeDelete = useCallback((params: { nodes: AppNode[]; edges: Edge[] }) => {
    setNodes(params.nodes);
    setEdges(params.edges);
    const deletedNode = nodes.find(node => !params.nodes.some(n => n.id === node.id));
    if (deletedNode?.type === 'point') {
      setDeletedPointIds(prev => new Set([...prev, deletedNode.data.pointId]));
    }
  }, [setNodes, setEdges, nodes, setDeletedPointIds]);

  const nodeTypes = useMemo(
    () => ({
      point: (props: any) => (
        <PointNode
          {...props}
          onDelete={canModify ? handleNodeDelete : undefined}
        />
      ),
      statement: StatementNode,
      addPoint: AddPointNode,
    }),
    [handleNodeDelete, canModify]
  );
  const edgeTypes = useMemo(() => ({ negation: NegationEdge }), []);

  const { defaultNodes, defaultEdges, onInit, ...restProps } = props;

  const effectiveProps = editMode
    ? restProps
    : { ...restProps, defaultNodes, defaultEdges, ...(onInit && { onInit }) };

  useEffect(() => {
    if (editMode) {
      if ((!nodes || nodes.length === 0) && defaultNodes && defaultNodes.length > 0) {
        setNodes(defaultNodes);
      }
      if ((!edges || edges.length === 0) && defaultEdges && defaultEdges.length > 0) {
        setEdges(defaultEdges);
      }
    }
  }, [editMode, nodes, edges, defaultNodes, defaultEdges, setNodes, setEdges]);

  const handleSave = useCallback(async () => {
    if (!canModify) {
      alert("You do not have permission to edit and save changes on this viewpoint.");
      return;
    }

    if (!flowInstance) return;

    // Filter out nodes marked as deleted
    const filteredNodes = nodes.filter(n => {
      return n.type !== "point" || !deletedPointIds.has(n.data.pointId as number);
    });

    // Filter out edges that reference deleted nodes
    const filteredEdges = edges.filter(e =>
      filteredNodes.some(n => n.id === e.source) &&
      filteredNodes.some(n => n.id === e.target)
    );

    const filteredGraph = {
      nodes: filteredNodes,
      edges: filteredEdges,
    };

    // Update local graph state with the filtered graph if available
    setLocalGraph?.(filteredGraph);

    try {
      // IMPORTANT: explicitly update the server with the filtered graph
      await updateViewpointGraph({ id: viewpointId, graph: filteredGraph });

      // Optionally, inform any other handler about the save completion
      await onSaveChanges?.();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Must be authenticated to update viewpoint") {
          alert("You must be logged in to save changes. Forking viewpoints will be implemented soon.");
        } else if (error.message === "Only the owner can update this viewpoint") {
          alert("Only the owner can update this viewpoint. Forking viewpoints will be implemented soon.");
        } else {
          alert("Failed to save changes. Please try again.");
        }
      }
      // Revert changes
      if (setLocalGraph && props.defaultNodes && props.defaultEdges) {
        const originalGraph = {
          nodes: props.defaultNodes,
          edges: props.defaultEdges
        };
        setLocalGraph(originalGraph);
      }
      throw error; // Re-throw so onSaveChanges can handle it too
    }
  }, [nodes, edges, flowInstance, onSaveChanges, deletedPointIds, setLocalGraph, viewpointId, canModify, props.defaultNodes, props.defaultEdges]);

  return (
    <ReactFlow
      onInit={setFlowInstance}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodes={nodes}
      onNodesChange={onNodesChange}
      edges={edges}
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
          style={{ top: "95%", left: "50%", transform: "translate(-50%, -50%)" }}
          className="z-50"
        >
          <Button
            variant="default"
            onClick={async (e) => {
              e.preventDefault();
              try {
                await handleSave();
              } catch (error) {
                console.error("[GraphView] Error during save:", error);
              }
            }}
            disabled={isSaving}
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <span className="size-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </div>
            ) : (
              "Save Changes"
            )}
          </Button>
        </Panel>
      )}
    </ReactFlow>
  );
};
