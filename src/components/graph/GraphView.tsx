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
import { deletedPointIdsAtom } from "@/app/s/[space]/viewpoint/viewpointAtoms";
import { ViewpointGraph } from "@/app/s/[space]/viewpoint/viewpointAtoms";
import React from "react";
import { updateViewpointGraph } from "@/actions/updateViewpointGraph";
import { useParams, useRouter } from "next/navigation";
import { useBasePath } from "@/hooks/useBasePath";
import { viewpointStatementAtom, viewpointReasoningAtom, viewpointGraphAtom } from "@/app/s/[space]/viewpoint/viewpointAtoms";
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

export interface GraphViewProps extends ReactFlowProps<AppNode> {
  onSaveChanges?: () => void;
  canModify?: boolean;
  rootPointId?: number;
  statement?: string;
  onClose?: () => void;
  closeButtonClassName?: string;
  onDeleteNode?: (nodeId: string) => void;
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
  onDeleteNode,
  onSaveChanges,
  setLocalGraph,
  isSaving,
  canModify,
  isNew,
  ...props
}: GraphViewProps) => {
  const [deletedPointIds] = useAtom(deletedPointIdsAtom);
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance<AppNode> | null>(null);
  const [nodes, setNodes, onNodesChangeDefault] = useNodesState<AppNode>([]);
  const [edges, setEdges, onEdgesChangeDefault] = useEdgesState<Edge>([]);
  const { theme } = useTheme();
  const editMode = localEditMode();
  const setDeletedPointIds = useSetAtom(deletedPointIdsAtom);
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
    enabled: !isNew
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
    [onNodesChangeDefault, onNodesChangeProp, editMode, flowInstance, setLocalGraph, debouncedSetLocalGraph]
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

  const handleNodeDelete = useCallback((params: { nodes: AppNode[]; edges: Edge[] }) => {
    setNodes(params.nodes);
    setEdges(params.edges);
    const deletedNode = nodes.find(node => !params.nodes.some(n => n.id === node.id));
    if (deletedNode?.type === 'point') {
      setDeletedPointIds(prev => new Set([...prev, deletedNode.data.pointId]));
    }
  }, [setNodes, setEdges, nodes, setDeletedPointIds]);

  // Memoize nodeTypes and edgeTypes so that they do not change on each render.
  const nodeTypes = useMemo(() => ({
    point: (props: any) => <PointNode {...props} onDelete={onDeleteNode} />,
    statement: StatementNode,
    addPoint: AddPointNode,
  }), [onDeleteNode]);

  const edgeTypes = useMemo(() => ({ negation: NegationEdge }), []);

  const { defaultNodes, defaultEdges, onInit, ...otherProps } = props;
  const effectiveProps = editMode
    ? otherProps
    : { ...otherProps, defaultNodes, defaultEdges, ...(onInit && { onInit }) };

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
      // Instead of showing alert, fork the viewpoint
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

      // Set up the new viewpoint data
      if (viewpoint) {
        setStatement(viewpoint.title + " (fork)");
        setReasoning(viewpoint.description);
        setNewGraph(filteredGraph);

        // Navigate to new viewpoint page
        router.push(`${basePath}/viewpoint/new`);
      }
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
  }, [
    nodes,
    edges,
    flowInstance,
    onSaveChanges,
    deletedPointIds,
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
    props.defaultEdges
  ]);

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
              isSaving ? "Forking..." : "Fork Viewpoint"
            )}
          </AuthenticatedActionButton>
        </Panel>
      )}
    </ReactFlow>
  );
};
