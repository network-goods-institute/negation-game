import { useState, useCallback } from "react";
import type { ViewpointGraph } from "@/atoms/viewpointAtoms";

interface UseConfirmationDialogsProps {
  onDiscard: () => Promise<void> | void;
  onCopy: (graph: ViewpointGraph) => Promise<boolean | void | any>;
  getCurrentGraph: () => ViewpointGraph;
}

export const useConfirmationDialogs = ({
  onDiscard,
  onCopy,
  getCurrentGraph,
}: UseConfirmationDialogsProps) => {
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [isCopyConfirmOpen, setIsCopyConfirmOpen] = useState(false);
  const [isSaveAsNewConfirmOpen, setIsSaveAsNewConfirmOpen] = useState(false);

  const openDiscardDialog = useCallback(() => setIsDiscardDialogOpen(true), []);
  const closeDiscardDialog = useCallback(
    () => setIsDiscardDialogOpen(false),
    []
  );

  const openCopyConfirmDialog = useCallback(
    () => setIsCopyConfirmOpen(true),
    []
  );
  const closeCopyConfirmDialog = useCallback(
    () => setIsCopyConfirmOpen(false),
    []
  );

  const openSaveAsNewConfirmDialog = useCallback(
    () => setIsSaveAsNewConfirmOpen(true),
    []
  );
  const closeSaveAsNewConfirmDialog = useCallback(
    () => setIsSaveAsNewConfirmOpen(false),
    []
  );

  const handleConfirmDiscard = useCallback(async () => {
    await onDiscard();
    closeDiscardDialog();
  }, [onDiscard, closeDiscardDialog]);

  const handleConfirmCopy = useCallback(async () => {
    const graph = getCurrentGraph();
    const success = await onCopy(graph);
    closeCopyConfirmDialog();
    return success;
  }, [onCopy, getCurrentGraph, closeCopyConfirmDialog]);

  const handleConfirmSaveAsNew = useCallback(async () => {
    const graph = getCurrentGraph();
    const success = await onCopy(graph); // Save as new is essentially a copy operation
    closeSaveAsNewConfirmDialog();
    return success;
  }, [onCopy, getCurrentGraph, closeSaveAsNewConfirmDialog]);

  return {
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
  };
};
