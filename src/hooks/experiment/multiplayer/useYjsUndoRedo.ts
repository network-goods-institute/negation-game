import { useCallback, useRef, useState } from "react";
import * as Y from "yjs";
import { Node, Edge } from "@xyflow/react";
import { addTextToUndoScope, createUndoManager } from "./yjs/undo";

interface UseYjsUndoRedoProps {
  yNodesMapRef: React.MutableRefObject<Y.Map<Node> | null>;
  yEdgesMapRef: React.MutableRefObject<Y.Map<Edge> | null>;
  yTextMapRef: React.MutableRefObject<Y.Map<Y.Text> | null>;
  localOriginRef: React.MutableRefObject<unknown>;
  isUndoRedoRef: React.MutableRefObject<boolean>;
  scheduleSave?: () => void;
}

/**
 * Manages collaborative undo/redo functionality backed by Yjs.
 * Sets up the shared UndoManager, tracks stack state, and exposes
 * imperative undo/redo helpers while keeping callbacks stable.
 */
export const useYjsUndoRedo = ({
  yNodesMapRef,
  yEdgesMapRef,
  yTextMapRef,
  localOriginRef,
  isUndoRedoRef,
  scheduleSave,
}: UseYjsUndoRedoProps) => {
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const scheduleSaveRef = useRef<(() => void) | undefined>(scheduleSave);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const recalcStacks = useCallback(() => {
    const manager = undoManagerRef.current;
    if (!manager) {
      setCanUndo(false);
      setCanRedo(false);
      return;
    }
    setCanUndo(manager.undoStack.length > 0);
    setCanRedo(manager.redoStack.length > 0);
  }, []);

  const setupUndoManager = useCallback(() => {
    const yNodes = yNodesMapRef.current;
    const yEdges = yEdgesMapRef.current;
    const yTextMap = yTextMapRef.current;

    if (!yNodes || !yEdges || !yTextMap) {
      return undefined;
    }

    undoManagerRef.current = createUndoManager(
      yNodes,
      yEdges,
      yTextMap,
      localOriginRef.current
    );

    addTextToUndoScope(undoManagerRef.current, yTextMap);
    recalcStacks();

    const manager = undoManagerRef.current;

    const handleStackItemAdded = () => recalcStacks();
    const handleStackItemPopped = () => recalcStacks();
    const handleStackCleared = () => recalcStacks();

    manager.on("stack-item-added", handleStackItemAdded);
    manager.on("stack-item-popped", handleStackItemPopped);
    manager.on("stack-cleared", handleStackCleared);

    return () => {
      try {
        manager.off("stack-item-added", handleStackItemAdded);
        manager.off("stack-item-popped", handleStackItemPopped);
        manager.off("stack-cleared", handleStackCleared);
      } catch {}
      undoManagerRef.current = null;
      setCanUndo(false);
      setCanRedo(false);
    };
  }, [localOriginRef, recalcStacks, yEdgesMapRef, yNodesMapRef, yTextMapRef]);

  const setScheduleSave = useCallback((handler?: () => void) => {
    scheduleSaveRef.current = handler;
  }, []);

  const runWithUndoTracking = useCallback((action: (manager: Y.UndoManager) => void) => {
    const manager = undoManagerRef.current;
    if (!manager) return;

    isUndoRedoRef.current = true;
    action(manager);
    setTimeout(() => {
      isUndoRedoRef.current = false;
    }, 100);

    recalcStacks();

    try {
      scheduleSaveRef.current?.();
    } catch {}
  }, [isUndoRedoRef, recalcStacks]);

  const undo = useCallback(() => {
    runWithUndoTracking((manager) => manager.undo());
  }, [runWithUndoTracking]);

  const redo = useCallback(() => {
    runWithUndoTracking((manager) => manager.redo());
  }, [runWithUndoTracking]);

  const registerTextInUndoScope = useCallback((text: Y.Text | undefined | null) => {
    try {
      if (undoManagerRef.current && text) {
        undoManagerRef.current.addToScope(text);
      }
    } catch (error) {
      console.warn("[undo] Failed to register Y.Text in undo scope", error);
    }
  }, []);

  return {
    undoManagerRef,
    setupUndoManager,
    undo,
    redo,
    canUndo,
    canRedo,
    registerTextInUndoScope,
    setScheduleSave,
  };
};
