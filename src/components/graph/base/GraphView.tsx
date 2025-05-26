"use client";

import { AddPointNode } from "@/components/graph/nodes/AddPointNode";
import { AppNode } from "@/components/graph/nodes/AppNode";
import { NegationEdge } from "@/components/graph/edges/NegationEdge";
import { PointNode } from "@/components/graph/nodes/PointNode";
import { StatementNode } from "@/components/graph/nodes/StatementNode";
import { GlobalExpandPointDialog } from "@/components/dialogs/expandpointdialog";
import {
  Background,
  BackgroundVariant,
  ColorMode,
  Edge,
  ReactFlowInstance,
  ReactFlowProps,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useTheme } from "next-themes";
import { useCallback, useMemo, useEffect, useState } from "react";
import { useAtom } from "jotai";
import { collapsedPointIdsAtom, ViewpointGraph, selectedPointIdsAtom } from "@/atoms/viewpointAtoms";
import React from "react";
import { useParams } from "next/navigation";
import { useViewpoint } from "@/queries/viewpoints/useViewpoint";
import { copyViewpointAndNavigate } from "@/lib/negation-game/copyViewpoint";
import { MergeNodesDialog } from "@/components/dialogs/MergeNodesDialog";
import { GraphCanvas } from "@/components/graph/base/GraphCanvas";
import { GraphControls } from "../controls/GraphControls";
import { useFilteredEdges } from "@/hooks/graph/useFilteredEdges";
import { useGraphSync } from "@/hooks/graph/useGraphSync";
import { useCollapseUndo } from "@/hooks/graph/useCollapseUndo";
import { useGraphInitialization } from "@/hooks/graph/useGraphInitialization";
import { useGraphChangeHandlers } from "@/hooks/graph/useGraphChangeHandlers";
import { useGraphSaveManagement } from "@/hooks/graph/useGraphSaveManagement";
import { useConfirmationDialogs } from "@/hooks/graph/useConfirmationDialogs";
import { GraphDialogs } from "@/components/dialogs/GraphDialogs";
import { useCleanAddNodes } from "@/hooks/graph/useCleanAddNodes";
import { useDeepLinkShareDialog } from "@/hooks/graph/useDeepLinkShareDialog";
import { useNotOwnerWarning } from "@/hooks/viewpoints/useNotOwnerWarning";
import { useChunkedPrefetchPoints } from "@/hooks/graph/useChunkedPrefetchPoints";

