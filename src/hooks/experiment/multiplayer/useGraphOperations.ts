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
  createInversePair,
  createDeleteInversePair,
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
  ydoc: YjsDoc | null;
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
}

export const useGraphOperations = ({
  nodes,
  edges,
  yNodesMap,
  yEdgesMap,
  yTextMap,
  ydoc,
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
        setNodes
      ),
    [yNodesMap, ydoc, canWrite, localOrigin, setNodes]
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
        onShowUndoHint
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
        onClearSelections
      ),
    [
      yNodesMap,
      yTextMap,
      ydoc,
      canWrite,
      localOrigin,
      setNodes,
      onClearSelections,
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

  const createInversePairOp = useMemo(
    () =>
      createInversePair(
        nodes,
        yNodesMap,
        yTextMap,
        yEdgesMap,
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
      yNodesMap,
      yTextMap,
      yEdgesMap,
      ydoc,
      canWrite,
      localOrigin,
      setNodes,
      setEdges,
      isLockedForMe,
      getLockOwner,
    ]
  );

  const deleteInversePair = useMemo(
    () =>
      createDeleteInversePair(
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

  const updateNodeFavor = useCallback(
    (nodeId: string, favor: 1 | 2 | 3 | 4 | 5) => {
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

  const updateEdgeRelevance = useCallback(
    (edgeId: string, relevance: 1 | 2 | 3 | 4 | 5) => {
      setEdges((eds) =>
        eds.map((e) =>
          e.id === edgeId ? { ...e, data: { ...(e.data || {}), relevance } } : e
        )
      );
      if (yEdgesMap && ydoc && canWrite) {
        ydoc.transact(() => {
          const base = yEdgesMap.get(edgeId);
          if (base)
            yEdgesMap.set(edgeId, {
              ...base,
              data: { ...(base.data || {}), relevance },
            });
        }, localOrigin);
      }
    },
    [setEdges, yEdgesMap, ydoc, canWrite, localOrigin]
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
    deleteNode,
    addPointBelow,
    addObjectionForEdge,
    updateEdgeAnchorPosition,
    ensureEdgeAnchor,
    addNodeAtPosition,
    updateNodeType,
    createInversePair: createInversePairOp,
    deleteInversePair,
    updateEdgeRelevance,
    duplicateNodeWithConnections,
  };
};
