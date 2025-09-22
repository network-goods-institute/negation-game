import {
  useCallback,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import * as Y from "yjs";
import { Edge, Node } from "@xyflow/react";
import { createUpdateNodesFromY } from "./yjs/nodeSync";
import { createUpdateEdgesFromY } from "./yjs/edgeSync";
import {
  createOnTextMapChange,
  createUpdateNodesFromText,
} from "./yjs/textSync";
import { createScheduleSave } from "./yjs/saveHandlers";

interface UseYjsSynchronizationProps {
  ydocRef: MutableRefObject<Y.Doc | null>;
  yNodesMapRef: MutableRefObject<Y.Map<Node> | null>;
  yEdgesMapRef: MutableRefObject<Y.Map<Edge> | null>;
  yTextMapRef: MutableRefObject<Y.Map<Y.Text> | null>;
  yMetaMapRef: MutableRefObject<Y.Map<unknown> | null>;
  serverVectorRef: MutableRefObject<Uint8Array | null>;
  saveTimerRef: MutableRefObject<number | null>;
  savingRef: MutableRefObject<boolean>;
  localOriginRef: MutableRefObject<unknown>;
  isUndoRedoRef: MutableRefObject<boolean>;
  persistId: string;
  setNodes: (updater: (nodes: Node[]) => Node[]) => void;
  setEdges: (updater: (edges: Edge[]) => Edge[]) => void;
  setIsSaving: (saving: boolean) => void;
  setNextSaveTime: Dispatch<SetStateAction<number | null>>;
  undoManagerRef: MutableRefObject<Y.UndoManager | null>;
  updateLocalStateVector: () => void;
  isLockedForMe?: (nodeId: string) => boolean;
}

export interface SynchronizationHandlers {
  setupObservers: () => (() => void) | undefined;
  getForceSave: () => (() => Promise<void>) | null;
  getScheduleSave: () => (() => void) | null;
  getInterruptSave: () => (() => void) | null;
  getInterruptSaveForCleanup: () => (() => void) | null;
}

/**
 * Wires Yjs CRDTs to React state and orchestrates distributed saves.
 */
export const useYjsSynchronization = ({
  ydocRef,
  yNodesMapRef,
  yEdgesMapRef,
  yTextMapRef,
  yMetaMapRef,
  serverVectorRef,
  saveTimerRef,
  savingRef,
  localOriginRef,
  isUndoRedoRef,
  persistId,
  setNodes,
  setEdges,
  setIsSaving,
  setNextSaveTime,
  undoManagerRef,
  updateLocalStateVector,
  isLockedForMe,
}: UseYjsSynchronizationProps): SynchronizationHandlers => {
  const lastNodesSignatureRef = useRef<string>("");
  const lastEdgesSignatureRef = useRef<string>("");
  const forceSaveRef = useRef<(() => Promise<void>) | null>(null);
  const scheduleSaveRef = useRef<(() => void) | null>(null);
  const interruptSaveRef = useRef<(() => void) | null>(null);
  const interruptSaveForCleanupRef = useRef<(() => void) | null>(null);

  const setupObservers = useCallback(() => {
    const doc = ydocRef.current;
    const yNodes = yNodesMapRef.current;
    const yEdges = yEdgesMapRef.current;
    const yTextMap = yTextMapRef.current;
    const yMetaMap = yMetaMapRef.current;

    if (!doc || !yNodes || !yEdges || !yTextMap || !yMetaMap) {
      return undefined;
    }

    const {
      scheduleSave,
      forceSave,
      syncFromMeta,
      interruptSave,
      interruptSaveForCleanup,
    } = createScheduleSave(
      ydocRef,
      serverVectorRef,
      setIsSaving,
      savingRef,
      saveTimerRef,
      persistId,
      setNextSaveTime,
      yMetaMapRef,
      localOriginRef
    );

    forceSaveRef.current = forceSave;
    scheduleSaveRef.current = scheduleSave;
    interruptSaveRef.current = interruptSave;
    interruptSaveForCleanupRef.current = interruptSaveForCleanup;

    const onDocUpdate = (_update: Uint8Array, origin: unknown) => {
      if (origin === localOriginRef.current) {
        // This is a local change - schedule a save
        try {
          scheduleSave();
        } catch {}
        return;
      }
      if (serverVectorRef.current) {
        updateLocalStateVector();
      }
    };
    doc.on("update", onDocUpdate);

    const updateNodesFromY = createUpdateNodesFromY(
      yNodes,
      yTextMapRef,
      lastNodesSignatureRef,
      setNodes,
      localOriginRef,
      isUndoRedoRef,
      isLockedForMe
    );

    const updateEdgesFromY = createUpdateEdgesFromY(
      yEdges,
      lastEdgesSignatureRef,
      setEdges,
      localOriginRef,
      isUndoRedoRef
    );

    const updateNodesFromText = createUpdateNodesFromText(
      yTextMapRef,
      localOriginRef,
      setNodes,
      isUndoRedoRef
    );

    const onTextMapChange = createOnTextMapChange(yTextMap, undoManagerRef);

    yNodes.observe(updateNodesFromY);
    yEdges.observe(updateEdgesFromY);
    yTextMap.observeDeep(updateNodesFromText);
    yTextMap.observe(onTextMapChange);

    const onMetaChange = (
      _event: Y.YMapEvent<unknown>,
      transaction: Y.Transaction
    ) => {
      // Ignore changes made by syncFromMeta itself to prevent infinite loops
      if (transaction.origin === "sync-recovery") return;
      try {
        syncFromMeta();
      } catch {}
    };
    try {
      syncFromMeta();
    } catch {}
    yMetaMap.observe(onMetaChange);

    updateNodesFromY({} as Y.YMapEvent<Node>, {} as Y.Transaction);
    updateEdgesFromY({} as Y.YMapEvent<Edge>, {} as Y.Transaction);

    return () => {
      doc.off("update", onDocUpdate);
      yNodes.unobserve(updateNodesFromY);
      yEdges.unobserve(updateEdgesFromY);
      yTextMap.unobserveDeep(updateNodesFromText);
      yTextMap.unobserve(onTextMapChange);
      yMetaMap.unobserve(onMetaChange);
    };
  }, [
    persistId,
    isUndoRedoRef,
    localOriginRef,
    savingRef,
    saveTimerRef,
    setEdges,
    setIsSaving,
    setNextSaveTime,
    setNodes,
    serverVectorRef,
    undoManagerRef,
    updateLocalStateVector,
    yMetaMapRef,
    yEdgesMapRef,
    yNodesMapRef,
    yTextMapRef,
    ydocRef,
  ]);

  const getForceSave = useCallback(() => forceSaveRef.current, []);
  const getScheduleSave = useCallback(() => scheduleSaveRef.current, []);
  const getInterruptSave = useCallback(() => interruptSaveRef.current, []);
  const getInterruptSaveForCleanup = useCallback(
    () => interruptSaveForCleanupRef.current,
    []
  );

  return {
    setupObservers,
    getForceSave,
    getScheduleSave,
    getInterruptSave,
    getInterruptSaveForCleanup,
  };
};
