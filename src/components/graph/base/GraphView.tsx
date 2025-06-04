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
import { showEndorsementsAtom } from "@/atoms/showEndorsementsAtom";
import { collapsedPointIdsAtom, ViewpointGraph, selectedPointIdsAtom } from "@/atoms/viewpointAtoms";
import React from "react";
import { useParams } from "next/navigation";
import { useViewpoint } from "@/queries/viewpoints/useViewpoint";
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
import { useGraphPaneHandlers } from "@/hooks/graph/useGraphPaneHandlers";
import { useGraphCopyHandler } from "@/hooks/graph/useGraphCopyHandler";
import { useGraphNodeDropHandler } from "@/hooks/graph/useGraphNodeDropHandler";
import ConnectNodesFrame from "@/components/graph/overlays/ConnectNodesFrame";
import { MergeNodesFrame } from "@/components/graph/overlays/MergeNodesFrame";
import { connectNodesDialogAtom } from "@/atoms/connectNodesAtom";
import { mergeNodesDialogAtom } from "@/atoms/mergeNodesAtom";

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
  const [showEndorsements] = useAtom(showEndorsementsAtom);
  const [collapsedPointIds, setCollapsedPointIds] = useAtom(collapsedPointIdsAtom);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance<AppNode> | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [nodes, setNodes, onNodesChangeDefault] = useNodesState<AppNode>(
    props.defaultNodes || []
  );
  const [edges, setEdges, onEdgesChangeDefault] = useEdgesState<Edge>(
    props.defaultEdges || []
  );
  const { theme } = useTheme();
  const [selectedIds] = useAtom(selectedPointIdsAtom);

  const [, setConnectDialogState] = useAtom(connectNodesDialogAtom);
  const [, setMergeNodesDialogState] = useAtom(mergeNodesDialogAtom);

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
          showEndorsements={showEndorsements}
        />
      ),
      statement: StatementNode,
      addPoint: AddPointNode,
    }),
    [isSharing, showEndorsements]
  );

  const edgeTypes = useMemo(() => ({ negation: NegationEdge, statement: NegationEdge }), []);

  const { defaultNodes, defaultEdges, onInit: _unusedInit, ...otherProps } = props;
  // With edit mode always on, we'll simplify this
  // We intentionally don't forward props.onInit so our handleOnInit always runs
  const effectiveProps = { ...otherProps };

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

  const handlePaneClick = useCleanAddNodes({ nodes, setNodes, setEdges });

  // Extract pane and initialization handlers
  const { handleOnInit, handleMoveStart, handleMoveEnd } = useGraphPaneHandlers({
    defaultNodes: props.defaultNodes as AppNode[] | undefined,
    defaultEdges: props.defaultEdges,
    onInitProp: props.onInit,
    flowInstance,
    setFlowInstance,
    setLocalGraph,
    setIsPanning,
  });

  // Copy and node-drop handlers
  const handleActualCopy = useGraphCopyHandler(statement || "", description || "");
  const handleNodeDragStop = useGraphNodeDropHandler(flowInstance, !!canModify);

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

      setConnectDialogState({
        isOpen: false,
        sourceId: "",
        targetId: "",
        onClose: undefined,
      });
      setMergeNodesDialogState({
        isOpen: false,
        pointId: 0,
        duplicateNodes: [],
        onClose: undefined,
      });

    } finally {
      setIsDiscarding(false);
    }
  }, [
    onResetContent,
    originalGraphData,
    setNodes, setEdges, setLocalGraph, setCollapsedPointIds, flowInstance, setIsModified,
    setConnectDialogState, setMergeNodesDialogState
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

  const {
    isShareDialogOpen,
    setIsShareDialogOpen,
    shareDialogMode,
    sharedPoints,
    sharedByUsername,
  } = useDeepLinkShareDialog();

  // Show a persistent copy warning for non-owners if graph is modified
  useNotOwnerWarning(isModified, canModify, openCopyConfirmDialog);

  const handleNodeDragStart = useCallback(() => {
    setConnectDialogState({
      isOpen: false,
      sourceId: "",
      targetId: "",
      onClose: undefined,
    });
    setMergeNodesDialogState({
      isOpen: false,
      pointId: 0,
      duplicateNodes: [],
      onClose: undefined,
    });
  }, [setConnectDialogState, setMergeNodesDialogState]);

  return (
    <>
      <GraphCanvas
        onNodeDragStop={handleNodeDragStop}
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
        onNodeDragStart={handleNodeDragStart}
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
        <MergeNodesFrame />
      </GraphCanvas>
      <ConnectNodesFrame />
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

