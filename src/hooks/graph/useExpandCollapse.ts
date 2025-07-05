import { useCallback } from "react";
import { useReactFlow, Edge } from "@xyflow/react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { usePointData } from "@/queries/points/usePointData";
import { usePointNegations } from "@/queries/points/usePointNegations";
import { useAtom } from "jotai";
import {
  collapsedPointIdsAtom,
  collapsedNodePositionsAtom,
} from "@/atoms/viewpointAtoms";
import { undoCollapseStackAtom } from "@/atoms/viewpointAtoms";
import type { AppNode } from "@/components/graph/nodes/AppNode";

export function useExpandCollapse(
  id: string,
  pointId: number,
  parentId?: string
): { expand: () => void; collapse: () => Promise<void> } {
  const { addNodes, addEdges, deleteElements, getNodes, getNode, getEdges } =
    useReactFlow();
  const [collapsedPointIds, setCollapsedPointIds] = useAtom(
    collapsedPointIdsAtom
  );
  const [collapsedNodePositions, setCollapsedNodePositions] = useAtom(
    collapsedNodePositionsAtom
  );
  const [undoStack, setUndoStack] = useAtom(undoCollapseStackAtom);
  const { data: pointData } = usePointData(pointId);
  const { data: pointNegations } = usePointNegations(pointId);

  const expand = useCallback(() => {
    if (!pointData) {
      toast.error("Wait a second", {
        description: "Content is still loading. Please wait for it to finish loading before expanding.",
      });
      return;
    }
    // Determine already expanded negations
    const incoming = getEdges().filter((e) => e.target === id);
    const expandedIds = incoming
      .map(
        (e) => (getNode(e.source) as any)?.data?.pointId as number | undefined
      )
      .filter((nid): nid is number => nid !== undefined);
    // Compute which negations to expand
    const toExpand = pointData.negationIds.filter(
      (nid) => nid !== pointId && !expandedIds.includes(nid)
    );
    if (toExpand.length === 0) return;
    // Calculate positions
    const parentNode = getNode(id);
    if (!parentNode) return;
    const layouts = (() => {
      const count = toExpand.length;
      const spacing = 250;
      const verticalOffset = 200;
      const {
        x: parentX,
        y: parentY,
        measured,
      } = parentNode.position && parentNode.measured
        ? {
            x: parentNode.position.x,
            y: parentNode.position.y,
            measured: parentNode.measured,
          }
        : {
            x: parentNode.position.x,
            y: parentNode.position.y,
            measured: { height: 0 },
          };
      const parentHeight = measured.height || 200;
      if (count === 1) {
        return [{ x: parentX, y: parentY + parentHeight + verticalOffset }];
      }
      const positions: Array<{ x: number; y: number }> = [];
      const totalWidth = (count - 1) * spacing;
      const startX = parentX - totalWidth / 2;
      const dynamicOffset = verticalOffset + (count > 2 ? (count - 2) * 50 : 0);
      for (let i = 0; i < count; i++) {
        const progress = count > 1 ? i / (count - 1) : 0;
        const x = startX + progress * totalWidth;
        const arc = 60 * Math.sin(Math.PI * progress);
        const horizVar = (progress - 0.5) * 30;
        const y = parentY + parentHeight + dynamicOffset + arc;
        positions.push({ x: x + horizVar, y });
      }
      return positions;
    })();
    // Add nodes and edges
    toExpand.forEach((negId, idx) => {
      const unique = `${nanoid()}-${Date.now()}-${negId}`;

      const negationData = pointNegations?.find((n) => n.pointId === negId);

      addNodes({
        id: unique,
        type: "point",
        data: {
          pointId: negId,
          parentId: pointId,
          _lastModified: Date.now(),
          isExpanding: true,
          isObjection: negationData?.isObjection || false,
          objectionTargetId: negationData?.isObjection ? pointId : undefined,
        },
        position: layouts[idx],
      });
      addEdges({
        id: nanoid(),
        target: id,
        source: unique,
        type: parentId === "statement" ? "statement" : "negation",
        targetHandle: negationData?.isObjection
          ? `${id}-objection-handle`
          : `${id}-incoming-handle`,
        sourceHandle: `${unique}-source-handle`,
      });
    });
    // Clean up collapsed state
    setCollapsedPointIds((prev) => {
      const s = new Set(prev);
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      toExpand.forEach((nid) => s.delete(nid));
      return s;
    });
    setCollapsedNodePositions((prev) =>
      prev.filter(
        (pos) =>
          !toExpand.some(
            (nid) => pos.pointId === nid && pos.parentId === pointId
          )
      )
    );
    // Clear undo for this node
    setUndoStack((prev) => prev.filter((st) => st.topLevelNodeId !== id));
  }, [
    id,
    pointData,
    pointId,
    parentId,
    getNode,
    getEdges,
    addNodes,
    addEdges,
    setCollapsedPointIds,
    setCollapsedNodePositions,
    setUndoStack,
    pointNegations,
  ]);

  const collapse = useCallback(async () => {
    // Find all descendant node IDs (excluding this node)
    const descendantIds: string[] = [];
    const queue = [id];
    const visited = new Set<string>();
    while (queue.length) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      // Enqueue children
      getEdges()
        .filter((e) => e.target === current)
        .forEach((e) => {
          const childId = e.source;
          if (!visited.has(childId)) {
            queue.push(childId);
            descendantIds.push(childId);
          }
        });
    }
    // Always include this node itself
    const idsToRemove = [id, ...descendantIds];
    // Gather nodes and edges to remove
    const nodesToRemove: AppNode[] = idsToRemove
      .map((nid) => getNode(nid))
      .filter((n): n is AppNode => Boolean(n));
    const edgesToRemove: Edge[] = getEdges().filter(
      (e) => idsToRemove.includes(e.source) || idsToRemove.includes(e.target)
    );
    // Record undo state
    setUndoStack((stPrev) => [
      ...stPrev,
      {
        topLevelNodeId: id,
        nodesToRestore: nodesToRemove,
        edgesToRestore: edgesToRemove,
        expandedNodeIds: descendantIds,
      },
    ]);
    // Remove descendant nodes and edges
    deleteElements({ nodes: nodesToRemove, edges: edgesToRemove });
    // Save positions for restore
    setCollapsedNodePositions((prev) => [
      ...prev,
      ...nodesToRemove.map((n) => ({
        pointId: (n as any).data.pointId,
        x: n.position.x,
        y: n.position.y,
        parentId: (n as any).data.parentId,
      })),
    ]);
    // Mark as collapsed
    setCollapsedPointIds((prev) => {
      const s = new Set(prev);
      nodesToRemove.forEach((n) => s.add((n as any).data.pointId));
      return s;
    });
  }, [
    id,
    getNode,
    getEdges,
    deleteElements,
    setUndoStack,
    setCollapsedNodePositions,
    setCollapsedPointIds,
  ]);

  return { expand, collapse };
}
