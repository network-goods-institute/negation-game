import { NodeProps, useReactFlow, Node, useNodeConnections, useUpdateNodeInternals } from "@xyflow/react";
import { PointCard } from "@/components/PointCard";
import { useAtom, useSetAtom } from "jotai";
import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { cn } from "@/lib/cn";
import { useCallback, useEffect, useMemo, useState, useRef, memo } from "react";
import { usePointNodeData } from "../../hooks/usePointNodeData";
import { useParams, usePathname } from "next/navigation";
import { expandDialogAtom } from "./ExpandPointDialog";
import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";
import { nanoid } from "nanoid";
import { useOriginalPoster } from "@/components/graph/OriginalPosterContext";
import { collapsedPointIdsAtom, collapsedNodePositionsAtom } from "@/atoms/viewpointAtoms";
import { useViewpoint } from "@/queries/useViewpoint";
import { recentlyCreatedNegationIdAtom } from "@/atoms/recentlyCreatedNegationIdAtom";
import { useExpandCollapse } from "../../hooks/useExpandCollapse";
import { useMergeDetection } from "../../hooks/useMergeDetection";
import { undoCollapseStackAtom, UndoCollapseState } from "@/atoms/viewpointAtoms";
import { DisconnectDialog } from "./DisconnectDialog";
import { NodeHandles } from "./NodeHandles";
import { GraphNodeShell } from "./GraphNodeShell";
import { calculateInitialLayout } from '../utils/graph-utils';

export type PointNodeData = {
  pointId: number;
  parentId?: string;
  expandOnInit?: boolean;
  isExpanding?: boolean;
  initialPointData?: import("@/queries/usePointData").PointData;
};

export type PointNode = Node<PointNodeData, "point">;

export interface PointNodeProps extends NodeProps {
  data: PointNodeData;
  isSharing?: boolean;
}

