import { useMemo, useCallback } from "react";
import { Node, Edge } from "@xyflow/react";
import {
  createUpdateNodeContent,
  createUpdateNodeHidden,
  createUpdateNodePosition,
  createDeleteNode,
  createAddPointBelow,
  createAddObjectionForEdge,
  createUpdateEdgeAnchorPosition,
  createEnsureEdgeAnchor,
  createAddNodeAtPosition,
  createUpdateNodeType,
  createUpdateEdgeRelevance,
} from "@/utils/experiment/multiplayer/graphOperations";
import { createDuplicateNodeWithConnections } from "@/utils/experiment/multiplayer/graphOperations/nodeDuplication";
import type {
  YjsDoc,
  YNodesMap,
  YEdgesMap,
  YTextMap,
  NodesUpdater,
  EdgesUpdater,
  IsLockedForMe,
  GetLockOwner,
  GetViewportOffset,
  GetPreferredEdgeType,
  OnEdgeCreated,
  OnShowUndoHint,
} from "@/types/multiplayer";
import type { YMetaMap } from "@/types/multiplayer";

/**
 * Consolidates all graph manipulation operations (add, delete, update nodes/edges).
 * Creates memoized operation functions to avoid unnecessary re-renders.
 *
 * @returns Object containing all graph operation functions
 */
interface UseGraphOperationsProps {
  nodes: Node[];
  edges: Edge[];
  yNodesMap: YNodesMap | null;
  yEdgesMap: YEdgesMap | null;
  yTextMap: YTextMap | null;
  yMetaMap?: YMetaMap | null;
  ydoc: YjsDoc | null;
  documentId?: string;
  canWrite: boolean;
  writeSynced: boolean;
  localOrigin: object;
  lastAddRef: React.MutableRefObject<Record<string, number>>;
  setNodes: NodesUpdater;
  setEdges: EdgesUpdater;
  isLockedForMe?: IsLockedForMe;
  getLockOwner?: GetLockOwner;
  getViewportOffset: GetViewportOffset;
  onEdgeCreated?: OnEdgeCreated;
  getPreferredEdgeType?: GetPreferredEdgeType;
  onShowUndoHint?: OnShowUndoHint;
  onClearSelections?: () => void;
  onNodeAddedCenterOnce?: (id: string) => void;
  connectMode?: boolean;
}

