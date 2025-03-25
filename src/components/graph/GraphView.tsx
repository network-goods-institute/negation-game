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
import { useCallback, useMemo, useEffect, useState, useRef } from "react";
import { useAtom } from "jotai";
import { collapsedPointIdsAtom, ViewpointGraph } from "@/atoms/viewpointAtoms";
import React from "react";
import { updateViewpointGraph } from "@/actions/updateViewpointGraph";
import { updateViewpointDetails } from "@/actions/updateViewpointDetails";
import { useParams } from "next/navigation";
import { useViewpoint } from "@/queries/useViewpoint";
import { AuthenticatedActionButton } from "@/components/ui/AuthenticatedActionButton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  onSaveChanges?: () => Promise<boolean | void>;
  canModify?: boolean;
  rootPointId?: number;
  statement?: string;
  onClose?: () => void;
  closeButtonClassName?: string;
  editFlowInstance?: ReactFlowInstance<AppNode> | null;
  setLocalGraph?: (graph: ViewpointGraph) => void;
  isSaving?: boolean;
  isNew?: boolean;
  isContentModified?: boolean;
  onResetContent?: () => void;
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
  isContentModified,
  onResetContent,
  ...props
}: GraphViewProps) => {
  const [collapsedPointIds, setCollapsedPointIds] = useAtom(collapsedPointIdsAtom);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [flowInstance, setFlowInstance] =
    useState<ReactFlowInstance<AppNode> | null>(null);
  const [nodes, setNodes, onNodesChangeDefault] = useNodesState<AppNode>(
    props.defaultNodes || []
  );
  const [edges, setEdges, onEdgesChangeDefault] = useEdgesState<Edge>(
    props.defaultEdges || []
  );
  const { theme } = useTheme();

  // Track if the graph has been modified since loading or last save
  const [isModified, setIsModified] = useState(false);
  const [isSaving_local, setIsSaving_local] = useState(false);
  // Track if this is the first mount
  const isInitialMount = useRef(true);

  // Get the current rationale ID from the route params first
  const params = useParams();
  const rationaleId = (params.rationaleId || params.viewpointId) as string;

  // Then use it in the hook
  const { data: viewpoint } = useViewpoint(rationaleId, {
    enabled: !isNew,
  });

  // reset isModified when viewpoint data changes, but only if not already modified
  useEffect(() => {
    if (viewpoint && !isModified) {
      setIsModified(false);
    } else if (isModified) {
    }
  }, [viewpoint, isModified]);

  useEffect(() => {
    if (isContentModified) {
      setIsModified(true);
    }
  }, [isContentModified]);

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



  const filteredEdges = useMemo(() => {
    // First filter edges to only include those connected to visible nodes
    const visibleEdges = edges.filter(
      (e) =>
        nodes.some((n) => n.id === e.source) &&
        nodes.some((n) => n.id === e.target)
    );

    // Then check for and remove duplicate edges based on source-target pairs
    const edgeMap = new Map<string, Edge>();
    const uniqueEdges: Edge[] = [];
    const duplicates: string[] = [];

    visibleEdges.forEach(edge => {
      const key = `${edge.source}->${edge.target}`;
      if (edgeMap.has(key)) {
        duplicates.push(edge.id);
      } else {
        edgeMap.set(key, edge);
        uniqueEdges.push(edge);
      }
    });

    return uniqueEdges;
  }, [edges, nodes]);

  // Make this method available via the React Flow context for children components
  // This ensures node components can explicitly mark the graph as modified
  const markAsModified = useCallback(() => {
    if (!isNew) {
      setIsModified(true);
    }
  }, [isNew]);

  useEffect(() => {
    if (flowInstance) {
      // @ts-ignore - adding our custom method to the instance
      flowInstance.markAsModified = markAsModified;
    }
  }, [flowInstance, markAsModified]);

  const onNodesChange = useCallback(
    (changes: NodeChange<AppNode>[]) => {
      // Check if any change is a meaningful modification that should trigger the save button
      const hasSubstantiveChanges = changes.some((change) => {
        // Adding/removing nodes is always a substantive change
        if (change.type === 'add' || change.type === 'remove') {
          return true;
        }

        // Position changes are substantive only if they're significant
        // This helps avoid showing the save button during minor adjustments or panning
        if (change.type === 'position' && change.position) {
          // For drag events, we only consider it substantive if it's not from panning
          // We can detect user-initiated drags by checking if there's any dragging going on
          return change.dragging === true;
        }

        // Data changes to node content are substantive
        if ((change as any).data && (change as any).type !== 'select') {
          return true;
        }

        // Check for _lastModified timestamp in the data
        // Some changes might have updated data indicating node expansion
        if ((change as any).item?.data?._lastModified || (change as any).data?._lastModified) {
          return true;
        }

        // Selection changes aren't substantive
        return false;
      });

      if (hasSubstantiveChanges && !isNew) {
        setIsModified(true);
      }

      onNodesChangeDefault(changes);
      onNodesChangeProp?.(changes);

      if (flowInstance && setLocalGraph) {
        const { viewport, ...graph } = flowInstance.toObject();
        debouncedSetLocalGraph(graph);
      }
    },
    [
      onNodesChangeDefault,
      onNodesChangeProp,
      flowInstance,
      setLocalGraph,
      debouncedSetLocalGraph,
      isNew,
    ]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // Check for substantive changes to edges
      const hasSubstantiveChanges = changes.some((change) => {
        // Adding or removing edges is always a substantive change
        if (change.type === 'add' || change.type === 'remove') {
          return true;
        }

        // Changes to edge data (like labels) are substantive
        if ((change as any).data) {
          return true;
        }

        // Selection changes aren't substantive
        if (change.type === 'select') {
          return false;
        }

        // Other changes (like style) are substantive
        return change.type === 'replace';
      });

      if (hasSubstantiveChanges && !isNew) {
        setIsModified(true);
      }

      onEdgesChangeDefault(changes);
      onEdgesChangeProp?.(changes);
      if (flowInstance && setLocalGraph) {
        const { viewport, ...graph } = flowInstance.toObject();
        debouncedSetLocalGraph(graph);
      }
    },
    [
      onEdgesChangeDefault,
      onEdgesChangeProp,
      setLocalGraph,
      flowInstance,
      debouncedSetLocalGraph,
      isNew,
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
  // With edit mode always on, we'll simplify this, can probably be refactored out completely eventually  
  const effectiveProps = {
    ...otherProps,
    ...(onInit && { onInit }),
  };

  useEffect(() => {
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
  }, [nodes, edges, defaultNodes, defaultEdges, setNodes, setEdges]);

  // Reset isModified only on initial mount, not when defaultNodes/defaultEdges change
  // This ensures we don't lose modification state when the graph changes
  useEffect(() => {
    if (isInitialMount.current && props.defaultNodes && props.defaultEdges) {
      setIsModified(false);
      isInitialMount.current = false;
    }
  }, [props.defaultNodes, props.defaultEdges, isModified]);

  const handleSave = useCallback(
    async () => {
      setIsSaving_local(true);

      try {
        // Filter out collapsed nodes
        const filteredNodes = nodes.filter((n) => {
          const shouldInclude = n.type !== "point" || !collapsedPointIds.has(n.data.pointId);
          return shouldInclude;
        });

        const filteredEdges = edges.filter((e) =>
          filteredNodes.some((n) => n.id === e.source) &&
          filteredNodes.some((n) => n.id === e.target)
        );
        const filteredGraph: ViewpointGraph = {
          nodes: filteredNodes,
          edges: filteredEdges,
        };

        // If the user is the owner, update the viewpoint
        // If not, skip to onSaveChanges which will handle creating a copy
        let saveSuccess = true;

        if (canModify) {
          // For owners, update both the graph and details in DB
          await Promise.all([
            updateViewpointGraph({
              id: rationaleId,
              graph: filteredGraph,
            }),
            updateViewpointDetails({
              id: rationaleId,
              title: statement || "",
              description: "",
            })
          ]);
        }

        // Always update the local graph state to the current filtered state
        if (setLocalGraph) {
          setLocalGraph(filteredGraph);
        }

        // Call onSaveChanges without passing the graph parameter - let it handle title/description updates
        try {
          // We know onSaveChanges exists here because of the check at the start
          // But TypeScript doesn't, so we need to check again
          if (onSaveChanges) {
            const saveResult = await onSaveChanges();
            if (saveResult === false) {
              saveSuccess = false;
            }
          }
        } catch (saveError) {
          saveSuccess = false;
          console.error("[GraphView] Error in onSaveChanges:", saveError);
        }

        if (saveSuccess) {
          setIsModified(false);
        }

        return saveSuccess;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === "Must be authenticated to update rationale") {
            alert("You must be logged in to save changes. Copying rationales will be implemented soon.");
          } else if (error.message === "Only the owner can update this rationale") {
            alert("Only the owner can update this rationale. Copying rationales will be implemented soon.");
          } else {
            alert("Failed to save changes. Please try again.");
          }
        }

        // Ensure local graph state uses the current filtered graph
        if (setLocalGraph) {
          setLocalGraph({ nodes, edges });
        }

        throw error;
      } finally {
        if (canModify) {
          await new Promise(resolve => setTimeout(resolve, 300));
          setIsSaving_local(false);
        }
      }
    },
    [
      nodes,
      edges,
      collapsedPointIds,
      onSaveChanges,
      setLocalGraph,
      rationaleId,
      setIsModified,
      canModify,
      statement
    ]
  );

  const handleButtonClick = useCallback(async () => {
    setIsSaving_local(true);

    try {
      await handleSave();
    } catch (error) {
      setIsSaving_local(false); // Reset in case of error
    }
  }, [handleSave, setIsSaving_local]);

  const handlePaneClick = useCallback(() => {
    const addPointNodes = nodes.filter(node => node.type === 'addPoint');

    if (addPointNodes.length > 0) {
      const nodeIdsToRemove = new Set<string>();

      addPointNodes.forEach(node => {
        const nodeData = node.data as { content?: string; hasContent?: boolean; parentId: string };

        const hasContent = nodeData.hasContent === true ||
          (typeof nodeData.content === 'string' && nodeData.content.trim().length > 0);

        if (!hasContent) {
          nodeIdsToRemove.add(node.id);
        }
      });

      if (nodeIdsToRemove.size > 0) {

        setNodes(currentNodes =>
          currentNodes.filter(node => !nodeIdsToRemove.has(node.id))
        );

        // Also remove any edges connected to the removed nodes
        setEdges(currentEdges =>
          currentEdges.filter(
            edge => !nodeIdsToRemove.has(edge.source) && !nodeIdsToRemove.has(edge.target)
          )
        );
      }
    }
  }, [nodes, setNodes, setEdges]);

  // Create a combined onInit function that sets the flowInstance and supports existing onInit
  const handleOnInit = useCallback((instance: ReactFlowInstance<AppNode>) => {
    setFlowInstance(instance);
    // Call the original onInit if provided
    if (props.onInit) {
      props.onInit(instance);
    }
  }, [props]);

  const handleDiscard = useCallback(() => {
    onResetContent?.();

    setIsModified(false);

    if (props.defaultNodes && props.defaultEdges) {
      setNodes(props.defaultNodes);
      setEdges(props.defaultEdges);
      if (setLocalGraph) {
        const originalGraph = {
          nodes: props.defaultNodes,
          edges: props.defaultEdges,
        };
        setLocalGraph(originalGraph);
      }

      setCollapsedPointIds(new Set());

      if (flowInstance) {
        flowInstance.setViewport({ x: 0, y: 0, zoom: 1 });
      }
    }

    setIsDiscardDialogOpen(false);
  }, [onResetContent, props.defaultNodes, props.defaultEdges, setNodes, setEdges, setLocalGraph, setCollapsedPointIds, flowInstance, setIsModified]);

  return (
    <>
      <ReactFlow
        onInit={handleOnInit}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodes={nodes}
        onNodesChange={onNodesChange}
        edges={filteredEdges}
        onEdgesChange={onEdgesChange}
        panOnScroll
        zoomOnPinch
        minZoom={0.2}
        colorMode={theme as ColorMode}
        proOptions={{ hideAttribution: true }}
        onPaneClick={handlePaneClick}
        {...effectiveProps}
      >
        {!!onClose && (
          <Panel position="top-right" className={closeButtonClassName}>
            <Button size="icon" variant={"ghost"} onClick={() => {
              onClose();
            }}>
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
        {(isModified && !isNew) && (
          <Panel position="top-right" className="z-50 mt-16 sm:mt-0">
            <div className="bg-background border rounded-lg shadow-lg p-4 flex flex-col gap-2 min-w-[200px]">
              <div className="text-sm font-medium text-muted-foreground">
                Unsaved Changes
              </div>
              <div className="flex flex-col gap-2">
                <AuthenticatedActionButton
                  id="save-button"
                  className="w-full"
                  disabled={isSaving || isSaving_local}
                  onClick={handleButtonClick}
                  rightLoading={isSaving || isSaving_local}
                >
                  {canModify
                    ? isNew
                      ? "Publish Rationale"
                      : "Publish Changes"
                    : "Copy Rationale to Save Changes"}
                </AuthenticatedActionButton>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={isSaving || isSaving_local}
                  onClick={() => setIsDiscardDialogOpen(true)}
                >
                  Discard Changes
                </Button>
              </div>
            </div>
          </Panel>
        )}
      </ReactFlow>

      <AlertDialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to discard your changes? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscard}>
              Yes, discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

