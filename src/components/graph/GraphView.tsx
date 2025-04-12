"use client";

import { AddPointNode } from "@/components/graph/AddPointNode";
import { AppNode } from "@/components/graph/AppNode";
import { NegationEdge } from "@/components/graph/NegationEdge";
import { PointNode } from "@/components/graph/PointNode";
import { StatementNode } from "@/components/graph/StatementNode";
import { GlobalExpandPointDialog } from "@/components/graph/ExpandPointDialog";
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
import { XIcon, SaveIcon, Undo2Icon, Share2Icon } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useMemo, useEffect, useState, useRef, useLayoutEffect } from "react";
import { useAtom } from "jotai";
import { collapsedPointIdsAtom, ViewpointGraph } from "@/atoms/viewpointAtoms";
import React from "react";
import { updateViewpointGraph } from "@/actions/updateViewpointGraph";
import { updateViewpointDetails } from "@/actions/updateViewpointDetails";
import { useParams, useSearchParams } from "next/navigation";
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
import { copyViewpointAndNavigate } from "@/utils/copyViewpoint";
import { cn } from "@/lib/cn";
import { MergeNodesDialog } from "@/components/graph/MergeNodesDialog";
import { ShareRationaleDialog } from "@/components/graph/ShareRationalePointsDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader } from "@/components/ui/loader";

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
  onSaveChanges?: (graph: ViewpointGraph) => Promise<boolean | void>;
  canModify?: boolean;
  rootPointId?: number;
  statement?: string;
  onClose?: () => void;
  closeButtonClassName?: string;
  unsavedChangesModalClassName?: string;
  editFlowInstance?: ReactFlowInstance<AppNode> | null;
  setLocalGraph?: (graph: ViewpointGraph) => void;
  isSaving?: boolean;
  isNew?: boolean;
  isContentModified?: boolean;
  onResetContent?: () => void;
  onModifiedChange?: (isModified: boolean) => void;
  canvasEnabled?: boolean;
  hideShareButton?: boolean;
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
  isSaving: isSavingProp,
  canModify,
  isNew,
  isContentModified,
  onResetContent,
  unsavedChangesModalClassName,
  onModifiedChange,
  canvasEnabled,
  hideShareButton,
  ...props
}: GraphViewProps) => {
  const [collapsedPointIds, setCollapsedPointIds] = useAtom(collapsedPointIdsAtom);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
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

  useEffect(() => {
    onModifiedChange?.(isModified);
  }, [isModified, onModifiedChange]);

  const isInitialMount = useRef(true);

  const params = useParams();
  const rationaleId = (params.rationaleId || params.viewpointId) as string | undefined;
  const spaceId = params.space as string;

  const viewpointQueryResult = useViewpoint(rationaleId!, {
    enabled: !isNew && typeof rationaleId === 'string',
  });
  const viewpoint = viewpointQueryResult.data;

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

  const handleCopy = useCallback(async (graphToCopy: ViewpointGraph) => {

    try {
      const result = await copyViewpointAndNavigate(graphToCopy, statement || "", "");

      // If there's an error, add an additional safety delay before trying to navigate
      if (!result) {
        console.error("Failed to copy viewpoint, forcing navigation");
        await new Promise(resolve => setTimeout(resolve, 300));
        const url = `/s/global/rationale/new`;
        window.location.href = url;
      }

      return result;
    } catch (error) {
      console.error("Error during copy operation:", error);
      alert("There was an error copying the rationale. Please try again.");
      return false;
    }
  }, [statement]);

  const handleSave = useCallback(
    async () => {
      setIsSaving_local(true);

      try {
        // First, ensure the statement node is updated with the current statement
        // This ensures the title changes are reflected in the graph
        const updatedNodes = nodes.map(node => {
          if (node.id === "statement" && node.type === "statement") {
            return {
              ...node,
              data: {
                ...node.data,
                statement: statement || "",
                _lastUpdated: Date.now()
              }
            };
          }
          return node;
        });

        // Instead of filtering nodes based on collapsedPointIds,
        // we'll directly use the current nodes in the graph
        // this for some reason fixes the isue where direct children of statement nodes like to vanish randomly
        // This ensures we only keep nodes that are actually visible
        const filteredNodes = updatedNodes;

        // Filter edges to only include those connected to nodes in the graph
        const filteredEdges = edges.filter((e) =>
          updatedNodes.some((n) => n.id === e.source) &&
          updatedNodes.some((n) => n.id === e.target)
        );

        const filteredGraph: ViewpointGraph = {
          nodes: filteredNodes,
          edges: filteredEdges,
        };

        let saveSuccess = true;

        if (canModify && rationaleId) {
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

          // Set the justPublished flag when we successfully save changes
          // This prevents draft detection on next visit to the new rationale page
          localStorage.setItem("justPublished", "true");

          // Always update the local graph state to the current filtered state
          if (setLocalGraph) {
            setLocalGraph(filteredGraph);
          }

          setNodes(updatedNodes);

          // Call onSaveChanges for any additional updates
          try {
            if (onSaveChanges) {
              const saveResult = await onSaveChanges(filteredGraph);
              if (saveResult === false) {
                saveSuccess = false;
              }
            }
          } catch (saveError) {
            saveSuccess = false;
            console.error("[GraphView] Error in onSaveChanges:", saveError);
          }
        } else {
          // For non-owners, treat this as a copy operation
          console.log("Non-owner saving changes, triggering copy operation");
          // Set a longer timeout to ensure we don't get interrupted
          setIsSaving_local(true);
          const copyResult = await handleCopy(filteredGraph);

          // Keep the save button loading while the page navigates
          return copyResult;
        }

        if (saveSuccess) {
          setIsModified(false);
        }

        return saveSuccess;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === "Must be authenticated to update rationale") {
            alert("You must be logged in to save changes.");
          } else if (error.message === "Only the owner can update this rationale") {
            alert("Only the owner can update this rationale. Your changes will be copied to a new rationale.");
            // Trigger copy operation on this error
            console.log("Owner restriction error, triggering copy fallback");
            return handleCopy({ nodes, edges });
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
      onSaveChanges,
      setLocalGraph,
      rationaleId,
      setIsModified,
      canModify,
      statement,
      handleCopy,
      setNodes
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

    // Wait briefly before setting any default nodes/edges (helps with copy operations)
    setTimeout(() => {
      // Ensure we load the default nodes/edges here too as a fallback
      if (props.defaultNodes && props.defaultNodes.length > 0) {
        instance.setNodes(props.defaultNodes);
      }

      if (props.defaultEdges && props.defaultEdges.length > 0) {
        instance.setEdges(props.defaultEdges);
      }

      // Call the original onInit if provided
      if (props.onInit) {
        props.onInit(instance);
      }
    }, 50);
  }, [props]);

  const handleDiscard = useCallback(async () => {
    setIsDiscarding(true);
    try {
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
    } finally {
      setIsDiscarding(false);
    }
  }, [onResetContent, props.defaultNodes, props.defaultEdges, setNodes, setEdges, setLocalGraph, setCollapsedPointIds, flowInstance, setIsModified]);

  // Add a special effect to fix nodes that might not have loaded properly in a copy operation
  useLayoutEffect(() => {
    if (flowInstance && props.defaultNodes && props.defaultNodes.length > 0 && nodes.length === 0) {
      // If nodes are missing but we have default nodes, load them
      setTimeout(() => {
        if (props.defaultNodes) {
          setNodes([...props.defaultNodes]);
          flowInstance.setNodes(props.defaultNodes);
        }

        if (props.defaultEdges && props.defaultEdges.length > 0) {
          setEdges([...props.defaultEdges]);
          flowInstance.setEdges(props.defaultEdges);
        }
      }, 100);
    }
  }, [flowInstance, props.defaultNodes, props.defaultEdges, nodes.length, setNodes, setEdges]);

  const searchParams = useSearchParams();
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareDialogMode, setShareDialogMode] = useState<'share' | 'view'>('share');
  const [sharedPoints, setSharedPoints] = useState<number[]>([]);
  const [sharedByUsername, setSharedByUsername] = useState<string | undefined>(undefined);

  useEffect(() => {
    const viewParam = searchParams?.get('view');
    const pointsParam = searchParams?.get('points');
    const byParam = searchParams?.get('by');

    if (viewParam === 'shared' && pointsParam) {
      const pointIds = pointsParam.split(',').map(Number).filter(id => !isNaN(id));
      if (pointIds.length > 0) {
        setSharedPoints(pointIds);
        setSharedByUsername(byParam ?? undefined);
        setShareDialogMode('view');
        setIsShareDialogOpen(true);
      }
    } else {
      setShareDialogMode('share');
    }
  }, [searchParams]);

  const openShareDialogInShareMode = () => {
    setSharedPoints([]);
    setSharedByUsername(undefined);
    setShareDialogMode('share');
    setIsShareDialogOpen(true);
  };

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
        <Background
          bgColor="hsl(var(--background))"
          color="hsl(var(--muted))"
          variant={BackgroundVariant.Dots}
        />

        {/* Position MiniMap with margin using Panel and inner div */}
        <Panel position="bottom-right" className="m-2">
          {/* Responsive bottom offset */}
          <div className="relative bottom-[10px] md:bottom-[20px]">
            <MiniMap nodeStrokeWidth={3} zoomable pannable />
          </div>
        </Panel>

        {/* Position Controls with margin using Panel and inner div */}
        <Panel position="bottom-left" className="m-2">
          {/* Responsive bottom offset */}
          <div className="relative bottom-[10px] md:bottom-[20px]">
            <Controls />
          </div>
        </Panel>

        {onClose && (
          <Panel position="top-right">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className={cn("m-2 bg-background/80", closeButtonClassName)}
            >
              <XIcon />
            </Button>
          </Panel>
        )}
        {(isModified || isContentModified) && !isNew && (
          <Panel position="top-right" className="m-2">
            {/* Inner div for positioning and layering - Responsive top */}
            <div className="relative top-[50px] md:top-[15px] z-50 flex flex-col gap-2">
              {/* Save Button (Conditional) */}
              {canModify && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AuthenticatedActionButton
                      variant="outline"
                      onClick={handleSave}
                      disabled={isSavingProp || isSaving_local}
                      className="bg-background/80 shadow-md px-3 py-1.5 flex items-center justify-center gap-2 min-w-[140px]"
                      id="graph-save-button"
                    >
                      {isSavingProp || isSaving_local ? (
                        <Loader className="size-4 animate-spin" />
                      ) : (
                        <span className="text-xs">
                          {canModify
                            ? isNew
                              ? "Publish Rationale"
                              : "Publish Changes"
                            : "Copy Rationale to Save Changes"}
                        </span>
                      )}
                    </AuthenticatedActionButton>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Save changes</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {/* Discard Button (Conditional) */}
              {canModify && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => setIsDiscardDialogOpen(true)}
                      disabled={isSavingProp || isSaving_local || isDiscarding}
                      className="bg-background/80 shadow-md px-3 py-1.5 flex items-center justify-center gap-2 min-w-[140px]"
                    >
                      {isDiscarding ? <Loader className="size-4 animate-spin" /> : <Undo2Icon className="size-4" />}
                      <span className="text-xs">Discard</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Discard changes</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </Panel>
        )}

        {/* Always visible Share Button Panel (unless hidden by prop) */}
        {!hideShareButton && (
          <Panel position="top-right" className="m-2">
            {/* Position below the potential save/discard buttons */}
            <div className={cn(
              "relative z-40 flex flex-col gap-2",
              // If Save/Discard are shown, position Share below them (approx 85px height + 8px gap)
              // Otherwise, use the default top offset
              (isModified || isContentModified) && canModify ? "top-[calc(50px+85px+8px)] md:top-[calc(15px+85px+8px)]" : "top-[50px] md:top-[15px]"
            )}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={openShareDialogInShareMode}
                    disabled={isSavingProp || isSaving_local || isDiscarding}
                    className="bg-background/80 shadow-md px-3 py-1.5 flex items-center justify-center gap-2 min-w-[140px]"
                  >
                    <Share2Icon className="size-4" />
                    <span className="text-xs">Share Points</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Share selected points from this rationale</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </Panel>
        )}

        <GlobalExpandPointDialog />
      </ReactFlow>

      {!canvasEnabled && (isModified || isContentModified) && canModify && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-background border-t z-30 flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => setIsDiscardDialogOpen(true)}
            disabled={isSavingProp || isSaving_local || isDiscarding || !(isModified || isContentModified)}
            className="flex-1 shadow-md"
          >
            {isDiscarding ? <Loader className="size-4 animate-spin mr-2" /> : <Undo2Icon className="size-4 mr-2" />}
            Discard
          </Button>
          <AuthenticatedActionButton
            onClick={handleSave}
            disabled={isSavingProp || isSaving_local || !(isModified || isContentModified)}
            className="flex-1 shadow-md flex items-center justify-center min-w-[140px]"
          >
            {isSavingProp || isSaving_local ? (
              <Loader className="size-4 animate-spin" />
            ) : (
              <>
                <SaveIcon className="size-4 mr-2" />
                {canModify
                  ? isNew
                    ? "Publish Rationale"
                    : "Publish Changes"
                  : "Copy Rationale to Save Changes"}
              </>
            )}
          </AuthenticatedActionButton>
        </div>
      )}

      <AlertDialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
        <AlertDialogContent className={cn("sm:max-w-[425px]", unsavedChangesModalClassName)}>
          <AlertDialogHeader>
            <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to save your changes or discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isSaving_local || isDiscarding}
              onClick={() => setIsDiscardDialogOpen(false)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isSaving_local || isDiscarding}
              onClick={() => handleDiscard()}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              {isDiscarding ? "Discarding..." : "Discard changes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ShareRationaleDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        rationaleId={rationaleId}
        spaceId={spaceId}
        isViewMode={shareDialogMode === 'view'}
        initialPoints={shareDialogMode === 'view' ? sharedPoints : undefined}
        sharedBy={shareDialogMode === 'view' ? sharedByUsername : undefined}
      />

      <MergeNodesDialog />
    </>
  );
};