export interface GraphViewProps
  extends Omit<ReactFlowProps<AppNode>, "onDelete"> {
  description?: string;
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
  description,
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
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [flowInstance, setFlowInstance] =
    useState<ReactFlowInstance<AppNode> | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [nodes, setNodes, onNodesChangeDefault] = useNodesState<AppNode>(
    props.defaultNodes || []
  );
  const [edges, setEdges, onEdgesChangeDefault] = useEdgesState<Edge>(
    props.defaultEdges || []
  );
  const { theme } = useTheme();
  const [selectedIds] = useAtom(selectedPointIdsAtom);

  // Track if the graph has been modified since loading or last save
  const [isModified, setIsModified] = useState(false);

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

  // Debounced sync for localGraph
  const debouncedSetLocalGraph = useGraphSync(setLocalGraph);
  // Global collapse-undo (Ctrl+Z)
  useCollapseUndo();

  // Load defaults and fix copy-related layout issues
  useGraphInitialization({
    flowInstance,
    defaultNodes: props.defaultNodes as AppNode[] | undefined,
    defaultEdges: props.defaultEdges,
    nodes,
    edges,
    setNodes,
    setEdges,
  });

  useChunkedPrefetchPoints(flowInstance, nodes);

  const { onNodesChange, onEdgesChange } = useGraphChangeHandlers({
    flowInstance,
    setLocalGraph: debouncedSetLocalGraph,
    isNew,
    onNodesChangeDefault,
    onEdgesChangeDefault,
    setIsModified,
    onNodesChangeProp: onNodesChangeProp,
    onEdgesChangeProp: onEdgesChangeProp,
  });

  // Note: drag updates (node moves) are handled via onNodesChange; skip syncing during drag

  const filteredEdges = useFilteredEdges(nodes, edges);

  // Custom markAsModified, accessible via ReactFlow instance
  useEffect(() => {
    if (flowInstance) {
      // @ts-ignore
      flowInstance.markAsModified = () => setIsModified(true);
    }
  }, [flowInstance, setIsModified]);

  // Memoize nodeTypes and edgeTypes
  const nodeTypes = useMemo(
    () => ({
      point: (pointProps: any) => (
        <PointNode
          {...pointProps}
          isSharing={isSharing || false}
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

  const getCurrentGraphData = useCallback((): ViewpointGraph => {
    // Ensure statement node is updated if needed, similar to save logic
    const updatedNodes = nodes.map(node => {
      if (node.id === "statement" && node.type === "statement") {
        return {
          ...node,
          data: { ...node.data, statement: statement || "", _lastUpdated: Date.now() },
        };
      }
      return node;
    });
    const currentEdges = edges.filter(
      (e) =>
        updatedNodes.some((n) => n.id === e.source) &&
        updatedNodes.some((n) => n.id === e.target)
    );
    return { nodes: updatedNodes, edges: currentEdges };
  }, [nodes, edges, statement]);

  const handleActualCopy = useCallback(async (graphToCopy: ViewpointGraph) => {
    try {
      const result = await copyViewpointAndNavigate(
        graphToCopy,
        statement || "",
        description || ""
      );

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
  }, [statement, description]);

  const {
    isSaving: isSavingManaged,
    isSaveConfirmDialogOpen,
    saveConfirmData,
    currentSaveAction,
    initiateSave,
    executeSaveExisting,
    executeSaveAsNew,
    cancelSaveConfirmation,
  } = useGraphSaveManagement({
    nodes,
    edges,
    statement,
    rationaleId,
    canModify,
    isNew,
    setLocalGraph,
    setIsModified,
    onSaveChanges,
    copyGraphFn: handleActualCopy,
  });

  const handleActualDiscard = useCallback(async () => {
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
    } finally {
      setIsDiscarding(false);
    }
  }, [
    onResetContent,
    originalGraphData,
    setNodes, setEdges, setLocalGraph, setCollapsedPointIds, flowInstance, setIsModified
  ]);

  const {
    isDiscardDialogOpen,
    openDiscardDialog,
    closeDiscardDialog,
    handleConfirmDiscard,
    isCopyConfirmOpen,
    openCopyConfirmDialog,
    closeCopyConfirmDialog,
    handleConfirmCopy,
    isSaveAsNewConfirmOpen,
    openSaveAsNewConfirmDialog,
    closeSaveAsNewConfirmDialog,
    handleConfirmSaveAsNew,
  } = useConfirmationDialogs({
    onDiscard: handleActualDiscard,
    onCopy: handleActualCopy,
    getCurrentGraph: getCurrentGraphData,
  });

  // Clean up empty add-point nodes on pane click
  const handlePaneClick = useCleanAddNodes({ nodes, setNodes, setEdges });

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

  const {
    isShareDialogOpen,
    setIsShareDialogOpen,
    shareDialogMode,
    sharedPoints,
    sharedByUsername,
  } = useDeepLinkShareDialog();

  // Show a persistent copy warning for non-owners if graph is modified
  useNotOwnerWarning(isModified, canModify, openCopyConfirmDialog);

  // Panning callbacks
  const handleMoveStart = useCallback(
    (event: MouseEvent | TouchEvent | null) => {
      setIsPanning(true);
    },
    []
  );
  const handleMoveEnd = useCallback(
    (event: MouseEvent | TouchEvent | null) => {
      setIsPanning(false);
      if (flowInstance && setLocalGraph) {
        const { viewport, ...graph } = flowInstance.toObject();
        setLocalGraph(graph);
      }
    },
    [flowInstance, setLocalGraph]
  );

  return (
    <>
      <GraphCanvas
        onInit={handleOnInit}
        onMoveStart={handleMoveStart}
        onMoveEnd={handleMoveEnd}
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

        <GraphControls
          isSharing={isSharing || false}
          hideShareButton={hideShareButton}
          numberOfSelectedPoints={selectedIds.size}
          handleGenerateAndCopyShareLink={handleGenerateAndCopyShareLink}
          toggleSharingMode={toggleSharingMode}
          isSaving={isSavingProp || isSavingManaged}
          isDiscarding={isDiscarding}
          isModified={isModified}
          isContentModified={isContentModified || false}
          isNew={!!isNew}
          canModify={canModify}
          isSavingLocal={isSavingManaged}
          onSave={canModify ? initiateSave : openSaveAsNewConfirmDialog}
          onCopyAsNew={openSaveAsNewConfirmDialog}
          onOpenDiscardDialog={openDiscardDialog}
          unsavedChangesModalClassName={unsavedChangesModalClassName}
          onClose={onClose}
          closeButtonClassName={closeButtonClassName}
        />

        <GlobalExpandPointDialog />
        <MergeNodesDialog />
      </GraphCanvas>
      <GraphDialogs
        isDiscardDialogOpen={isDiscardDialogOpen}
        closeDiscardDialog={closeDiscardDialog}
        handleConfirmDiscard={handleConfirmDiscard}

        isCopyConfirmOpen={isCopyConfirmOpen}
        closeCopyConfirmDialog={closeCopyConfirmDialog}
        handleConfirmCopy={handleConfirmCopy}

        isSaveAsNewConfirmOpen={isSaveAsNewConfirmOpen}
        closeSaveAsNewConfirmDialog={closeSaveAsNewConfirmDialog}
        handleConfirmSaveAsNew={handleConfirmSaveAsNew}

        isSaveConfirmDialogOpen={isSaveConfirmDialogOpen}
        cancelSaveConfirmation={cancelSaveConfirmation}
        executeSaveExisting={executeSaveExisting}
        executeSaveAsNew={executeSaveAsNew}
        saveConfirmData={saveConfirmData}
        currentSaveAction={currentSaveAction}

        isShareDialogOpen={isShareDialogOpen}
        onShareDialogOpenChange={setIsShareDialogOpen}
        shareDialogMode={shareDialogMode}
        sharedPoints={sharedPoints}
        sharedByUsername={sharedByUsername}
        rationaleId={rationaleId}
        spaceId={spaceId}
      />
    </>
  );
};

