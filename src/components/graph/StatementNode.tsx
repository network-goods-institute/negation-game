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
import { PlusIcon } from "lucide-react";
import { nanoid } from "nanoid";
import { useEffect, useCallback, useMemo } from "react";
import { collapsedPointIdsAtom } from "@/app/s/[space]/viewpoint/viewpointAtoms";
import { useAtom } from "jotai";

export type StatementNodeData = {
  statement: string;
};

export type StatementNode = Node<StatementNodeData, "statement">;

export interface StatementNodeProps extends Omit<NodeProps, "data"> {
  data: StatementNodeData;
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
  const collapsedChildren = useMemo(() => {
    return Array.from(collapsedPointIds)
      .filter(pointId => directChildPointIds.includes(pointId));
  }, [collapsedPointIds, directChildPointIds]);

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

    // Create new nodes for each collapsed child
    for (const [i, pointId] of collapsedChildren.entries()) {
      const nodeId = nanoid();

      // Add the node back to the graph
      addNodes({
        id: nodeId,
        type: "point",
        data: {
          pointId,
          parentId: id,
          // Add a unique timestamp to ensure this is detected as a modification
          _lastModified: Date.now()
        },
        position: {
          x: positionAbsoluteX + (i - collapsedChildren.length / 2) * 100,
          y: positionAbsoluteY + 150,
        },
      });

      addEdges({
        id: nanoid(),
        source: nodeId,
        target: id,
        type: "negation"
      });
    }

    // Remove the points from the collapsed set
    setCollapsedPointIds(prev => {
      const newSet = new Set(prev);
      collapsedChildren.forEach(pointId => {
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        newSet.delete(pointId);
      });
      return newSet;
    });

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
    updateNodeData
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
            data: { parentId: id },
          });
          addEdges({
            id: nanoid(),
            source: answerId,
            target: id,
          });
        }}
      >
        <PlusIcon className="size-4" />
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
