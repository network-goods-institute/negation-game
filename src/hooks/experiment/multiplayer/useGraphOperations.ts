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
  currentUserId?: string | null;
  currentUsername?: string | null;
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
  currentUserId,
  currentUsername,
}: UseGraphOperationsProps) => {
  const creatorInfo = useMemo(
    () => ({
      userId: currentUserId || null,
      username: currentUsername || null,
    }),
    [currentUserId, currentUsername]
  );
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
        creatorInfo,
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
      creatorInfo,
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
        creatorInfo,
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
      creatorInfo,
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
        creatorInfo,
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
      creatorInfo,
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

  const normalizeVotes = useCallback(
    (raw: any): Array<{ id: string; name?: string }> => {
      if (!Array.isArray(raw)) return [];
      return raw
        .map((entry) =>
          typeof entry === 'string' ? { id: entry, name: undefined } : entry
        )
        .filter((v) => v && typeof v.id === 'string')
        .sort((a, b) => a.id.localeCompare(b.id));
    },
    []
  );

  const toggleNodeVote = useCallback(
    (nodeId: string, userId: string, name?: string) => {
      if (!canWrite) {
        try { (require('@/utils/readonlyToast') as any).showReadOnlyToast?.(); } catch {}
        return;
      }
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const currentVotes = normalizeVotes((n.data as any)?.votes);
          const existing = currentVotes.find((v) => v.id === userId);
          const updatedVotes = existing
            ? currentVotes.filter((v) => v.id !== userId)
            : [...currentVotes, { id: userId, name }];
          return { ...n, data: { ...(n.data || {}), votes: updatedVotes } };
        })
      );
      if (yNodesMap && ydoc && canWrite) {
        ydoc.transact(() => {
          const base = yNodesMap.get(nodeId);
          if (base) {
            const currentVotes = normalizeVotes((base as any).data?.votes);
            const existing = currentVotes.find((v) => v.id === userId);
            const votes = existing
              ? currentVotes.filter((v) => v.id !== userId)
              : [...currentVotes, { id: userId, name }];
            yNodesMap.set(nodeId, {
              ...base,
              data: { ...(base.data || {}), votes },
            });
          }
        }, localOrigin);
      }
    },
    [setNodes, yNodesMap, ydoc, canWrite, localOrigin, normalizeVotes]
  );

  const toggleEdgeVote = useCallback(
    (edgeId: string, userId: string, name?: string) => {
      if (!canWrite) {
        try { (require('@/utils/readonlyToast') as any).showReadOnlyToast?.(); } catch {}
        return;
      }
      setEdges((eds) =>
        eds.map((e) => {
          if (e.id !== edgeId) return e;
          const currentVotes = normalizeVotes((e.data as any)?.votes);
          const existing = currentVotes.find((v) => v.id === userId);
          const updatedVotes = existing
            ? currentVotes.filter((v) => v.id !== userId)
            : [...currentVotes, { id: userId, name }];
          return { ...e, data: { ...(e.data || {}), votes: updatedVotes } };
        })
      );
      if (yEdgesMap && ydoc && canWrite) {
        ydoc.transact(() => {
          const base = yEdgesMap.get(edgeId);
          if (base) {
            const currentVotes = normalizeVotes((base as any).data?.votes);
            const existing = currentVotes.find((v) => v.id === userId);
            const votes = existing
              ? currentVotes.filter((v) => v.id !== userId)
              : [...currentVotes, { id: userId, name }];
            yEdgesMap.set(edgeId, {
              ...base,
              data: { ...(base.data || {}), votes },
            });
          }
        }, localOrigin);
      }
    },
    [setEdges, yEdgesMap, ydoc, canWrite, localOrigin, normalizeVotes]
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
    toggleNodeVote,
    toggleEdgeVote,
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
