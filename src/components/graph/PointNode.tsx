import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";
import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { PointCard } from "@/components/PointCard";
import { cn } from "@/lib/cn";
import { usePointData } from "@/queries/usePointData";
import {
  Handle,
  Node,
  NodeProps,
  Position,
  useHandleConnections,
  useReactFlow,
  useUpdateNodeInternals,
} from "@xyflow/react";
import { useAtom, useSetAtom } from "jotai";
import { XIcon } from "lucide-react";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useMemo, useRef } from "react";

export type PointNodeData = {
  pointId: number;
  parentId?: number;
  expandOnInit?: boolean;
};

export type PointNode = Node<PointNodeData, "point">;

export interface PointNodeProps extends Omit<NodeProps, "data"> {
  data: PointNodeData;
}

export const PointNode = ({
  data: { pointId, parentId, expandOnInit },
  id,
}: PointNodeProps) => {
  const [hoveredPoint, setHoveredPoint] = useAtom(hoveredPointIdAtom);
  const incomingConnections = useHandleConnections({
    type: "target",
    nodeId: id,
  });

  const updateNodeInternals = useUpdateNodeInternals();
  const setNegatedPointId = useSetAtom(negatedPointIdAtom);
  const {
    addNodes,
    addEdges,
    getNode,
    getNodes,
    getHandleConnections,
    deleteElements,
  } = useReactFlow();

  const { isLoading, data: pointData } = usePointData(pointId);

  // Check if this node is a duplicate
  const isRedundant = useMemo(() => {
    const existingNodes = getNodes()
      .filter((node): node is PointNode => node.type === "point")
      .filter(node => node.data.pointId === pointId);
    
    // If there are multiple nodes for this point, only keep the first one
    return existingNodes.length > 1 && existingNodes[0].id !== id;
  }, [getNodes, id, pointId]);

  // Update node internals when connections change
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, incomingConnections.length, updateNodeInternals]);

  const expandNegations = useCallback(() => {
    if (!pointData) return;

    const currentNode = getNode(id)!;

    // First, get all existing point nodes in the graph
    const existingPointNodes = new Map(
      getNodes()
        .filter((node): node is PointNode => node.type === "point")
        .map(node => [node.data.pointId, node])
    );

    // Get currently connected negation IDs
    const connectedNegationIds = new Set([
      ...getHandleConnections({ type: "target", nodeId: id }).map((c) => {
        const node = getNode(c.source)! as PointNode;
        return node.data.pointId;
      }),
      ...(parentId ? [parentId] : []),
    ]);

    // Filter negations that should be created
    const negationsToCreate = pointData.negationIds.filter(negId => 
      negId !== pointId && // Don't create self-references
      !connectedNegationIds.has(negId) && // Don't create if already connected
      !existingPointNodes.has(negId) // Don't create if exists anywhere in graph
    );

    // Create new nodes and edges
    negationsToCreate.forEach((negationId, i) => {
      const nodeId = nanoid();
      
      addNodes({
        id: nodeId,
        data: { pointId: negationId, parentId: pointId },
        type: "point",
        position: {
          x: currentNode.position.x + i * 20,
          y: currentNode.position.y + (currentNode?.measured?.height ?? 200) + 100 + 20 * i,
        },
      });

      addEdges({
        id: nanoid(),
        target: id,
        source: nodeId,
        type: "negation",
      });
    });
  }, [pointData, getHandleConnections, id, parentId, getNode, addNodes, pointId, addEdges, getNodes]);

  // Only expand once on init
  const expandedRef = useRef(false);
  useEffect(() => {
    if (!expandOnInit || !pointData || expandedRef.current) return;
        
    expandedRef.current = true;
    expandNegations();
  }, [expandOnInit, pointData, expandNegations, pointId, parentId]);

  // Calculate collapsed negations count
  const collapsedNegations = pointData
    ? pointData.amountNegations -
      incomingConnections.length -
      (parentId ? 1 : 0)
    : 0;

  // Handle node removal
  const collapseSelfAndNegations = useCallback(async () => {
    const removeNestedNegations = async (nodeId: string) => {
      const connections = getHandleConnections({
        type: "target",
        nodeId,
      });
      
      // Remove child nodes first
      for (const conn of connections) {
        await removeNestedNegations(conn.source);
      }

      // Then remove this node and its edges
      await deleteElements({
        nodes: [{ id: nodeId }],
        edges: connections.map(c => ({ id: c.edgeId })),
      });
    };

    await removeNestedNegations(id);
  }, [deleteElements, getHandleConnections, id]);

  return (
    <div
      className={cn(
        "relative bg-background rounded-md border-2 min-h-28 w-64",
        hoveredPoint === pointId && "border-primary",
        isRedundant && "opacity-30"
      )}
      onMouseOver={() => setHoveredPoint(pointId)}
      onMouseLeave={() => setHoveredPoint(undefined)}
    >
      <Handle
        id={`${id}-incoming-handle`}
        type="target"
        isConnectableStart={false}
        position={Position.Bottom}
        className={
          collapsedNegations === 0
            ? "invisible"
            : "-z-10 pb-0.5 px-4 translate-y-[100%] -translate-x-1/2  size-fit bg-muted text-center border-2 border-t-0 rounded-b-full pointer-events-auto cursor-pointer"
        }
        onClick={expandNegations}
      >
        {pointData && (
          <span className="text-center w-full text-sm">
            {collapsedNegations}
          </span>
        )}
      </Handle>
      {parentId && (
        <Handle
          id={`${id}-outgoing-handle`}
          type="source"
          position={Position.Top}
          className="-z-10 pt-1 pb-0.5 px-2 translate-y-[-100%]  -translate-x-1/2  size-fit bg-muted text-center border-2 border-b-0 rounded-t-full pointer-events-auto !cursor-pointer"
          onClick={collapseSelfAndNegations}
        >
          <XIcon className="size-4" />
        </Handle>
      )}
      {pointData ? (
        <>
          <PointCard
            onNegate={() => setNegatedPointId(pointId)}
            amountNegations={pointData.amountNegations}
            amountSupporters={pointData.amountSupporters}
            content={pointData.content}
            createdAt={pointData.createdAt}
            cred={pointData.cred}
            favor={pointData.favor}
            pointId={pointData.pointId}
            viewerContext={{ viewerCred: pointData.viewerCred }}
            className={cn(
              "bg-muted/40 rounded-sm z-10",
              isRedundant && "opacity-30 hover:opacity-100"
            )}
          />
        </>
      ) : (
        <div className="w-full flex-grow h-32 bg-muted/40 animate-pulse" />
      )}
    </div>
  );
};
