import { toast } from "sonner";
import { showReadOnlyToast } from "@/utils/readonlyToast";

export const createDeleteNode = (
  nodes: any[],
  edges: any[],
  yNodesMap: any,
  yEdgesMap: any,
  yTextMap: any,
  ydoc: any,
  canWrite: boolean,
  localOrigin: object,
  setNodes: (updater: (nodes: any[]) => any[]) => void,
  setEdges: (updater: (edges: any[]) => any[]) => void,
  isLockedForMe?: (nodeId: string) => boolean,
  getLockOwner?: (nodeId: string) => { name?: string } | null,
  onShowUndoHint?: (position: { x: number; y: number }) => void,
  yMetaMap?: any,
  documentId?: string
) => {
  return (nodeId: string) => {
    if (!canWrite) {
      showReadOnlyToast();
      return;
    }

    if (isLockedForMe?.(nodeId)) {
      const owner = getLockOwner?.(nodeId);
      toast.warning(`Locked by ${owner?.name || "another user"}`);
      return;
    }
    const edge = edges.find((e: any) => e.id === nodeId);
    if (edge) {
      const edgesToDelete = [edge];

      // Find objection edges attached to this edge's anchor node
      const anchorNode = nodes.find((n: any) => n.id === `anchor:${edge.id}`);
      if (anchorNode) {
        const objectionEdges = edges.filter(
          (e: any) =>
            e.type === "objection" &&
            (e.source === anchorNode.id || e.target === anchorNode.id)
        );
        // Delete the objection edges but preserve all nodes (including objection nodes)
        edgesToDelete.push(...objectionEdges);
      }

      // When deleting an edge, delete the edge and any attached objection edges, but preserve all nodes
      if (yEdgesMap && ydoc) {
        ydoc.transact(() => {
          for (const e of edgesToDelete) {
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            yEdgesMap.delete(e.id as any);
          }
        }, localOrigin);

        // Update local state after Yjs sync
        setEdges((eds) =>
          eds.filter((e: any) => !edgesToDelete.some((del) => del.id === e.id))
        );
      } else {
        // Fallback for non-multiplayer mode
        setEdges((eds) =>
          eds.filter((e: any) => !edgesToDelete.some((del) => del.id === e.id))
        );
      }
      return;
    }

    const node = nodes.find((n: any) => n.id === nodeId);
    if (!node) {
      return;
    }

    // Prevent deletion of title nodes
    if (node.type === "title") {
      toast?.warning?.("Cannot delete the title node");
      return;
    }

    if (onShowUndoHint) {
      const abs = (node.positionAbsolute ||
        node.position || { x: 0, y: 0 }) as { x?: number; y?: number };
      const baseX = typeof abs.x === "number" ? abs.x : 0;
      const baseY = typeof abs.y === "number" ? abs.y : 0;
      const measured = (node as any).measured as
        | { width?: number; height?: number }
        | undefined;
      const style = (node as any).style as
        | { width?: number; height?: number }
        | undefined;
      const width =
        typeof (node as any).width === "number"
          ? (node as any).width
          : typeof measured?.width === "number"
            ? measured.width
            : typeof style?.width === "number"
              ? style.width
              : 0;
      const height =
        typeof (node as any).height === "number"
          ? (node as any).height
          : typeof measured?.height === "number"
            ? measured.height
            : typeof style?.height === "number"
              ? style.height
              : 0;

      onShowUndoHint({
        x: baseX + (width || 0) / 2,
        y: baseY + (height || 0) / 2,
      });
    }

    const incidentEdges = edges.filter(
      (e: any) => e.source === nodeId || e.target === nodeId
    );

    const edgesToDeleteIds = new Set<string>(
      incidentEdges.map((e: any) => e.id)
    );
    const nodesToDeleteIds = new Set<string>();

    if (node.type !== "objection") {
      for (const incidentEdge of incidentEdges) {
        const anchorNode = nodes.find(
          (n: any) => n.id === `anchor:${incidentEdge.id}`
        );

        if (anchorNode && anchorNode.id !== nodeId) {
          nodesToDeleteIds.add(anchorNode.id);

          const objectionEdges = edges.filter(
            (e: any) =>
              e.type === "objection" &&
              (e.source === anchorNode.id || e.target === anchorNode.id)
          );

          for (const objEdge of objectionEdges) {
            edgesToDeleteIds.add(objEdge.id);
          }
        }
      }
    }

    // First sync to Yjs, then update local state to ensure consistency
    if (yNodesMap && yEdgesMap && ydoc) {
      ydoc.transact(() => {
        edgesToDeleteIds.forEach((edgeId) => {
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          yEdgesMap.delete(edgeId as any);
        });
        try {
          if (yMetaMap) {
            for (const edgeId of Array.from(edgesToDeleteIds)) {
              // eslint-disable-next-line drizzle/enforce-delete-with-where
              yMetaMap.delete(`mindchange:${String(edgeId)}` as any);
            }
          }
        } catch {}

        // eslint-disable-next-line drizzle/enforce-delete-with-where
        yNodesMap.delete(nodeId as any);
        try {
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          yTextMap?.delete(nodeId as any);
        } catch {}

        nodesToDeleteIds.forEach((id) => {
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          yNodesMap.delete(id as any);
          try {
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            yTextMap?.delete(id as any);
          } catch {}
        });
      }, localOrigin);

      // Update local state after Yjs sync
      setEdges((eds) => eds.filter((e: any) => !edgesToDeleteIds.has(e.id)));
      setNodes((nds) =>
        nds.filter((n: any) => n.id !== nodeId && !nodesToDeleteIds.has(n.id))
      );
    } else {
      setEdges((eds) => eds.filter((e: any) => !edgesToDeleteIds.has(e.id)));
      setNodes((nds) =>
        nds.filter((n: any) => n.id !== nodeId && !nodesToDeleteIds.has(n.id))
      );
    }
  };
};
