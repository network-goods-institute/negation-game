import { useCallback, useState, useRef } from "react";
import { Edge } from "@xyflow/react";
import { updateViewpointGraph } from "@/actions/viewpoints/updateViewpointGraph";
import { updateViewpointDetails } from "@/actions/viewpoints/updateViewpointDetails";
import { shouldConfirmRationaleUpdate } from "@/actions/viewpoints/shouldConfirmRationaleUpdate";
import type { AppNode } from "@/components/graph/nodes/AppNode";
import type { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { toast } from "sonner";import { logger } from "@/lib/logger";

interface UseGraphSaveManagementProps {
  nodes: AppNode[];
  edges: Edge[];
  statement?: string;
  rationaleId?: string;
  canModify?: boolean;
  isNew?: boolean;
  setLocalGraph?: (graph: ViewpointGraph) => void;
  setIsModified: (isModified: boolean) => void;
  onSaveChanges?: (graph: ViewpointGraph) => Promise<boolean | void>;
  copyGraphFn: (graphToCopy: ViewpointGraph) => Promise<boolean | void | any>;
}

export const useGraphSaveManagement = ({
  nodes,
  edges,
  statement,
  rationaleId,
  canModify,
  isNew,
  setLocalGraph,
  setIsModified,
  onSaveChanges,
  copyGraphFn,
}: UseGraphSaveManagementProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaveConfirmDialogOpen, setSaveConfirmDialogOpen] = useState(false);
  const [saveConfirmData, setSaveConfirmData] = useState<{
    viewCountSinceLastUpdate: number;
    lastUpdated: Date | null;
    daysSinceUpdate: number;
  }>({ viewCountSinceLastUpdate: 0, lastUpdated: null, daysSinceUpdate: 0 });
  const [currentSaveAction, setCurrentSaveAction] = useState<
    "existing" | "new" | null
  >(null);

  const graphToSaveOrCopy = useRef<ViewpointGraph | null>(null);

  const doSaveExistingInternal = useCallback(
    async (filteredGraph: ViewpointGraph) => {
      if (!rationaleId) {
        logger.error(
          "[GraphSaveManagement] rationaleId is missing for doSaveExistingInternal"
        );
        toast.error("Cannot save existing rationale without an ID.");
        return false;
      }

      try {
        await Promise.all([
          updateViewpointGraph({
            id: rationaleId,
            graph: filteredGraph,
          }),
          updateViewpointDetails({
            id: rationaleId,
            title: statement || "",
            description: "",
          }),
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
        toast.success("Rationale updated successfully!");
        return true;
      } catch (error) {
        logger.error(
          "[GraphSaveManagement] Error in doSaveExistingInternal:",
          error
        );
        toast.error("Failed to save changes. Please try again.");
        return false;
      }
    },
    [rationaleId, statement, setLocalGraph, onSaveChanges]
  );

  const initiateSave = useCallback(async () => {
    setIsSaving(true);
    setCurrentSaveAction(null);

    try {
      const updatedNodes = nodes.map((node) => {
        if (node.id === "statement" && node.type === "statement") {
          return {
            ...node,
            data: {
              ...node.data,
              statement: statement || "",
              _lastUpdated: Date.now(),
            },
          };
        }
        return node;
      });

      const currentEdges = edges;
      const filteredGraph: ViewpointGraph = {
        nodes: updatedNodes,
        edges: currentEdges.filter(
          (e) =>
            updatedNodes.some((n) => n.id === e.source) &&
            updatedNodes.some((n) => n.id === e.target)
        ),
      };
      graphToSaveOrCopy.current = filteredGraph;

      let saveSuccess = true;

      if (canModify && rationaleId) {
        if (!isNew) {
          try {
            const confirmInfo = await shouldConfirmRationaleUpdate(rationaleId);
            if (confirmInfo.shouldConfirm) {
              setSaveConfirmData({
                viewCountSinceLastUpdate: confirmInfo.viewCountSinceLastUpdate,
                lastUpdated: confirmInfo.lastUpdated,
                daysSinceUpdate: confirmInfo.daysSinceUpdate,
              });
              setSaveConfirmDialogOpen(true);
              // setIsSaving(false); // Dialog takes over saving indication
              return;
            }
          } catch (confirmError) {
            logger.error(
              "[GraphSaveManagement] Error checking for confirmation:",
              confirmError
            );
            toast.error(
              "Could not check if update confirmation is needed. Proceeding with save."
            );
          }
        }
        saveSuccess = await doSaveExistingInternal(filteredGraph);
      } else {
        // This branch covers:
        // 1. !canModify && rationaleId (non-owner trying to "save" an existing - UI should direct to copy, but if called, it's a copy)
        // 2. isNew (new rationale, regardless of canModify, as no rationaleId means it's a creation/copy)
        // 3. !rationaleId (similar to isNew)
        if (!canModify && rationaleId) {
          toast.info(
            "Only the owner can update this rationale. Your changes will be copied to a new rationale."
          );
        }
        const copyResult = await copyGraphFn(filteredGraph);
        saveSuccess = !!copyResult;
      }

      if (saveSuccess) {
        setIsModified(false);
      }

      // Only set isSaving to false if not waiting for dialog
      // The path that opens dialog returns early.
      setIsSaving(false);
    } catch (error: any) {
      logger.error("[GraphSaveManagement] Error in initiateSave:", error);
      if (error.message === "Must be authenticated to update rationale") {
        toast.error("You must be logged in to save changes.");
      } else if (error.message === "Only the owner can update this rationale") {
        // This specific error might be less likely here if UI directs to copy.
        // But if it occurs, the copyGraphFn path is taken.
        toast.error(
          "Only the owner can update this rationale. Your changes will be copied to a new rationale."
        );
        // Attempt copy again if not already done, or rely on UI.
        // For now, the copyGraphFn path above should handle it if !canModify.
        // This error could also come from doSaveExistingInternal if canModify was wrongly true.
      } else {
        toast.error("Failed to save changes. Please try again.");
      }
      setIsSaving(false);
    }
  }, [
    nodes,
    edges,
    statement,
    rationaleId,
    canModify,
    isNew,
    setIsModified,
    doSaveExistingInternal,
    copyGraphFn,
  ]);

  const executeSaveExisting = useCallback(async () => {
    if (!graphToSaveOrCopy.current) {
      logger.error(
        "[GraphSaveManagement] No graph data to save for existing."
      );
      toast.error("Error: No data to save.");
      return false;
    }
    setCurrentSaveAction("existing");
    setIsSaving(true);
    const result = await doSaveExistingInternal(graphToSaveOrCopy.current);
    if (result) {
      setIsModified(false);
      setSaveConfirmDialogOpen(false);
    }
    setCurrentSaveAction(null);
    setIsSaving(false);
    graphToSaveOrCopy.current = null;
    return result;
  }, [doSaveExistingInternal, setIsModified]);

  const executeSaveAsNew = useCallback(async () => {
    if (!graphToSaveOrCopy.current) {
      logger.error("[GraphSaveManagement] No graph data to save as new.");
      toast.error("Error: No data to copy.");
      return false;
    }
    setCurrentSaveAction("new");
    setIsSaving(true);
    const result = await copyGraphFn(graphToSaveOrCopy.current);
    if (result) {
      setSaveConfirmDialogOpen(false);
    }
    setCurrentSaveAction(null);
    setIsSaving(false);
    graphToSaveOrCopy.current = null;
    return !!result;
  }, [copyGraphFn]);

  const cancelSaveConfirmation = useCallback(() => {
    setSaveConfirmDialogOpen(false);
    setIsSaving(false);
    setCurrentSaveAction(null);
    graphToSaveOrCopy.current = null;
  }, []);

  return {
    isSaving,
    isSaveConfirmDialogOpen,
    saveConfirmData,
    currentSaveAction,
    initiateSave,
    executeSaveExisting,
    executeSaveAsNew,
    cancelSaveConfirmation,
  };
};
