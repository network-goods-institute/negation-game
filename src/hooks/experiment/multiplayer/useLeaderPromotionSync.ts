import { useEffect, useState } from 'react';
import type * as Y from 'yjs';
import type { Node, Edge } from '@xyflow/react';
import { mergeNodesWithText } from '@/hooks/experiment/multiplayer/yjs/text';

interface UseLeaderPromotionSyncParams {
  isLeader: boolean;
  yNodesMap: Y.Map<Node> | null;
  yEdgesMap: Y.Map<Edge> | null;
  yTextMap: Y.Map<Y.Text> | null;
  setNodes: (updater: (nodes: Node[]) => Node[]) => void;
  setEdges: (updater: (edges: Edge[]) => Edge[]) => void;
  clearConnect?: () => void;
}

/**
 * Ensures that when a read-only client is promoted to leader, it first overwrites
 * its local state from Yjs before enabling further Yjs writes. Returns leaderSynced
 * which should be used to gate write-capable handlers.
 */
export const useLeaderPromotionSync = ({
  isLeader,
  yNodesMap,
  yEdgesMap,
  yTextMap,
  setNodes,
  setEdges,
  clearConnect,
}: UseLeaderPromotionSyncParams) => {
  const [leaderSynced, setLeaderSynced] = useState(false);

  useEffect(() => {
    if (!isLeader) {
      setLeaderSynced(false);
      return;
    }

    try {
      const yn = yNodesMap;
      const ye = yEdgesMap;
      const yt = yTextMap;
      if (!yn || !ye) return;
      const nextNodes = Array.from(yn as any as Map<string, any>).map(([, v]) => v as any);
      nextNodes.sort((a: any, b: any) => (a.id || '').localeCompare(b.id || ''));
      const nextEdges = Array.from(ye as any as Map<string, any>).map(([, v]) => v as any);
      nextEdges.sort((a: any, b: any) => (a.id || '').localeCompare(b.id || ''));
      setEdges(() => nextEdges as any);
      setNodes((prev) => mergeNodesWithText(nextNodes as any, yt as any, new Map((prev as any[]).map((p: any) => [p.id, p]))) as any);
    } catch {}

    // Reset any in-progress connect state to avoid ambiguous transitions
    try { clearConnect?.(); } catch {}

    setLeaderSynced(true);
  }, [isLeader, yNodesMap, yEdgesMap, yTextMap, setNodes, setEdges, clearConnect]);

  return leaderSynced;
};

export default useLeaderPromotionSync;

