import { useEditMode } from "@/components/graph/EditModeContext";
import { cn } from "@/lib/cn";
import {
  Handle,
  Node,
  NodeProps,
  Position,
  useNodeConnections,
  useReactFlow,
  useUpdateNodeInternals,
} from "@xyflow/react";
import { ArrowDownIcon } from "lucide-react";
import { nanoid } from "nanoid";
import { useEffect, useCallback, useMemo } from "react";
import { collapsedPointIdsAtom, collapsedNodePositionsAtom } from "@/atoms/viewpointAtoms";
import { useAtom } from "jotai";

/**
 * StatementNode Component
 * 
 * This component handles the root statement node in the graph.
 * 
 * Important note on handling collapsed points:
 * - Points can appear in multiple places in the graph with the same pointId
 * - We only want to make points expandable from the statement node if they were
 *   directly connected to it before being collapsed
 * - We use collapsedNodePositions (which tracks parentId relationships) instead of just
 *   collapsedPointIds to ensure we only expand direct children
 * - This prevents duplicate point IDs that exist elsewhere in the graph from
 *   incorrectly appearing as expandable from the statement node
 */

export type StatementNodeData = {
  statement: string;
};

export type StatementNode = Node<StatementNodeData, "statement">;

export interface StatementNodeProps extends Omit<NodeProps, "data"> {
  data: StatementNodeData;
}

function calculateInitialLayout(
  parentX: number,
  parentY: number,
  count: number,
  spacing = 250,
  verticalOffset = 200
): Array<{ x: number; y: number }> {
  if (count === 0) return [];

  // For a single node, place it directly below
  if (count === 1) {
    return [{ x: parentX, y: parentY + verticalOffset }];
  }

  const positions: Array<{ x: number; y: number }> = [];

  // Calculate the total width needed
  const totalWidth = (count - 1) * spacing;
  // Start from the leftmost position
  const startX = parentX - totalWidth / 2;

  // Calculate vertical offset based on number of nodes
  // More aggressive scaling for larger numbers of nodes
  const dynamicVerticalOffset = verticalOffset + (count > 2 ? (count - 2) * 50 : 0);

  // Create a more pronounced arc pattern for better separation
  for (let i = 0; i < count; i++) {
    const progress = count > 1 ? i / (count - 1) : 0;
    const x = startX + (progress * totalWidth);

    // Enhanced arc effect - middle nodes are pushed down more
    const arcHeight = 60 * Math.sin(Math.PI * progress);
    // Add slight horizontal offset for even better separation
    const horizontalVariation = (progress - 0.5) * 30;

    const y = parentY + dynamicVerticalOffset + arcHeight;
    const adjustedX = x + horizontalVariation;

    positions.push({ x: adjustedX, y });
  }

  return positions;
}

