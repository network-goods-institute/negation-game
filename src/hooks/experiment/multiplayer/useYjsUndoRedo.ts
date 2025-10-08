import { useCallback, useRef, useState, type MutableRefObject } from "react";
import * as Y from "yjs";
import type { Edge, Node } from "@xyflow/react";

interface UseYjsUndoRedoOptions {
  yNodesMapRef: MutableRefObject<Y.Map<Node> | null>;
  yEdgesMapRef: MutableRefObject<Y.Map<Edge> | null>;
  yTextMapRef: MutableRefObject<Y.Map<Y.Text> | null>;
  yMetaMapRef: MutableRefObject<Y.Map<unknown> | null>;
  localOriginRef: MutableRefObject<unknown>;
  isUndoRedoRef: MutableRefObject<boolean>;
}

interface UndoRedoApi {
  undoManagerRef: MutableRefObject<Y.UndoManager | null>;
  setupUndoManager: () => (() => void) | undefined;
  undo: () => void;
  redo: () => void;
  stopCapturing: () => void;
  canUndo: boolean;
  canRedo: boolean;
  setScheduleSave: (fn?: () => void) => void;
}

export const useYjsUndoRedo = ({
  yNodesMapRef,
  yEdgesMapRef,
  yTextMapRef,
  yMetaMapRef,
  localOriginRef,
  isUndoRedoRef,
}: UseYjsUndoRedoOptions): UndoRedoApi => {
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const trackedOriginsRef = useRef<Set<unknown>>(new Set());
  const fallbackOriginRef = useRef<object>({});
  const scheduleSaveRef = useRef<(() => void) | undefined>(undefined);
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
    const yMetaMap = yMetaMapRef.current;

    if (!yNodes || !yEdges || !yTextMap) {
      return undefined;
    }

    const trackedOrigins = trackedOriginsRef.current;
    trackedOrigins.clear();
    const effectiveOrigin = localOriginRef.current ?? fallbackOriginRef.current;
    trackedOrigins.add(effectiveOrigin);

    const managedTypes: Y.AbstractType<any>[] = [yNodes, yEdges, yTextMap];
    if (yMetaMap) {
      managedTypes.push(yMetaMap);
    }

    const manager = new Y.UndoManager(managedTypes, {
      trackedOrigins,
      captureTimeout: 600,
    });

    try {
      yTextMap.forEach((value) => {
        if (value instanceof Y.Text) {
          manager.addToScope(value);
        }
      });
    } catch {}

    undoManagerRef.current = manager;
    recalcStacks();

    const handleStackChanged = () => recalcStacks();
    manager.on("stack-item-added", handleStackChanged);
    manager.on("stack-item-popped", handleStackChanged);
    manager.on("stack-cleared", handleStackChanged);

    const handleMetaChanged = () => recalcStacks();
    if (yMetaMap) {
      try {
        yMetaMap.observe(handleMetaChanged);
      } catch {}
    }

    return () => {
      try {
        manager.off("stack-item-added", handleStackChanged);
        manager.off("stack-item-popped", handleStackChanged);
        manager.off("stack-cleared", handleStackChanged);
      } catch {}
      if (yMetaMap) {
        try {
          yMetaMap.unobserve(handleMetaChanged);
        } catch {}
      }
      undoManagerRef.current = null;
      // setCanUndo(false); // Commented to avoid setState during cleanup
      // setCanRedo(false); // Commented to avoid setState during cleanup
    };
  }, [
    fallbackOriginRef,
    localOriginRef,
    recalcStacks,
    yEdgesMapRef,
    yMetaMapRef,
    yNodesMapRef,
    yTextMapRef,
  ]);

  const setScheduleSave = useCallback((handler?: () => void) => {
    scheduleSaveRef.current = handler;
  }, []);

  const runWithUndoTracking = useCallback(
    (action: (manager: Y.UndoManager) => void) => {
      const manager = undoManagerRef.current;
      if (!manager) return;

      isUndoRedoRef.current = true;
      try {
        action(manager);
      } finally {
        setTimeout(() => {
          isUndoRedoRef.current = false;
        }, 0);
      }

      recalcStacks();

      try {
        scheduleSaveRef.current?.();
      } catch {}
    },
    [isUndoRedoRef, recalcStacks]
  );

  const undo = useCallback(() => {
    runWithUndoTracking((manager) => manager.undo());
  }, [runWithUndoTracking]);

  const redo = useCallback(() => {
    runWithUndoTracking((manager) => manager.redo());
  }, [runWithUndoTracking]);

  const stopCapturing = useCallback(() => {
    const manager = undoManagerRef.current;
    if (!manager) return;
    try {
      manager.stopCapturing();
      recalcStacks();
    } catch {}
  }, [recalcStacks]);

  return {
    undoManagerRef,
    setupUndoManager,
    undo,
    redo,
    stopCapturing,
    canUndo,
    canRedo,
    setScheduleSave,
  };
};
