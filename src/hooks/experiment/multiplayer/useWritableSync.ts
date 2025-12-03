import { useEffect, useState } from "react";
import type * as Y from "yjs";
import type { Node, Edge } from "@xyflow/react";
import { mergeNodesWithText } from "@/hooks/experiment/multiplayer/yjs/text";

interface UseWritableSyncParams {
  canWrite: boolean;
  yNodesMap: Y.Map<Node> | null;
  yEdgesMap: Y.Map<Edge> | null;
  yTextMap: Y.Map<Y.Text> | null;
  setNodes: (updater: (nodes: Node[]) => Node[]) => void;
  setEdges: (updater: (edges: Edge[]) => Edge[]) => void;
  clearConnect?: () => void;
}

/**
 * Ensures that when a read-only client regains write access it first overwrites
 * its local state from Yjs before enabling further writes. Returns writeSynced
 * which should gate any write-capable handlers.
 */
export const useWritableSync = ({
  canWrite,
  yNodesMap,
  yEdgesMap,
  yTextMap,
  setNodes,
  setEdges,
  clearConnect,
}: UseWritableSyncParams) => {
  const [writeSynced, setWriteSynced] = useState(false);

  useEffect(() => {
    if (!canWrite) {
      setWriteSynced(false);
      return;
    }

    try {
      const yn = yNodesMap;
      const ye = yEdgesMap;
      const yt = yTextMap;
      if (!yn || !ye) return;
      let nextNodes = Array.from(yn as any as Map<string, any>).map(
        ([, v]) => v as any
      );
      nextNodes.sort((a: any, b: any) =>
        (a.id || "").localeCompare(b.id || "")
      );
      const nextEdges = Array.from(ye as any as Map<string, any>).map(
        ([, v]) => v as any
      );
      nextEdges.sort((a: any, b: any) =>
        (a.id || "").localeCompare(b.id || "")
      );
      // Legacy conversion: answer -> point (objections are rendered dynamically as point-like when negating)
      nextNodes = nextNodes.map((n: any) => {
        if (n.type === "answer") return { ...n, type: "point" };
        return n;
      });
      const edgeIds = new Set<string>(
        nextEdges.map((edge: any) => String((edge as any)?.id || ""))
      );
      const activeAnchorIds = new Set<string>();
      nextEdges.forEach((edge: any) => {
        const target = (edge as any)?.target;
        if ((edge as any)?.type === "objection" && typeof target === "string" && target.startsWith("anchor:")) {
          const parentEdgeId = target.slice("anchor:".length);
          if (edgeIds.has(parentEdgeId)) {
            activeAnchorIds.add(target);
          }
        }
      });
      setEdges(() => nextEdges as any);
      setNodes(
        (prev) =>
          mergeNodesWithText(
            nextNodes as any,
            yt as any,
            new Map((prev as any[]).map((p: any) => [p.id, p])),
            undefined,
            activeAnchorIds
          ) as any
      );
    } catch {}

    // Reset any in-progress connect state to avoid ambiguous transitions
    try {
      clearConnect?.();
    } catch {}

    setWriteSynced(true);
  }, [
    canWrite,
    yNodesMap,
    yEdgesMap,
    yTextMap,
    setNodes,
    setEdges,
    clearConnect,
  ]);

  return writeSynced;
};

export default useWritableSync;
