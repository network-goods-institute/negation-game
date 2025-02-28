import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";
import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { PointCard } from "@/components/PointCard";
import { useOriginalPoster } from "@/components/graph/OriginalPosterContext";
import { cn } from "@/lib/cn";
import { usePointData, usePrefetchPoint } from "@/queries/usePointData";
import {
  usePrefetchUserEndorsements,
  useUserEndorsement,
} from "@/queries/useUserEndorsements";
import {
  Handle,
  Node,
  NodeProps,
  Position,
  useNodeConnections,
  useReactFlow,
  useUpdateNodeInternals,
} from "@xyflow/react";
import { useAtom, useSetAtom } from "jotai";
import { XIcon, CircleIcon } from "lucide-react";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { find } from "remeda";
import { collapsedPointIdsAtom } from "@/app/s/[space]/viewpoint/viewpointAtoms";
import { useViewpoint } from "@/queries/useViewpoint";
import { useParams } from "next/navigation";

export type PointNodeData = {
  pointId: number;
  parentId?: string;
  expandOnInit?: boolean;
};

export type PointNode = Node<PointNodeData, "point">;

export interface PointNodeProps extends NodeProps {
  data: PointNodeData;
}

export const PointNode = ({
  data: { pointId, parentId, expandOnInit },
  id,
  positionAbsoluteX,
  positionAbsoluteY,
}: PointNodeProps) => {

  const [hoveredPoint, setHoveredPoint] = useAtom(hoveredPointIdAtom);
  const [shouldExpandOnInit, setShouldExpandOnInit] = useState(
    expandOnInit ?? false
  );
  const incomingConnections = useNodeConnections({
    handleType: "target",
    id: id,
  });

  const updateNodeInternals = useUpdateNodeInternals();
  const setNegatedPointId = useSetAtom(negatedPointIdAtom);
  const {
    addNodes,
    addEdges,
    getNode,
    getNodes,
    deleteElements,
    getEdges,
  } = useReactFlow();

  const params = useParams();
  const viewpointId = params.viewpointId as string;
  const isViewpointContext = !!viewpointId;
  const { data: originalViewpoint } = useViewpoint(isViewpointContext ? viewpointId : "DISABLED");
  const { originalPosterId } = useOriginalPoster();

  const isRedundant = useMemo(() => {
    const firstOccurence = find(
      getNodes().filter((node): node is PointNode => node.type === "point"),
      (node) => node.data.pointId === pointId
    );

    return firstOccurence ? firstOccurence.id !== id : false;
  }, [getNodes, id, pointId]);

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, incomingConnections.length, updateNodeInternals]);

  const prefetchPoint = usePrefetchPoint();
  const prefetchUserEndorsements = usePrefetchUserEndorsements();

  const { data: pointData } = usePointData(pointId);
  const { data: opCred } = useUserEndorsement(originalPosterId, pointId);

  const endorsedByOp = opCred && opCred > 0;

  useEffect(() => {
    if (!pointData) return;
    pointData.negationIds
      .filter((id) => id !== Number(parentId))
      .forEach((negationId) => {
        prefetchPoint(negationId);
        originalPosterId &&
          prefetchUserEndorsements(originalPosterId, negationId);
      });
  }, [
    pointData?.negationIds,
    parentId,
    pointData,
    prefetchPoint,
    originalPosterId,
    prefetchUserEndorsements,
  ]);

  const [collapsedPointIds, setCollapsedPointIds] = useAtom(collapsedPointIdsAtom);

  // Default position values if not provided by props
  const nodePositionX = positionAbsoluteX ?? 0;
  const nodePositionY = positionAbsoluteY ?? 0;

  const getNodeByPointId = useCallback((searchPointId: string | number) => {
    const numId = typeof searchPointId === 'string' ? parseInt(searchPointId) : searchPointId;
    const nodes = getNodes().filter((n): n is PointNode => n.type === 'point');
    return nodes.find(n => n.data.pointId === numId);
  }, [getNodes]);

  const isNegatingParent = useMemo(() => {
    if (!parentId || !pointData) return false;
    const numParentId = typeof parentId === 'string' ? parseInt(parentId) : parentId;
    return !isNaN(numParentId) && pointData.negationIds.includes(numParentId);
  }, [parentId, pointData]);

  const expandNegations = useCallback(() => {
    const allNodes = getNodes();
    const pointNodes = allNodes.filter((n): n is PointNode => n.type === "point");

    // Map of pointId -> nodeIds that contain this pointId
    const pointIdMap = new Map<number, string[]>();
    pointNodes.forEach(node => {
      const pid = node.data.pointId;
      if (!pointIdMap.has(pid)) {
        pointIdMap.set(pid, []);
      }
      pointIdMap.get(pid)!.push(node.id);
    });

    const parentChildMap = new Map<number, { parentIds: Set<string | number>, childIds: Set<number> }>();
    pointNodes.forEach(node => {
      const pid = node.data.pointId;
      const parent = node.data.parentId;

      if (!parentChildMap.has(pid)) {
        parentChildMap.set(pid, { parentIds: new Set(), childIds: new Set() });
      }

      if (parent) {
        parentChildMap.get(pid)!.parentIds.add(parent);

        // Also track the reverse relationship (parent -> child)
        const parentNum = typeof parent === 'string' ?
          (parent === 'statement' ? 'statement' : parseInt(parent)) : parent;

        if (parentNum !== 'statement') {
          if (!parentChildMap.has(parentNum)) {
            parentChildMap.set(parentNum, { parentIds: new Set(), childIds: new Set() });
          }
          parentChildMap.get(parentNum)!.childIds.add(pid);
        }
      }
    });

    if (pointData) {
      // pass
    } else {
      return;
    }

    if (isNegatingParent) {
      if (!parentId) {
        return;
      }

      const numParentId = typeof parentId === 'string' ? parseInt(parentId) : parentId;
      if (isNaN(numParentId)) {
        return;
      }

      // Check if creating a node for the parent would form a circle
      // This happens when A negates B and B negates A
      let wouldCreateCircle = false;

      // Check if this point appears in the parent's children or descendants
      if (parentChildMap.has(numParentId)) {
        // Check direct child relationship
        if (parentChildMap.get(numParentId)?.childIds.has(pointId)) {
          wouldCreateCircle = true;
          // Check indirect relationship (ancestor-descendant)
          const paths = findPathsBetweenPoints(numParentId, pointId, parentChildMap);
          if (paths.length > 0) {
            wouldCreateCircle = true;
          }
        }
      }

      if (wouldCreateCircle) {

        // Still remove the parent from collapsed set to acknowledge the logical relationship
        setCollapsedPointIds(prev => {
          const newSet = new Set(prev);
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          newSet.delete(numParentId);
          return newSet;
        });
      } else {
        const parentNode = getNodeByPointId(numParentId);
        if (parentNode) {


          const sourceNode = getNode(parentNode.id);
          if (!sourceNode) {
            return;
          }

          const nodeId = nanoid();

          // We'll just continue without explicitly marking - the node addition will trigger it

          addNodes({
            id: nodeId,
            data: {
              pointId: numParentId,
              parentId: pointId,
              _lastModified: Date.now()
            },
            type: "point",
            position: {
              x: nodePositionX,
              y: nodePositionY - 175,
            },
          });
          console.log(`[PointNode] Added new node with ID: ${nodeId}, pointId: ${numParentId}, parentId: ${pointId}`);

          setCollapsedPointIds(prev => {
            const newSet = new Set(prev);
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            newSet.delete(numParentId);
            return newSet;
          });
        } else {
        }
      }
    }
    const targetNode = getNode(id)!;

    // Track what points already exist in the graph
    const allExistingPointIds = pointNodes.map(node => node.data.pointId)

    // Track points directly connected to this node
    const localExpandedNegationIds = [
      ...incomingConnections.map((c) => {
        const node = getNode(c.source)! as PointNode;
        return node.data.pointId;
      }),
      ...(parentId ? [parentId] : []),
    ];

    // Check which negations we should expand
    const expandableNegationIds: number[] = [];
    const skippedNegationIds: { id: number, reason: string }[] = [];

    pointData.negationIds.forEach(negId => {
      // Check if already connected to this node
      if (localExpandedNegationIds.includes(negId)) {
        skippedNegationIds.push({ id: negId, reason: "already connected" });
        return;
      }

      // Check if exists elsewhere in graph
      if (allExistingPointIds.includes(negId)) {
        const existingNodes = pointIdMap.get(negId) || [];
        skippedNegationIds.push({
          id: negId,
          reason: `exists in ${existingNodes.length} other nodes: ${existingNodes.join(", ")}`
        });

        // Still remove from collapsed set
        setCollapsedPointIds(prev => {
          const newSet = new Set(prev);
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          newSet.delete(negId);
          return newSet;
        });

        return;
      }

      // Check if this would create a circular parent-child relationship
      // This happens in bidirectional negation relationships

      // 1. Check if this point already appears in a path from the negation
      let wouldCreateCircle = false;

      // Check if the negation ID exists in the relationship map
      if (parentChildMap.has(negId)) {
        // Check if this point is already a child or descendant of the negation
        // First, see if we're a direct child
        if (parentChildMap.get(negId)?.childIds.has(pointId)) {
          wouldCreateCircle = true;
        } else {
          // Check for indirect descendant relationship
          const paths = findPathsBetweenPoints(negId, pointId, parentChildMap);
          if (paths.length > 0) {
            wouldCreateCircle = true;
          }
        }
      }

      if (wouldCreateCircle) {
        skippedNegationIds.push({
          id: negId,
          reason: "would create circular parent-child relationship"
        });

        // Even if we don't create the node, we should still remove it from collapsed set
        // This ensures we acknowledge the logical negation relationship
        setCollapsedPointIds(prev => {
          const newSet = new Set(prev);
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          newSet.delete(negId);
          return newSet;
        });

        return;
      }

      expandableNegationIds.push(negId);
    });

    for (const [i, negationId] of expandableNegationIds.entries()) {
      // Double-check again
      if (pointIdMap.has(negationId)) {
        const existingNodes = pointIdMap.get(negationId)!;
        continue;
      }

      const nodeId = nanoid();

      addNodes({
        id: nodeId,
        data: {
          pointId: negationId,
          parentId: pointId,
          _lastModified: Date.now()
        },
        type: "point",
        position: {
          x: targetNode.position.x + i * 20,
          y:
            targetNode.position.y +
            (targetNode?.measured?.height ?? 200) +
            100 +
            20 * i,
        },
      });

      addEdges({
        id: nanoid(),
        target: id,
        source: nodeId,
        type: parentId === 'statement' ? 'statement' : 'negation',
      });

      if (!pointIdMap.has(negationId)) {
        pointIdMap.set(negationId, []);
      }
      pointIdMap.get(negationId)!.push(nodeId);

      setCollapsedPointIds(prev => {
        const newSet = new Set(prev);
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        newSet.delete(negationId);
        return newSet;
      });
    }

    // Also remove from collapsed points for safety
    setCollapsedPointIds((prev) => {
      const newSet = new Set(prev);
      localExpandedNegationIds.forEach((id) => {
        const numId = typeof id === "string" ? parseInt(id) : id;
        if (!isNaN(numId)) {
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          newSet.delete(numId);
        }
      });
      return newSet;
    });

  }, [
    pointData,
    incomingConnections,
    id,
    getNode,
    parentId,
    addNodes,
    addEdges,
    setCollapsedPointIds,
    pointId,
    nodePositionX,
    nodePositionY,
    getNodeByPointId,
    isNegatingParent,
    getNodes
  ]);

  useEffect(() => {
    if (!shouldExpandOnInit || pointData === undefined) return;

    // FIXME: this is causing duplicates on strict mode (and weirdly only in encoded graph view, issue might be there.). Couldn't track down the issue
    expandNegations();
    setShouldExpandOnInit(false);
  }, [shouldExpandOnInit, pointData, expandNegations]);

  const expandedNegationIds = useMemo(() => [
    ...incomingConnections.map((c) => {
      const node = getNode(c.source)! as PointNode;
      return node.data.pointId;
    }),
    ...(parentId ? [parentId] : []),
  ], [incomingConnections, getNode, parentId]);

  const collapsedNegations = pointData
    ? (pointData.negationIds
      .filter(id => !expandedNegationIds.includes(id))
      .length)
    : 0;

  const hasInitializedCollapsedState = useRef(false);

  useEffect(() => {
    // Only run once per node mount
    if (hasInitializedCollapsedState.current || !isViewpointContext || !pointData || !originalViewpoint) {
      return;
    }
    // Add negations that aren't in the original viewpoint to the collapsedPointIds
    const negationsNotInViewpoint = pointData.negationIds.filter((id: number) => {
      // Don't collapse if it's already being explicitly shown (connected to this node)
      const isAlreadyExpanded = expandedNegationIds.includes(id);
      // Only collapse if it's not in the original viewpoint and not already shown
      return !originalViewpoint.originalPointIds.includes(id) && !isAlreadyExpanded;
    });

    if (negationsNotInViewpoint.length > 0) {
      setCollapsedPointIds(prev => {
        const newSet = new Set(prev);
        negationsNotInViewpoint.forEach(id => newSet.add(id));
        return newSet;
      });
    }
    hasInitializedCollapsedState.current = true;
  }, [isViewpointContext, pointData, originalViewpoint, setCollapsedPointIds, pointId, expandedNegationIds]);

  const collapseSelfAndNegations = useCallback(async () => {

    // Helper function to get connections without using hooks
    const getNodeConnectionsForId = (nodeId: string) => {
      const edges = getEdges();
      return edges
        .filter(edge => edge.target === nodeId)
        .map(edge => ({ source: edge.source, edgeId: edge.id }));
    };

    const removeNestedNegations = async (nodeId: string) => {
      // Use our helper function instead of the hook
      const connections = getNodeConnectionsForId(nodeId);
      const nodeIds = connections.map((c) => c.source);
      const edgeIds = connections.map((c) => c.edgeId);

      if (nodeIds.length > 0) {
        for (const id of nodeIds) {
          await removeNestedNegations(id);
        }
      }

      const nodesToCollapse = nodeIds
        .map((id) => {
          const node = getNode(id);
          return node?.type === "point" ? node.data.pointId : null;
        })
        .filter((id): id is number => id !== null);

      setCollapsedPointIds((prev) => {
        const newSet = new Set(prev);
        nodesToCollapse.forEach((id) => newSet.add(id));
        return newSet;
      });

      // Disable rule for deletion in React Flow context
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      await deleteElements({
        nodes: nodeIds.map((id) => ({ id })),
        edges: edgeIds.map((id) => ({ id })),
      });
    };

    await removeNestedNegations(id).then(() => {
      if (pointId) {
        setCollapsedPointIds((prev) => {
          const newSet = new Set(prev).add(pointId);
          return newSet;
        });
      }
      // Disable rule for deletion here as well
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      deleteElements({ nodes: [{ id }] });
    });

    // Filter out collapsed points
    const nonCollapsedNegationIds = pointData?.negationIds.filter(
      (id) => !collapsedPointIds.has(id)
    ) ?? [];

    for (const negationId of nonCollapsedNegationIds) {
      prefetchPoint(negationId);
      originalPosterId &&
        prefetchUserEndorsements(originalPosterId, negationId);
    }
  }, [
    deleteElements,
    id,
    pointData,
    collapsedPointIds,
    prefetchPoint,
    originalPosterId,
    prefetchUserEndorsements,
    setCollapsedPointIds,
    getNode,
    pointId,
    getEdges
  ]);

  return (
    <div
      data-loading={pointData === undefined}
      className={cn(
        "relative bg-background rounded-md border-2 min-h-28 w-64",
        endorsedByOp && "border-yellow-500",
        hoveredPoint === pointId && "border-primary"
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
            : "pb-0.5 px-4 translate-y-[100%] -translate-x-1/2  size-fit bg-muted text-center border-2 border-t-0 rounded-b-full pointer-events-auto cursor-pointer"
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
          id={`${id}-outgoing-handle`} type="source"
          position={Position.Top}
          className={
            "pt-1 pb-0.5 px-2 translate-y-[-100%] -translate-x-1/2 size-fit bg-muted text-center border-2 border-b-0 rounded-t-full pointer-events-auto !cursor-pointer"
          }
          onClick={collapseSelfAndNegations}
        >
          {parentId === 'statement' ? (
            <CircleIcon className="size-4" />
          ) : (
            <XIcon className="size-4" />
          )}
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
            originalPosterId={originalPosterId}
          ></PointCard>
        </>
      ) : (
        <div className="w-full flex-grow h-32 bg-muted/40 animate-pulse" />
      )}
    </div>
  );
};

function findPathsBetweenPoints(
  startId: number,
  endId: number,
  relationMap: Map<number, { parentIds: Set<string | number>, childIds: Set<number> }>
): number[][] {
  const paths: number[][] = [];
  const visited = new Set<number>();

  function dfs(currentId: number, path: number[]) {
    // Found a path
    if (currentId === endId) {
      paths.push([...path, currentId]);
      return;
    }

    // Mark as visited to avoid cycles
    visited.add(currentId);

    // Continue searching through children
    const relation = relationMap.get(currentId);
    if (relation) {
      for (const childId of relation.childIds) {
        if (!visited.has(childId)) {
          dfs(childId, [...path, currentId]);
        }
      }
    }

    // Backtrack
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    visited.delete(currentId);
  }

  dfs(startId, []);
  return paths;
}