export const useGraphOperations = ({
  nodes,
  edges,
  yNodesMap,
  yEdgesMap,
  yTextMap,
  yMetaMap,
  ydoc,
  documentId,
  canWrite,
  writeSynced,
  localOrigin,
  lastAddRef,
  setNodes,
  setEdges,
  isLockedForMe,
  getLockOwner,
  getViewportOffset,
  onEdgeCreated,
  getPreferredEdgeType,
  onShowUndoHint,
  onClearSelections,
  onNodeAddedCenterOnce,
  connectMode,
}: UseGraphOperationsProps) => {
  const updateNodeContent = useMemo(
    () =>
      createUpdateNodeContent(yTextMap, ydoc, canWrite, localOrigin, setNodes),
    [yTextMap, ydoc, canWrite, localOrigin, setNodes]
  );

  const updateNodeHidden = useMemo(
    () =>
      createUpdateNodeHidden(yNodesMap, ydoc, canWrite, localOrigin, setNodes),
    [yNodesMap, ydoc, canWrite, localOrigin, setNodes]
  );

  const updateNodePosition = useMemo(
    () =>
      createUpdateNodePosition(
        yNodesMap,
        ydoc,
        canWrite,
        localOrigin,
        setNodes,
        connectMode
      ),
    [yNodesMap, ydoc, canWrite, localOrigin, setNodes, connectMode]
  );

  const deleteNode = useMemo(
    () =>
      createDeleteNode(
        nodes,
        edges,
        yNodesMap,
        yEdgesMap,
        yTextMap,
        ydoc,
        canWrite,
        localOrigin,
        setNodes,
        setEdges,
        isLockedForMe,
        getLockOwner,
        onShowUndoHint,
        yMetaMap,
        documentId
      ),
    [
      nodes,
      edges,
      yNodesMap,
      yEdgesMap,
      yTextMap,
      ydoc,
      canWrite,
      localOrigin,
      setNodes,
      setEdges,
      isLockedForMe,
      getLockOwner,
      onShowUndoHint,
      yMetaMap,
      documentId,
    ]
  );

  const addPointBelow = useMemo(
    () =>
      createAddPointBelow(
        nodes,
        yNodesMap,
        yEdgesMap,
        yTextMap,
        ydoc,
        canWrite,
        localOrigin,
        lastAddRef,
        setNodes,
        setEdges,
        isLockedForMe,
        getLockOwner,
        getViewportOffset,
        {
          getPreferredEdgeType: getPreferredEdgeType || (() => "support"),
          onEdgeCreated,
          onNodeCreated: onClearSelections,
          onNodeAdded: onNodeAddedCenterOnce,
        }
      ),
    [
      nodes,
      yNodesMap,
      yEdgesMap,
      yTextMap,
      ydoc,
      canWrite,
      localOrigin,
      lastAddRef,
      setNodes,
      setEdges,
      isLockedForMe,
      getLockOwner,
      getViewportOffset,
      getPreferredEdgeType,
      onEdgeCreated,
      onClearSelections,
      onNodeAddedCenterOnce,
    ]
  );

  const addObjectionForEdge = useMemo(
    () =>
      createAddObjectionForEdge(
        nodes,
        edges,
        yNodesMap,
        yEdgesMap,
        yTextMap,
        ydoc,
        canWrite,
        localOrigin,
        setNodes,
        setEdges,
        isLockedForMe,
        getLockOwner,
        undefined
      ),
    [
      nodes,
      edges,
      yNodesMap,
      yEdgesMap,
      yTextMap,
      ydoc,
      canWrite,
      localOrigin,
      setNodes,
      setEdges,
      isLockedForMe,
      getLockOwner,
    ]
  );

  const updateEdgeAnchorPosition = useMemo(
    () =>
      createUpdateEdgeAnchorPosition(
        setNodes,
        null,
        null,
        false,
        localOrigin,
        undefined
      ),
    [setNodes, localOrigin]
  );

  const addNodeAtPosition = useMemo(
    () =>
      createAddNodeAtPosition(
        yNodesMap,
        yTextMap,
        ydoc,
        canWrite,
        localOrigin,
        setNodes,
        onClearSelections,
        onNodeAddedCenterOnce
      ),
    [
      yNodesMap,
      yTextMap,
      ydoc,
      canWrite,
      localOrigin,
      setNodes,
      onClearSelections,
      onNodeAddedCenterOnce,
    ]
  );

  const updateNodeType = useMemo(
    () =>
      createUpdateNodeType(
        yNodesMap,
        yTextMap,
        ydoc,
        canWrite,
        localOrigin,
        setNodes
      ),
    [yNodesMap, yTextMap, ydoc, canWrite, localOrigin, setNodes]
  );

  const updateNodeFavor = useCallback(
    (nodeId: string, favor: 1 | 2 | 3 | 4 | 5) => {
      if (!canWrite) {
        try { (require('@/utils/readonlyToast') as any).showReadOnlyToast?.(); } catch {}
        return;
      }
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...(n.data || {}), favor } } : n
        )
      );
      if (yNodesMap && ydoc && canWrite) {
        ydoc.transact(() => {
          const base = yNodesMap.get(nodeId);
          if (base)
            yNodesMap.set(nodeId, {
              ...base,
              data: { ...(base.data || {}), favor },
            });
        }, localOrigin);
      }
    },
    [setNodes, yNodesMap, ydoc, canWrite, localOrigin]
  );

  const updateEdgeRelevance = useMemo(
    () => createUpdateEdgeRelevance(
      yEdgesMap,
      ydoc,
      canWrite,
      localOrigin,
      setEdges,
    ),
    [yEdgesMap, ydoc, canWrite, localOrigin, setEdges]
  );

  

  const ensureEdgeAnchor = useMemo(
    () => createEnsureEdgeAnchor(setNodes),
    [setNodes]
  );

  const duplicateNodeWithConnections = useMemo(
    () =>
      createDuplicateNodeWithConnections(
        nodes,
        edges,
        yNodesMap,
        yEdgesMap,
        yTextMap,
        ydoc,
        canWrite,
        localOrigin,
        setNodes,
        setEdges,
        isLockedForMe,
        getLockOwner
      ),
    [
      nodes,
      edges,
      yNodesMap,
      yEdgesMap,
      yTextMap,
      ydoc,
      canWrite,
      localOrigin,
      setNodes,
      setEdges,
      isLockedForMe,
      getLockOwner,
    ]
  );

  return {
    updateNodeContent,
    updateNodeHidden,
    updateNodePosition,
    updateNodeFavor,
    updateEdgeRelevance,
    deleteNode,
    addPointBelow,
    addObjectionForEdge,
    updateEdgeAnchorPosition,
    ensureEdgeAnchor,
    addNodeAtPosition,
    updateNodeType,
    duplicateNodeWithConnections,
  };
};
