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
import { collapsedPointIdsAtom, collapsedNodePositionsAtom, CollapsedNodePosition } from "@/atoms/viewpointAtoms";
import { useViewpoint } from "@/queries/useViewpoint";
import { useParams, usePathname } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const rationaleId = (params.rationaleId || params.viewpointId) as string;
  const isViewpointContext = !!rationaleId;
  const { data: originalViewpoint } = useViewpoint(isViewpointContext ? rationaleId : "DISABLED");
  const { originalPosterId } = useOriginalPoster();

  const isRedundant = useMemo(() => {
    const firstOccurence = find(
      getNodes().filter((node): node is PointNode => node.type === "point"),
      (node) => node.data.pointId === pointId
    );

    return firstOccurence ? firstOccurence.id !== id : false;
  }, [getNodes, id, pointId]);

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
  const [collapsedNodePositions, setCollapsedNodePositions] = useAtom(collapsedNodePositionsAtom);

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

    // Track parent-child relationships for cycle detection
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

    pointData?.negationIds.forEach(negId => {
      // Skip if it's this node's own ID
      if (negId === pointId) {
        skippedNegationIds.push({ id: negId, reason: "self-negation" });
        return;
      }

      // Check if already connected to this node
      if (localExpandedNegationIds.includes(negId)) {
        skippedNegationIds.push({ id: negId, reason: "already connected" });
        return;
      }

      // Get all nodes in the graph that contain this point ID
      const nodesWithThisId = pointNodes.filter(n => n.data.pointId === negId);

      // If any of these nodes are visible (not collapsed), skip this negation
      const hasVisibleInstance = nodesWithThisId.some(node =>
        !collapsedPointIds.has(node.data.pointId)
      );

      if (hasVisibleInstance) {
        const existingNodes = pointIdMap.get(negId) || [];
        skippedNegationIds.push({
          id: negId,
          reason: `exists as visible node elsewhere: ${existingNodes.join(", ")}`
        });
        return;
      }

      // Check if this would create a circular parent-child relationship
      let wouldCreateCircle = false;

      // Check if the negation ID exists in the relationship map
      if (parentChildMap.has(negId)) {
        // Check if this point is already a child or descendant of the negation
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
        return;
      }

      expandableNegationIds.push(negId);
    });

    for (const [i, negationId] of expandableNegationIds.entries()) {
      // Double-check again
      if (pointIdMap.has(negationId)) {
        continue;
      }

      const nodeId = nanoid();

      const storedPosition = collapsedNodePositions.find(pos => pos.pointId === negationId && pos.parentId === pointId);
      let position;
      if (storedPosition) {
        position = {
          x: storedPosition.x,
          y: storedPosition.y
        };
      } else {
        if (i === 0) {
          const targetNode = getNode(id)!;
          const layouts = calculateInitialLayout(
            targetNode.position.x,
            targetNode.position.y,
            targetNode?.measured?.height ?? 200,
            expandableNegationIds.length
          );
          // Store the layouts for use in subsequent iterations
          (expandNegations as any).layoutCache = layouts;
        }

        // Use the pre-calculated layout with a fallback if layoutCache is undefined
        if ((expandNegations as any).layoutCache && i < (expandNegations as any).layoutCache.length) {
          position = (expandNegations as any).layoutCache[i];
        } else {
          // Recalculate layout using the same function if cache is missing
          const targetNode = getNode(id)!;
          const layouts = calculateInitialLayout(
            targetNode.position.x,
            targetNode.position.y,
            targetNode?.measured?.height ?? 200,
            expandableNegationIds.length
          );
          // Take the position for this index
          position = layouts[i];
        }
      }

      addNodes({
        id: nodeId,
        data: {
          pointId: negationId,
          parentId: pointId,
          _lastModified: Date.now()
        },
        type: "point",
        position,
      });

      addEdges({
        id: nanoid(),
        target: id,
        source: nodeId,
        type: parentId === 'statement' ? 'statement' : 'negation',
      });

      // Remove the stored position for this node
      setCollapsedNodePositions(prev => prev.filter(pos => !(pos.pointId === negationId && pos.parentId === pointId)));

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
    getNodes,
    collapsedNodePositions,
    setCollapsedNodePositions,
    collapsedPointIds
  ]);

  const expandedNegationIds = useMemo(() => [
    ...incomingConnections.map((c) => {
      const node = getNode(c.source)! as PointNode;
      return node.data.pointId;
    }),
    ...(parentId ? [parentId] : []),
  ], [incomingConnections, getNode, parentId]);

  const collapsedNegations = useMemo(() => {
    if (!pointData) return 0;

    // Get all negation IDs that could be connected to this point
    const possibleNegationIds = pointData.negationIds.filter(id =>
      // Don't include self-negations
      id !== pointId &&
      // Don't include already connected negations
      !expandedNegationIds.includes(id)
    );

    // Filter to only those that are in the collapsed set
    const expandableIds = possibleNegationIds.filter(id =>
      !expandedNegationIds.includes(id)
    );

    const count = expandableIds.length;

    return count;
  }, [pointData, expandedNegationIds, pointId]);

  // Update node internals when pointData changes to reflect new negations
  useEffect(() => {
    if (pointData) {
      updateNodeInternals(id);
    }
  }, [id, pointData, updateNodeInternals]);

  // Keep existing effect for connection changes
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, incomingConnections.length, updateNodeInternals, collapsedNegations]);

  const hasExpandedRef = useRef(false);
  const strictModeMountRef = useRef(0);

  useEffect(() => {
    if (!shouldExpandOnInit || pointData === undefined) return;

    // In development, React.StrictMode causes double mounting
    // We only want to expand on the second mount in strict mode
    if (process.env.NODE_ENV === 'development') {
      strictModeMountRef.current += 1;
      if (strictModeMountRef.current < 2) return;
    }

    if (hasExpandedRef.current) return;

    expandNegations();
    setShouldExpandOnInit(false);
    hasExpandedRef.current = true;
  }, [shouldExpandOnInit, pointData, expandNegations]);

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
          if (node?.type === "point") {
            const pointNode = node as PointNode;
            // Store position before collapsing
            const newPosition: CollapsedNodePosition = {
              pointId: pointNode.data.pointId,
              x: node.position.x,
              y: node.position.y,
              parentId: pointNode.data.parentId
            };
            setCollapsedNodePositions(prev => [...prev, newPosition]);
            return pointNode.data.pointId;
          }
          return null;
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
        const node = getNode(id);
        if (node) {
          // Store position of the collapsing node itself
          const newPosition: CollapsedNodePosition = {
            pointId: pointId as number,
            x: node.position.x,
            y: node.position.y,
            parentId: typeof parentId === 'string' ? parentId : Number(parentId)
          };
          setCollapsedNodePositions(prev => [...prev, newPosition]);
        }
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
    getEdges,
    setCollapsedNodePositions,
    parentId
  ]);

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  // Get the pathname once and memoize the check
  const pathname = usePathname();
  const isNewViewpointPage = useMemo(() =>
    pathname?.includes('/rationale/new'),
    [pathname]
  );

  const handleCollapseClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Single combined check to determine if we show confirmation
    if (parentId === 'statement' && isNewViewpointPage) {
      setIsConfirmDialogOpen(true);
    } else if (parentId) {
      // For all other cases, collapse without confirmation
      collapseSelfAndNegations();
    }
  }, [parentId, collapseSelfAndNegations, isNewViewpointPage]);

  const confirmCollapse = useCallback(() => {
    setIsConfirmDialogOpen(false);
    collapseSelfAndNegations();
  }, [collapseSelfAndNegations]);

  const handleExpandNegationsClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    expandNegations();
  }, [expandNegations]);

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
        className={cn(
          "pb-0.5 px-4 translate-y-[100%] -translate-x-1/2 size-fit bg-muted text-center border-2 border-t-0 rounded-b-full pointer-events-auto cursor-pointer",
          collapsedNegations === 0 && "invisible"
        )}
        onClick={handleExpandNegationsClick}
      >
        {pointData && collapsedNegations > 0 && (
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
          onClick={handleCollapseClick}
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
            space={pointData.space ?? undefined}
            isCommand={pointData.isCommand}
            className={cn(
              "bg-muted/40 rounded-sm z-10 max-w-[300px] break-words",
              isRedundant && "opacity-30 hover:opacity-100"
            )}
            originalPosterId={originalPosterId}
            inGraphNode={true}
          ></PointCard>
        </>
      ) : (
        <div className="w-full flex-grow h-32 bg-muted/40 animate-pulse" />
      )}
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Point</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect this point? You won&apos;t be able to reopen it from the statement node, but you can always use keywords to find and add it again later via the add point button.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCollapse}>
              Yes, disconnect it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

function calculateInitialLayout(
  parentX: number,
  parentY: number,
  parentHeight: number,
  count: number,
  spacing = 250,
  verticalOffset = 200
): Array<{ x: number; y: number }> {
  if (count === 0) return [];

  // For a single node, place it directly below
  if (count === 1) {
    return [{ x: parentX, y: parentY + parentHeight + verticalOffset }];
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

    const y = parentY + parentHeight + dynamicVerticalOffset + arcHeight;
    const adjustedX = x + horizontalVariation;

    positions.push({ x: adjustedX, y });
  }

  return positions;
}