const RawPointNode = ({
  data: { pointId, parentId, expandOnInit, isExpanding: dataIsExpanding, initialPointData },
  id,
  isSharing,
}: PointNodeProps) => {

  const { expand, collapse } = useExpandCollapse(id, pointId, parentId);

  const [hoveredPoint, setHoveredPoint] = useAtom(hoveredPointIdAtom);
  const [shouldExpandOnInit, setShouldExpandOnInit] = useState(
    expandOnInit ?? false
  );
  const [isExpanding, setIsExpanding] = useState(true);
  const [hasAnimationPlayed, setHasAnimationPlayed] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const incomingConnections = useNodeConnections({
    handleType: "target",
    id: id,
  });

  const updateNodeInternals = useUpdateNodeInternals();
  const setNegatedPointId = useSetAtom(negatedPointIdAtom);
  const setUndoStack = useSetAtom(undoCollapseStackAtom);
  const {
    addNodes,
    addEdges,
    getNode,
    getEdges,
  } = useReactFlow();

  const params = useParams();
  const rationaleId = (params.rationaleId || params.viewpointId) as string;
  const isViewpointContext = !!rationaleId;
  const { data: originalViewpoint } = useViewpoint(isViewpointContext ? rationaleId : "DISABLED");
  const { originalPosterId } = useOriginalPoster();

  const { pointData: fetchedPointData, isLoading: hookLoading, endorsedByOp } = usePointNodeData(pointId, parentId);
  const pointData = hookLoading
    ? initialPointData
    : (fetchedPointData ?? initialPointData);
  const isPointDataLoading = initialPointData == null && hookLoading;

  const [recentlyCreatedNegation, setRecentlyCreatedNegation] = useAtom(recentlyCreatedNegationIdAtom);

  const [_, setCollapsedPointIds] = useAtom(collapsedPointIdsAtom);
  const [collapsedNodePositions, setCollapsedNodePositions] = useAtom(collapsedNodePositionsAtom);

  const expandedNegationIds = useMemo(() => {
    return [...incomingConnections].map((c) => {
      const node = getNode(c.source);
      if (!node || node.type !== "point") return null;
      return node.data.pointId;
    }).filter(Boolean) as number[];
  }, [incomingConnections, getNode]);

  const collapsedNegations = useMemo(() => {
    if (!pointData) return 0;

    // Get all negation IDs that could be connected to this point
    const possibleNegationIds = pointData.negationIds.filter(id =>
      // Don't include self-negations
      id !== pointId &&
      // Don't include already connected negations
      !expandedNegationIds.includes(id)
    );

    // Just return the count of all possible negations that aren't directly connected
    const count = possibleNegationIds.length;

    return count;
  }, [pointData, expandedNegationIds, pointId]);

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

    expand();
    setShouldExpandOnInit(false);
    hasExpandedRef.current = true;
  }, [shouldExpandOnInit, pointData, expand]);

  const hasInitializedCollapsedState = useRef(false);

  useEffect(() => {
    // Only run once per node mount
    if (hasInitializedCollapsedState.current || !isViewpointContext || !pointData || !originalViewpoint) {
      return;
    }

    // We only want to track which negations aren't in the original viewpoint
    // for state management purposes, but we no longer use this set for filtering
    // visible nodes - each node instance is managed independently
    const negationsNotInViewpoint = pointData.negationIds.filter((id: number) => {
      // Don't add to tracking if it's already being explicitly shown (connected to this node)
      const isAlreadyExpanded = expandedNegationIds.includes(id);
      // Only track if it's not in the original viewpoint and not already shown
      return !originalViewpoint.originalPointIds.includes(id) && !isAlreadyExpanded;
    });

    if (negationsNotInViewpoint.length > 0) {
      // This is now only used for state tracking, not for controlling visibility
      setCollapsedPointIds(prev => {
        const newSet = new Set(prev);
        negationsNotInViewpoint.forEach(id => newSet.add(id));
        return newSet;
      });
    }
    hasInitializedCollapsedState.current = true;
  }, [isViewpointContext, pointData, originalViewpoint, setCollapsedPointIds, pointId, expandedNegationIds]);

  // When fresh data loads, re-measure the node size/layout
  useEffect(() => {
    if (fetchedPointData) {
      updateNodeInternals(id);
    }
  }, [fetchedPointData, updateNodeInternals, id]);

  const handleSelectPoint = useCallback((point: { pointId: number, parentId?: string | number }) => {
    const uniqueId = `${nanoid()}-${Date.now()}`;
    const targetNode = getNode(id)!;
    const layouts = calculateInitialLayout(
      targetNode.position.x,
      targetNode.position.y,
      targetNode?.measured?.height ?? 200,
      1
    );

    addNodes({
      id: uniqueId,
      data: {
        pointId: point.pointId,
        parentId: pointId,
        _lastModified: Date.now(),
        isExpanding: true
      },
      type: "point",
      position: layouts[0],
    });

    addEdges({
      id: nanoid(),
      target: id,
      source: uniqueId,
      type: parentId === 'statement' ? 'statement' : 'negation',
    });

    setCollapsedPointIds(prev => {
      const newSet = new Set(prev);
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      newSet.delete(point.pointId);
      return newSet;
    });

    setCollapsedNodePositions(prev =>
      prev.filter(pos => !(pos.pointId === point.pointId && pos.parentId === pointId))
    );
  }, [id, pointId, parentId, addNodes, addEdges, setCollapsedPointIds, setCollapsedNodePositions, getNode]);

  const { hasDuplicates } = useMergeDetection(pointId);

  const level = useMemo(() => {
    let currentLevel = 0;
    let currentId = id;

    const edges = getEdges();

    while (currentId) {
      const edge = edges.find(e => e.source === currentId);
      if (!edge) break;

      const targetNode = getNode(edge.target);
      if (!targetNode) break;

      currentLevel++;
      currentId = edge.target;

      if (targetNode.type === 'statement') break;
    }

    return currentLevel;
  }, [id, getNode, getEdges]);

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const setExpandDialogState = useSetAtom(expandDialogAtom);

  // Get the pathname once and memoize the check
  const pathname = usePathname();
  const isNewViewpointPage = useMemo(() =>
    pathname?.includes('/rationale/new'),
    [pathname]
  );

  const wasInOriginalGraph = useMemo(() => {
    if (!originalViewpoint?.graph || !parentId || parentId !== 'statement') return false;

    // Check if this specific point was connected to the statement node in the original graph
    return originalViewpoint.graph.nodes.some(node =>
      node.type === 'point' &&
      node.data?.pointId === pointId &&
      originalViewpoint.graph.edges.some(edge =>
        edge.source === node.id &&
        edge.target === 'statement'
      )
    );
  }, [originalViewpoint, pointId, parentId]);

  const collapseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCollapsingRef = useRef(false);

  const handleCollapseClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isCollapsingRef.current) {
      return;
    }

    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current);
    }

    isCollapsingRef.current = true;

    // Show confirmation dialog in two cases:
    // 1. New viewpoint page: all direct children of statement node
    // 2. Existing viewpoint: direct children of statement node that either:
    //    - weren't in the original viewpoint at all, or
    //    - were in the original viewpoint but not connected to statement node
    if (parentId === 'statement' && (
      isNewViewpointPage ||
      (isViewpointContext && originalViewpoint && !wasInOriginalGraph)
    )) {
      setIsConfirmDialogOpen(true);
    } else if (parentId) {
      // For all other cases, collapse without confirmation
      collapse().finally(() => {
        collapseTimeoutRef.current = setTimeout(() => {
          isCollapsingRef.current = false;
        }, 300);
      });
    }
  }, [parentId, collapse, isNewViewpointPage, isViewpointContext, originalViewpoint, wasInOriginalGraph]);

  const confirmCollapse = useCallback(async () => {
    setIsCollapsing(true);
    try {
      await collapse();
    } finally {
      setIsCollapsing(false);
      setIsConfirmDialogOpen(false);
    }
  }, [collapse]);

  // Reset animation state after mount
  useEffect(() => {
    if (!hasAnimationPlayed && (isExpanding || dataIsExpanding)) {
      const timer = setTimeout(() => {
        setIsExpanding(false);
        setHasAnimationPlayed(true);
      }, 400); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isExpanding, dataIsExpanding, hasAnimationPlayed]);

  // Helper function to expand only a specific negation
  const expandSpecificNegation = useCallback((negationIdToExpand: number) => {
    if (!pointData || !negationIdToExpand) return;

    setUndoStack((prevStack: UndoCollapseState[]) => prevStack.filter((state: UndoCollapseState) => {
      return !state.nodesToRestore.some((node: any) =>
        node.type === 'point' &&
        node.data.pointId === pointId &&
        node.data.parentId === parentId
      );
    }));

    // Check if this negation ID is in the point's negations
    if (!pointData.negationIds.includes(negationIdToExpand)) return;

    // Check if it's already expanded
    if (expandedNegationIds.includes(negationIdToExpand)) return;

    // Get a unique ID for the new node
    const uniqueId = `${nanoid()}-${Date.now()}`;

    // Calculate position (similar to expandNegations)
    const targetNode = getNode(id)!;
    const position = {
      x: targetNode.position.x,
      y: targetNode.position.y + (targetNode?.measured?.height ?? 200) + 200, // Place below
    };

    // Add the node to the graph
    addNodes({
      id: uniqueId,
      data: {
        pointId: negationIdToExpand,
        parentId: pointId,
        _lastModified: Date.now(),
        isExpanding: true
      },
      type: "point",
      position,
    });

    // Add the edge connecting to the parent
    addEdges({
      id: nanoid(),
      target: id,
      source: uniqueId,
      type: parentId === 'statement' ? 'statement' : 'negation',
    });

    // Remove the negation from collapsed state
    setCollapsedPointIds(prev => {
      const newSet = new Set(prev);
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      newSet.delete(negationIdToExpand);
      return newSet;
    });

    // Clean up stored position if it exists
    setCollapsedNodePositions(prev =>
      prev.filter(pos => !(pos.pointId === negationIdToExpand && pos.parentId === pointId))
    );

    // Clear the recently created negation after we've expanded it
    setRecentlyCreatedNegation({
      negationId: null,
      parentPointId: null,
      timestamp: 0
    });

    setUndoStack((prevStack: UndoCollapseState[]) => prevStack.filter((state: UndoCollapseState) => state.topLevelNodeId !== id));

  }, [
    pointData,
    expandedNegationIds,
    getNode,
    id,
    addNodes,
    addEdges,
    setCollapsedPointIds,
    setCollapsedNodePositions,
    pointId,
    parentId,
    setRecentlyCreatedNegation,
    setUndoStack
  ]);

  useEffect(() => {
    if (!pointData || !recentlyCreatedNegation.negationId) return;

    if (recentlyCreatedNegation.parentPointId !== pointId) return;

    const currentTime = Date.now();
    const timeSinceCreation = currentTime - recentlyCreatedNegation.timestamp;
    const MAX_AUTO_EXPAND_TIME = 15000;

    if (timeSinceCreation > MAX_AUTO_EXPAND_TIME) {
      setRecentlyCreatedNegation({
        negationId: null,
        parentPointId: null,
        timestamp: 0
      });
      return;
    }

    expandSpecificNegation(recentlyCreatedNegation.negationId);

  }, [pointData, recentlyCreatedNegation, pointId, expandSpecificNegation, setRecentlyCreatedNegation]);

  return (
    <GraphNodeShell
      id={id}
      level={level}
      endorsedByOp={endorsedByOp}
      isLoading={isPointDataLoading}
      isExpanding={isExpanding}
      dataIsExpanding={dataIsExpanding}
      hasAnimationPlayed={hasAnimationPlayed}
      hovered={hoveredPoint === pointId}
      onHover={() => setHoveredPoint(pointId)}
      onLeave={() => setHoveredPoint(undefined)}
      onPressStart={() => setIsActive(true)}
      onPressEnd={() => setIsActive(false)}
    >
      <NodeHandles
        id={id}
        collapsedCount={collapsedNegations}
        onExpand={(e) => {
          if (e.altKey) {
            expand();
          } else if (pointData) {
            const remaining = pointData.negationIds.filter(nid => nid !== pointId && !expandedNegationIds.includes(nid));
            if (remaining.length <= 2) {
              expand();
            } else {
              setExpandDialogState({
                isOpen: true,
                points: pointData.negationIds.filter(nid => nid !== pointId).map(nid => ({ pointId: nid, parentId: pointId, searchTerm: '', dialogPosition: { x: 0, y: 0 }, isVisited: false, onMarkAsRead: () => { }, onZoomToNode: () => { } })),
                parentNodeId: id,
                onClose: () => { },
                onSelectPoint: handleSelectPoint,
              });
            }
          }
        }}
        onCollapse={handleCollapseClick}
        parentId={parentId}
      />
      <PointCard
        isLoading={isPointDataLoading}
        onNegate={() => setNegatedPointId(pointId)}
        amountNegations={pointData?.amountNegations ?? 0}
        amountSupporters={pointData?.amountSupporters ?? 0}
        content={pointData?.content ?? ""}
        createdAt={pointData?.createdAt ?? new Date()}
        cred={pointData?.cred ?? 0}
        favor={pointData?.favor ?? 0}
        pointId={pointId}
        viewerContext={{ viewerCred: pointData?.viewerCred }}
        space={pointData?.space ?? undefined}
        isCommand={pointData?.isCommand}
        className={cn(
          "border-0 shadow-none",
          level % 2 === 0 && "rounded-lg",
          level % 2 === 1 && "rounded-none"
        )}
        inGraphNode
        restake={pointData?.restake ? { ...pointData.restake, isOwner: false } : null}
        totalRestakeAmount={pointData?.totalRestakeAmount}
        doubt={pointData?.doubt}
        originalPosterId={originalPosterId}
        graphNodeLevel={level}
        isSharing={isSharing}
      />
      <DisconnectDialog
        open={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
        onConfirm={confirmCollapse}
        isCollapsing={isCollapsing}
      />
    </GraphNodeShell>
  );
};

export const PointNode = memo(RawPointNode);