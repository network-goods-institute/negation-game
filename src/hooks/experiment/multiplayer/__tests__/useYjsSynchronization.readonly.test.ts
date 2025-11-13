import { renderHook } from "@testing-library/react";
import * as Y from "yjs";

jest.mock("@/hooks/experiment/multiplayer/yjs/saveHandlers", () => {
  const scheduleSave = jest.fn();
  const forceSave = jest.fn(async () => {});
  const syncFromMeta = jest.fn();
  const interruptSave = jest.fn();
  const interruptSaveForCleanup = jest.fn();
  return {
    createScheduleSave: () => ({
      scheduleSave,
      forceSave,
      syncFromMeta,
      interruptSave,
      interruptSaveForCleanup,
    }),
  };
});

describe("useYjsSynchronization - allowPersistence=false disables saves", () => {
  it("does not schedule saves for local-origin updates", async () => {
    const { createScheduleSave } = require("@/hooks/experiment/multiplayer/yjs/saveHandlers");
    const spies = createScheduleSave();

    const doc = new Y.Doc();
    const yNodes = doc.getMap<any>("nodes");
    const yEdges = doc.getMap<any>("edges");
    const yText = doc.getMap<Y.Text>("node_text");
    const yMeta = doc.getMap<any>("meta");

    const ydocRef = { current: doc } as any;
    const yNodesMapRef = { current: yNodes } as any;
    const yEdgesMapRef = { current: yEdges } as any;
    const yTextMapRef = { current: yText } as any;
    const yMetaMapRef = { current: yMeta } as any;
    const serverVectorRef = { current: null } as any;
    const saveTimerRef = { current: null } as any;
    const savingRef = { current: false } as any;
    const localOrigin = {};
    const localOriginRef = { current: localOrigin } as any;
    const isUndoRedoRef = { current: false } as any;

    const persistId = "doc-readonly";
    const setNodes = jest.fn();
    const setEdges = jest.fn();
    const setIsSaving = jest.fn();
    const setNextSaveTime = jest.fn();
    const undoManagerRef = { current: null } as any;
    const updateLocalStateVector = jest.fn();

    const { useYjsSynchronization } = await import("@/hooks/experiment/multiplayer/useYjsSynchronization");

    const { result } = renderHook(() =>
      useYjsSynchronization({
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
        isLockedForMe: undefined,
        onSaveComplete: undefined,
        onRemoteNodesAdded: undefined,
        currentUserId: undefined,
        allowPersistence: false,
      })
    );

    const cleanup = result.current.setupObservers();

    // Local-origin update
    doc.transact(() => {
      yNodes.set("n1", { id: "n1" } as any);
    }, localOrigin);

    // scheduleSave should not be called when allowPersistence=false
    expect(spies.scheduleSave).not.toHaveBeenCalled();

    cleanup && cleanup();
  });
});