export const StatementNode = ({
  data: { statement },
  id,
  positionAbsoluteX,
  positionAbsoluteY,
}: StatementNodeProps) => {
  const incomingConnections = useNodeConnections({
    handleType: "target",
    id: id,
  });

  const { addEdges, addNodes, getNodes, getEdges, getNode, updateNodeData } = useReactFlow();
  const editing = useEditMode();
  const [collapsedPointIds, setCollapsedPointIds] = useAtom(collapsedPointIdsAtom);
  const [collapsedNodePositions, setCollapsedNodePositions] = useAtom(collapsedNodePositionsAtom);
  const updateNodeInternals = useUpdateNodeInternals();

  // Get direct children of this statement node that could be expanded
  const directChildPointIds = useMemo(() => {
    const edges = getEdges();
    const nodes = getNodes();

    // Find all edges where this statement is the target
    const connectedEdges = edges.filter(edge => edge.target === id);

    // Map to point IDs of direct children
    return connectedEdges
      .map(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        return sourceNode?.type === 'point' && sourceNode?.data?.pointId
          ? sourceNode.data.pointId
          : null;
      })
      .filter((id): id is number => id !== null);
  }, [getEdges, getNodes, id]);

  // Find which direct children are collapsed
  // Instead of using the global collapsedPointIds, use collapsedNodePositions
  // to ensure we only consider points that were directly connected to the statement
  const collapsedChildren = useMemo(() => {
    // Find collapsed points that have this statement node as their direct parent
    return collapsedNodePositions
      .filter(pos => pos.parentId === id)
      .map(pos => pos.pointId);
  }, [collapsedNodePositions, id]);

  // Count collapsed direct children
  const collapsedDirectChildrenCount = collapsedChildren.length;

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, incomingConnections.length, updateNodeInternals, collapsedDirectChildrenCount]);

  const expandDirectChildren = useCallback(() => {
    if (collapsedChildren.length === 0) return;

    // Explicitly mark the graph as modified at the beginning to ensure
    // the save button appears immediately when expanding nodes
    // @ts-ignore - accessing our custom method
    if (typeof addNodes.getState?.().flowInstance?.markAsModified === 'function') {
      // @ts-ignore
      addNodes.getState().flowInstance.markAsModified();
    }

    const layouts = calculateInitialLayout(
      positionAbsoluteX,
      positionAbsoluteY,
      collapsedChildren.length
    );

    // Create new nodes for each collapsed child
    for (const [i, pointId] of collapsedChildren.entries()) {
      // Generate a guaranteed unique ID by combining nanoid with timestamp and index
      const uniqueId = `${nanoid()}-${Date.now()}-${i}`;

      // Find stored position for this node
      const storedPosition = collapsedNodePositions.find(pos => pos.pointId === pointId && pos.parentId === id);

      // Use stored position if available, otherwise use calculated layout
      const position = storedPosition ? {
        x: storedPosition.x,
        y: storedPosition.y
      } : layouts[i];

      // Add the node back to the graph
      addNodes({
        id: uniqueId,
        type: "point",
        data: {
          pointId,
          parentId: id,
          // Add a unique timestamp to ensure this is detected as a modification
          _lastModified: Date.now()
        },
        position,
      });

      addEdges({
        id: nanoid(),
        source: uniqueId,
        target: id,
        type: "statement"
      });

      // Remove the stored position for this node
      setCollapsedNodePositions(prev => prev.filter(pos => !(pos.pointId === pointId && pos.parentId === id)));

      // Also remove from collapsedPointIds set if it's not collapsed elsewhere in the graph
      // This prevents auto-collapsing other instances of the same point ID elsewhere
      if (!collapsedNodePositions.some(pos => pos.pointId === pointId && pos.parentId !== id)) {
        setCollapsedPointIds(prev => {
          const newSet = new Set(prev);
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          newSet.delete(pointId);
          return newSet;
        });
      }
    }

    // Mark the statement node as modified to trigger the save button
    // This ensures expanding nodes is considered a modification that needs saving
    const statementNode = getNode(id);
    if (statementNode) {
      const updatedData = { ...statementNode.data, _lastModified: Date.now() };
      // Update the node data to trigger a change detection
      updateNodeData(id, updatedData);
    }
  }, [
    collapsedChildren,
    id,
    addNodes,
    addEdges,
    setCollapsedPointIds,
    positionAbsoluteX,
    positionAbsoluteY,
    getNode,
    updateNodeData,
    collapsedNodePositions,
    setCollapsedNodePositions
  ]);

  return (
    <div
      className={cn(
        "relative bg-accent rounded-md border-2 min-h-18 w-96 flex items-center p-4 justify-center flex-grow"
      )}
    >
      <Handle
        id={`${id}-statement-incoming-handle`}
        type="target"
        data-editing={editing}
        className={cn(
          "-z-10 translate-y-[100%] size-fit bg-muted text-center border-border border-2 rounded-b-full pointer-events-auto",
          "pb-1 pt-0.5 px-2 -translate-x-1/2 !cursor-pointer"
        )}
        isConnectableStart={false}
        position={Position.Bottom}
        style={{ left: "85%" }}
        onClick={() => {
          const answerId = nanoid();
          addNodes({
            id: answerId,
            type: "addPoint",
            position: {
              x: positionAbsoluteX,
              y: positionAbsoluteY + 100,
            },
            data: {
              parentId: id,
              content: "",
              hasContent: false
            },
          });
          addEdges({
            id: nanoid(),
            source: answerId,
            target: id,
          });
        }}
      >
        <ArrowDownIcon className="size-4" />
      </Handle>

      {collapsedDirectChildrenCount > 0 && (
        <Handle
          id={`${id}-statement-expand-handle`}
          type="target"
          className="pb-0.5 px-4 translate-y-[100%] -translate-x-1/2 size-fit bg-muted text-center border-2 border-t-0 rounded-b-full pointer-events-auto cursor-pointer"
          isConnectableStart={false}
          position={Position.Bottom}
          style={{ left: "50%" }}
          onClick={expandDirectChildren}
        >
          <span className="text-center w-full text-sm">
            {collapsedDirectChildrenCount}
          </span>
        </Handle>
      )}

      <p className="text-accent-foreground font-bold">{statement}</p>
    </div>
  );
};
