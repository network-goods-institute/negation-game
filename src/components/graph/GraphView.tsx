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
  useReactFlow,
} from "@xyflow/react";
import { XIcon, SaveIcon, Undo2Icon, Share2Icon } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useMemo, useEffect, useState, useRef, useLayoutEffect } from "react";
import { useAtom } from "jotai";
import { collapsedPointIdsAtom, ViewpointGraph, selectedPointIdsAtom, undoCollapseStackAtom, collapsedNodePositionsAtom } from "@/atoms/viewpointAtoms";
import React from "react";
import { updateViewpointGraph } from "@/actions/updateViewpointGraph";
import { updateViewpointDetails } from "@/actions/updateViewpointDetails";
import { useParams, useSearchParams } from "next/navigation";
import { useViewpoint } from "@/queries/useViewpoint";
import { AuthenticatedActionButton } from "@/components/AuthenticatedActionButton";
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
import { copyViewpointAndNavigate } from "@/lib/negation-game/copyViewpoint";
import { cn } from "@/lib/cn";
import { MergeNodesDialog } from "@/components/graph/MergeNodesDialog";
import { ShareRationaleDialog } from "@/components/graph/ShareRationalePointsDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader } from "@/components/ui/loader";
import { SaveConfirmDialog } from "@/components/graph/SaveConfirmDialog";
import { shouldConfirmRationaleUpdate } from "@/actions/shouldConfirmRationaleUpdate";
import { toast } from "sonner";
import type { PointNodeData } from "@/components/graph/PointNode";
import {
  AlertDialog as CopyConfirmDialog,
  AlertDialogContent as CopyConfirmContent,
  AlertDialogHeader as CopyConfirmHeader,
  AlertDialogTitle as CopyConfirmTitle,
  AlertDialogDescription as CopyConfirmDescription,
  AlertDialogFooter as CopyConfirmFooter,
  AlertDialogCancel as CopyConfirmCancel,
  AlertDialogAction as CopyConfirmAction,
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
  isSharing?: boolean;
  toggleSharingMode?: () => void;
  handleGenerateAndCopyShareLink?: () => void;
  originalGraphData?: ViewpointGraph;
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
  isSharing,
  toggleSharingMode,
  handleGenerateAndCopyShareLink,
  originalGraphData,
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
  const { addNodes: reactFlowAddNodes, addEdges: reactFlowAddEdges } = useReactFlow();
  const [undoStack, setUndoStack] = useAtom(undoCollapseStackAtom);
  const [collapsedPositions, setCollapsedPositions] = useAtom(collapsedNodePositionsAtom);

  // Track if the graph has been modified since loading or last save
  const [isModified, setIsModified] = useState(false);
  const [isSaving_local, setIsSaving_local] = useState(false);
  const [isSaveConfirmDialogOpen, setSaveConfirmDialogOpen] = useState(false);
  const [saveConfirmData, setSaveConfirmData] = useState<{
    viewCountSinceLastUpdate: number;
    lastUpdated: Date | null;
    daysSinceUpdate: number;
  }>({ viewCountSinceLastUpdate: 0, lastUpdated: null, daysSinceUpdate: 0 });
  const [saveAction, setSaveAction] = useState<"existing" | "new" | null>(null);
  const [hasShownNotOwnerWarning, setHasShownNotOwnerWarning] = useState(false);
  const toastIdRef = useRef<string | number | null>(null);

  const [isCopyConfirmOpen, setIsCopyConfirmOpen] = useState(false);
  const [isSaveAsNewConfirmOpen, setIsSaveAsNewConfirmOpen] = useState(false);

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
      const isDragging = changes.some(change => change.type === 'position' && change.dragging);

      if (!isDragging) {
        const hasSubstantiveChanges = changes.some((change) => {
          if (change.type === 'add' || change.type === 'remove') {
            return true;
          }

          if (change.type === 'position' && !change.dragging) {
            return true;
          }

          if ((change as any).data && (change as any).type !== 'select') {
            return true;
          }

          if ((change as any).item?.data?._lastModified || (change as any).data?._lastModified) {
            return true;
          }

          return false;
        });

        if (hasSubstantiveChanges && !isNew) {
          setIsModified(true);
        }

        // Only update graph state after dragging is complete
        if (flowInstance && setLocalGraph) {
          const { viewport, ...graph } = flowInstance.toObject();
          debouncedSetLocalGraph(graph);
        }
      }

      onNodesChangeDefault(changes);
      onNodesChangeProp?.(changes);
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
      point: (pointProps: any) => (
        <PointNode
          {...pointProps}
          isSharing={isSharing}
        />
      ),
      statement: StatementNode,
      addPoint: AddPointNode,
    }),
    [isSharing]
  );

  const edgeTypes = useMemo(() => ({ negation: NegationEdge, statement: NegationEdge }), []);

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

  const doSaveExisting = useCallback(
    async (filteredGraph: ViewpointGraph) => {
      try {
        await Promise.all([
          updateViewpointGraph({
            id: rationaleId!,
            graph: filteredGraph,
          }),
          updateViewpointDetails({
            id: rationaleId!,
            title: statement || "",
            description: "",
          })
        ]);

        localStorage.setItem("justPublished", "true");

        if (setLocalGraph) {
          setLocalGraph(filteredGraph);
        }

        if (onSaveChanges) {
          const saveResult = await onSaveChanges(filteredGraph);
          if (saveResult === false) {
            return false;
          }
        }

        return true;
      } catch (error) {
        console.error("[GraphView] Error in doSaveExisting:", error);
        return false;
      }
    },
    [rationaleId, statement, setLocalGraph, onSaveChanges]
  );

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
          if (!isNew) {
            try {
              const shouldConfirm = await shouldConfirmRationaleUpdate(rationaleId);

              if (shouldConfirm.shouldConfirm) {
                setSaveConfirmData({
                  viewCountSinceLastUpdate: shouldConfirm.viewCountSinceLastUpdate,
                  lastUpdated: shouldConfirm.lastUpdated,
                  daysSinceUpdate: shouldConfirm.daysSinceUpdate
                });
                setSaveConfirmDialogOpen(true);

                const tempLocalGraph = filteredGraph;

                window._saveExistingRationale = async () => {
                  setSaveAction("existing");
                  const result = await doSaveExisting(tempLocalGraph);
                  if (result) {
                    setIsModified(false);
                    setSaveConfirmDialogOpen(false);
                  }
                  setSaveAction(null);
                  return result;
                };

                window._saveAsNewRationale = async () => {
                  setSaveAction("new");
                  const result = await handleCopy(tempLocalGraph);
                  if (result) {
                    setSaveConfirmDialogOpen(false);
                  }
                  setSaveAction(null);
                  return result;
                };

                setIsSaving_local(false);
                return true;
              }
            } catch (confirmError) {
              console.error("[GraphView] Error checking for confirmation:", confirmError);
            }
          }

          // Normal flow without confirmation
          saveSuccess = await doSaveExisting(filteredGraph);
        } else {
          // For non-owners or when copying, use the copyViewpointAndNavigate function
          const copyResult = await handleCopy(filteredGraph);
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
        if (!window._saveExistingRationale && !window._saveAsNewRationale) {
          await new Promise(resolve => setTimeout(resolve, 300));
          setIsSaving_local(false);
        }
      }
    },
    [
      nodes,
      edges,
      setLocalGraph,
      rationaleId,
      setIsModified,
      canModify,
      statement,
      handleCopy,
      isNew,
      doSaveExisting
    ]
  );
  const handlePaneClick = useCallback(() => {
    window.getSelection()?.removeAllRanges();

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

      if (originalGraphData) {
        setNodes(originalGraphData.nodes);
        setEdges(originalGraphData.edges);
        if (setLocalGraph) {
          setLocalGraph(originalGraphData);
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
  }, [
    onResetContent,
    originalGraphData,
    setNodes, setEdges, setLocalGraph, setCollapsedPointIds, flowInstance, setIsModified
  ]);

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
  useEffect(() => {
    // Type augmentation for Window
    window._saveExistingRationale = undefined;
    window._saveAsNewRationale = undefined;

    return () => {
      window._saveExistingRationale = undefined;
      window._saveAsNewRationale = undefined;
    };
  }, []);

  useEffect(() => {
    if (isModified && !canModify && !hasShownNotOwnerWarning) {
      // Show warning toast with copy action opening confirmation dialog
      toastIdRef.current = toast.warning(
        "Not saving, just playing. To keep your changes:",
        {
          position: "bottom-center",
          duration: Infinity,
          action: {
            label: "Make a Copy",
            onClick: () => setIsCopyConfirmOpen(true),
          },
          actionButtonStyle: {
            backgroundColor: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
          },
          onDismiss: () => {
            setHasShownNotOwnerWarning(false);
            toastIdRef.current = null;
          }
        }
      );
      setHasShownNotOwnerWarning(true);
    } else if (!isModified && hasShownNotOwnerWarning) {
      if (toastIdRef.current) toast.dismiss(toastIdRef.current);
      setHasShownNotOwnerWarning(false);
      toastIdRef.current = null;
    }
  }, [isModified, canModify, hasShownNotOwnerWarning, handleCopy, nodes, edges]);

  useEffect(() => {
    return () => {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isProcessingUndo = false;
    let undoTimeoutRef: NodeJS.Timeout | null = null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'z') {
        if (isProcessingUndo || undoStack.length === 0) {
          return;
        }

        event.preventDefault();

        isProcessingUndo = true;

        if (undoTimeoutRef) {
          clearTimeout(undoTimeoutRef);
        }

        setUndoStack(prev => {
          const newStack = [...prev];
          const lastState = newStack.pop()!;

          reactFlowAddNodes(lastState.nodesToRestore);
          reactFlowAddEdges(lastState.edgesToRestore);

          const restoredPointIds = lastState.nodesToRestore
            .filter(node => node.type === 'point')
            .map(node => (node.data as PointNodeData).pointId);

          setCollapsedPointIds(prev => {
            const newSet = new Set(prev);
            restoredPointIds.forEach(id => {
              // eslint-disable-next-line drizzle/enforce-delete-with-where
              newSet.delete(id);
            });
            return newSet;
          });

          setCollapsedPositions(prev =>
            prev.filter(pos => !restoredPointIds.includes(pos.pointId))
          );

          undoTimeoutRef = setTimeout(() => {
            isProcessingUndo = false;
          }, 300);

          return newStack;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (undoTimeoutRef) {
        clearTimeout(undoTimeoutRef);
      }
    };
  }, [undoStack, setUndoStack, reactFlowAddNodes, reactFlowAddEdges, setCollapsedPointIds, setCollapsedPositions]);

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

        {/* Share controls and MiniMap in bottom-right */}
        <Panel position="bottom-right" className="mr-4 mb-4">
          <div className="flex flex-col gap-2">
            {/* Share controls */}
            {!hideShareButton && (
              <div className="flex flex-col gap-2 mb-48 mr-6 bg-background/95 p-3 rounded-md shadow-md border border-border">
                {isSharing ? (
                  <ShareControls
                    handleGenerateAndCopyShareLink={handleGenerateAndCopyShareLink}
                    toggleSharingMode={toggleSharingMode}
                  />
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        onClick={toggleSharingMode}
                        disabled={isSavingProp || isSaving_local || isDiscarding}
                        className="bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-lg px-4 py-2 flex items-center justify-center gap-2 w-[160px] text-sm"
                      >
                        <Share2Icon className="size-4" />
                        <span className="text-sm font-medium">Share Points</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Select points to share</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
            {/* MiniMap */}
            <div className="relative bottom-8 mt-4">
              <MiniMap nodeStrokeWidth={3} zoomable pannable />
            </div>
          </div>
        </Panel>

        {/* Position Controls with margin using Panel and inner div */}
        <Panel position="bottom-left" className="m-2">
          {/* Responsive bottom offset */}
          <div className="relative bottom-[10px] md:bottom-[20px] mb-4">
            <Controls />
          </div>
        </Panel>

        {/* Save/Discard panel in top-right */}
        <Panel position="top-right" className="m-2">
          <div className="flex flex-col items-end gap-2 mt-16 sm:mt-0">
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className={cn("bg-background/80", closeButtonClassName)}
              >
                <XIcon />
              </Button>
            )}

            {(isModified || isContentModified) && !isNew && (
              <div className="flex flex-col gap-2 bg-background/95 p-3 rounded-md shadow-md border border-border">
                {/* Save Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AuthenticatedActionButton
                      variant="default"
                      // If user owns the rationale, save normally, otherwise confirm copy
                      onClick={canModify ? handleSave : () => setIsSaveAsNewConfirmOpen(true)}
                      disabled={isSavingProp || isSaving_local}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg px-4 py-2 flex items-center justify-center w-[160px]"
                      id="graph-save-button"
                    >
                      {isSavingProp || isSaving_local ? (
                        <div className="flex items-center">
                          <Loader className="size-4 animate-spin text-white mr-2" />
                          <span className="text-white">Saving...</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <SaveIcon className="size-3.5 mr-1.5" />
                          <span className={cn(
                            "font-medium text-xs",
                            !canModify && "text-[11px] leading-none"
                          )}>
                            {canModify
                              ? isNew
                                ? "Publish Rationale"
                                : "Publish Changes"
                              : "Save as New Rationale"}
                          </span>
                        </div>
                      )}
                    </AuthenticatedActionButton>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{canModify ? 'Save changes' : 'You don\'t own this rationale. Save your changes as a new rationale.'}</p>
                  </TooltipContent>
                </Tooltip>
                {/* Discard Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      onClick={() => setIsDiscardDialogOpen(true)}
                      disabled={isSavingProp || isSaving_local || isDiscarding}
                      className="bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-lg px-4 py-2 flex items-center justify-center gap-2 w-[160px]"
                    >
                      {isDiscarding ? <Loader className="size-4 animate-spin" /> : <Undo2Icon className="size-4" />}
                      <span className="text-sm font-medium">Discard</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Discard changes</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </Panel>

        <GlobalExpandPointDialog />
        <MergeNodesDialog />
      </ReactFlow>

      {/* Unsaved changes discard dialog */}
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

      {/* Confirmation dialog for copying rationale */}
      <CopyConfirmDialog open={isCopyConfirmOpen} onOpenChange={setIsCopyConfirmOpen}>
        <CopyConfirmContent>
          <CopyConfirmHeader>
            <CopyConfirmTitle>Confirm Copy</CopyConfirmTitle>
            <CopyConfirmDescription>
              Are you sure you want to make a copy of this rationale?
            </CopyConfirmDescription>
          </CopyConfirmHeader>
          <CopyConfirmFooter>
            <CopyConfirmCancel onClick={() => setIsCopyConfirmOpen(false)}>
              Cancel
            </CopyConfirmCancel>
            <CopyConfirmAction onClick={async () => {
              const success = await handleCopy({ nodes, edges });
              if (success && toastIdRef.current) {
                toast.dismiss(toastIdRef.current);
                setHasShownNotOwnerWarning(false);
              }
              setIsCopyConfirmOpen(false);
            }}>
              Yes, make a copy
            </CopyConfirmAction>
          </CopyConfirmFooter>
        </CopyConfirmContent>
      </CopyConfirmDialog>

      {/* Confirmation dialog for Save as New Rationale when non-owner clicks save */}
      <AlertDialog open={isSaveAsNewConfirmOpen} onOpenChange={setIsSaveAsNewConfirmOpen}>
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Save as New Rationale</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save your changes as a new rationale? This will create a copy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsSaveAsNewConfirmOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              const success = await handleCopy({ nodes, edges });
              setIsSaveAsNewConfirmOpen(false);
            }}>
              Yes, save as new
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SaveConfirmDialog
        open={isSaveConfirmDialogOpen}
        onOpenChange={setSaveConfirmDialogOpen}
        onSaveExisting={() => {
          if (window._saveExistingRationale) {
            return window._saveExistingRationale();
          }
          return Promise.resolve(false);
        }}
        onSaveAsNew={() => {
          if (window._saveAsNewRationale) {
            return window._saveAsNewRationale();
          }
          return Promise.resolve(false);
        }}
        onCancel={() => {
          setSaveConfirmDialogOpen(false);
          setIsSaving_local(false);
        }}
        viewCountSinceLastUpdate={saveConfirmData.viewCountSinceLastUpdate}
        lastUpdated={saveConfirmData.lastUpdated || undefined}
        isProcessing={saveAction !== null}
        saveAction={saveAction}
      />

      <ShareRationaleDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        rationaleId={rationaleId}
        spaceId={spaceId}
        initialPoints={shareDialogMode === 'view' ? sharedPoints : undefined}
        sharedBy={shareDialogMode === 'view' ? sharedByUsername : undefined}
      />
    </>
  );
};

const ShareControls = ({ handleGenerateAndCopyShareLink, toggleSharingMode }: {
  handleGenerateAndCopyShareLink?: () => void;
  toggleSharingMode?: () => void;
}) => {
  const [selectedIds] = useAtom(selectedPointIdsAtom);
  const numberOfSelectedPoints = selectedIds.size;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="default"
            onClick={handleGenerateAndCopyShareLink}
            disabled={numberOfSelectedPoints === 0}
            className="shadow-lg px-4 py-2 flex items-center justify-center gap-2 w-[160px] text-sm"
          >
            <Share2Icon className="size-4" />
            <span>Generate Link</span>
            {numberOfSelectedPoints > 0 && (
              <span className="ml-1 font-bold">({numberOfSelectedPoints})</span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Copy share link for selected points</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="secondary"
            onClick={toggleSharingMode}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-lg px-4 py-2 flex items-center justify-center gap-2 w-[160px] text-sm"
          >
            <XIcon className="size-4" />
            <span>Cancel Sharing</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Exit sharing mode</p>
        </TooltipContent>
      </Tooltip>
    </>
  );
};

