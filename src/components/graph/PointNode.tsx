import {
  CircleIcon,
  XIcon,
} from "lucide-react";
import { Position, NodeProps, useReactFlow, Node, useNodeConnections, useUpdateNodeInternals } from "@xyflow/react";
import { PointCard } from "@/components/PointCard";
import { Handle } from "@xyflow/react";
import { useAtom, useSetAtom } from "jotai";
import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { cn } from "@/lib/cn";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { usePointData, usePrefetchPoint } from "@/queries/usePointData";
import { useParams, usePathname } from "next/navigation";
import { findOverlappingPoints } from "@/lib/negation-game/findDuplicatePoints";
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
import { expandDialogAtom } from "./ExpandPointDialog";
import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";
import { nanoid } from "nanoid";
import { useOriginalPoster } from "@/components/graph/OriginalPosterContext";
import {
  usePrefetchUserEndorsements,
  useUserEndorsement,
} from "@/queries/useUserEndorsements";
import { collapsedPointIdsAtom, collapsedNodePositionsAtom, CollapsedNodePosition } from "@/atoms/viewpointAtoms";
import { useViewpoint } from "@/queries/useViewpoint";
import { recentlyCreatedNegationIdAtom } from "@/atoms/recentlyCreatedNegationIdAtom";
import { DuplicatePointNode, mergeNodesDialogAtom } from "@/atoms/mergeNodesAtom";
import { undoCollapseStackAtom, UndoCollapseState } from "@/atoms/viewpointAtoms";
import { Edge } from "@xyflow/react";
import { AppNode } from "./AppNode"; // Import AppNode
import { debounce } from "lodash";

export type PointNodeData = {
  pointId: number;
  parentId?: string;
  expandOnInit?: boolean;
  isExpanding?: boolean;
};

export type PointNode = Node<PointNodeData, "point">;

export interface PointNodeProps extends NodeProps {
  data: PointNodeData;
  isSharing?: boolean;
}

export const PointNode = ({
  data: { pointId, parentId, expandOnInit, isExpanding: dataIsExpanding },
  id,
  isSharing,
}: PointNodeProps) => {

  const [hoveredPoint, setHoveredPoint] = useAtom(hoveredPointIdAtom);
  const [shouldExpandOnInit, setShouldExpandOnInit] = useState(
    expandOnInit ?? false
  );
  const [isExpanding, setIsExpanding] = useState(true);
  const [hasAnimationPlayed, setHasAnimationPlayed] = useState(false);
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
    getNodes,
    deleteElements,
    getEdges,
  } = useReactFlow();

  const params = useParams();
  const rationaleId = (params.rationaleId || params.viewpointId) as string;
  const isViewpointContext = !!rationaleId;
  const { data: originalViewpoint } = useViewpoint(isViewpointContext ? rationaleId : "DISABLED");
  const { originalPosterId } = useOriginalPoster();

  const prefetchPoint = usePrefetchPoint();
  const prefetchUserEndorsements = usePrefetchUserEndorsements();

  const { data: pointData } = usePointData(pointId);
  const { data: opCred } = useUserEndorsement(originalPosterId, pointId);

  const endorsedByOp = opCred && opCred > 0;

  const [recentlyCreatedNegation, setRecentlyCreatedNegation] = useAtom(recentlyCreatedNegationIdAtom);

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

  const [_, setCollapsedPointIds] = useAtom(collapsedPointIdsAtom);
  const [collapsedNodePositions, setCollapsedNodePositions] = useAtom(collapsedNodePositionsAtom);

  const expandNegations = useCallback(() => {
    const allNodes = getNodes();
    const pointNodes = allNodes.filter((n): n is PointNode => n.type === "point");

    setUndoStack(prevStack => prevStack.filter(state => {
      return !state.nodesToRestore.some(node =>
        node.type === 'point' &&
        node.data.pointId === pointId &&
        node.data.parentId === parentId
      );
    }));

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

    const localExpandedNegationIds = incomingConnections.map((c) => {
      const node = getNode(c.source)! as PointNode;
      return node.data.pointId;
    });

    // Check which negations we should expand
    const expandableNegationIds: number[] = [];
    const skippedNegationIds: { id: number, reason: string }[] = [];

    pointData?.negationIds.forEach(negId => {
      // Skip if it's this node's own ID
      if (negId === pointId) {
        skippedNegationIds.push({ id: negId, reason: "self-negation" });
        return;
      }

      // Check if already connected to this node (but allow parent)
      if (localExpandedNegationIds.includes(negId)) {
        skippedNegationIds.push({ id: negId, reason: "already connected" });
        return;
      }

      // Check if this would create a circular parent-child relationship
      let wouldCreateCircle = false;

      // Instead of checking by pointId, check by the actual node ids in the graph
      // This allows multiple nodes with the same pointId to exist
      if (parentChildMap.has(negId)) {
        // Rather than checking if the current node's pointId is a child,
        // we need to check if this specific node instance is a child
        // This allows duplicate points to exist in different parts of the graph

        // Check for indirect connections using source/target relationships in the graph
        // (This only checks the current node's ID against potential cycles)
        const edges = getEdges();
        const cycles = findPathsInGraph(edges, negId.toString(), id);

        if (cycles.length > 0) {
          wouldCreateCircle = true;
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

      const uniqueId = `${nanoid()}-${Date.now()}-${i}`;

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
        id: uniqueId,
        data: {
          pointId: negationId,
          parentId: pointId,
          _lastModified: Date.now(),
          isExpanding: true
        },
        type: "point",
        position,
      });

      addEdges({
        id: nanoid(),
        target: id,
        source: uniqueId,
        type: parentId === 'statement' ? 'statement' : 'negation',
      });

      // Remove the stored position for this node
      setCollapsedNodePositions(prev => prev.filter(pos => !(pos.pointId === negationId && pos.parentId === pointId)));

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

    setUndoStack(prevStack => prevStack.filter(state => state.topLevelNodeId !== id));

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
    getEdges,
    setUndoStack
  ]);

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

    // No longer filtering based on visibility elsewhere in the graph
    // Just return the count of all possible negations that aren't directly connected
    const count = possibleNegationIds.length;

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

  const getDescendantState = useCallback((startNodeId: string): {
    nodes: AppNode[],
    edges: Edge[],
    expandedNodeIds: string[]
  } => {
    const nodesToRemove: AppNode[] = [];
    const edgesToRemove: Edge[] = [];
    const expandedNodeIds: string[] = [];
    const queue: string[] = [startNodeId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const node = getNode(currentId) as AppNode;
      if (node) {
        nodesToRemove.push(node);


        const outgoingEdges = getEdges().filter(edge => edge.source === currentId);

        const parentId = 'parentId' in node.data ? node.data.parentId : undefined;
        const incomingEdges = parentId ? getEdges().filter(edge =>
          edge.target === currentId &&
          (edge.source === parentId ||
            getNode(edge.source)?.data?.pointId === parentId)
        ) : [];


        if (incomingEdges.length > 0) {
          expandedNodeIds.push(currentId);
        }

        outgoingEdges.forEach(edge => {
          if (!visited.has(edge.target)) {
            queue.push(edge.target);
          }
        });

        if (currentId !== startNodeId) {
          const incomingEdge = getEdges().find(edge => edge.target === currentId);
          if (incomingEdge && !edgesToRemove.some(e => e.id === incomingEdge.id)) {
            edgesToRemove.push(incomingEdge);
          }
        }
      }
    }
    const topLevelIncomingEdge = getEdges().find(edge => edge.source === startNodeId);
    if (topLevelIncomingEdge && !edgesToRemove.some(e => e.id === topLevelIncomingEdge.id)) {
      edgesToRemove.push(topLevelIncomingEdge);
    }

    return { nodes: nodesToRemove, edges: edgesToRemove, expandedNodeIds };
  }, [getNode, getEdges]);

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


      const { nodes: allNodesToRemove, edges: allEdgesToRemove, expandedNodeIds } = getDescendantState(id);

      if (allNodesToRemove.length > 0) {
        const undoState: UndoCollapseState = {
          topLevelNodeId: id,
          nodesToRestore: allNodesToRemove,
          edgesToRestore: allEdgesToRemove,
          expandedNodeIds
        };
        setUndoStack(prev => [...prev, undoState]);
      }

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

        // We only want to store the collapse state, but not use it to 
        // automatically hide other instances of the same pointId
        setCollapsedPointIds(prev => {
          const newSet = new Set(prev);
          newSet.add(pointId);
          return newSet;
        });
      }

      // This only deletes this specific node instance by its unique ID
      // Other instances of the same pointId will remain visible
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      deleteElements({ nodes: [{ id }] });
    });

    // No longer filter out collapsed points
    // We want to prefetch all of the point's negations
    const allNegationIds = pointData?.negationIds ?? [];

    for (const negationId of allNegationIds) {
      prefetchPoint(negationId);
      originalPosterId &&
        prefetchUserEndorsements(originalPosterId, negationId);
    }
  }, [
    deleteElements,
    id,
    pointData,
    prefetchPoint,
    originalPosterId,
    prefetchUserEndorsements,
    setCollapsedPointIds,
    getNode,
    pointId,
    getEdges,
    setCollapsedNodePositions,
    parentId,
    getDescendantState,
    setUndoStack
  ]);

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
      collapseSelfAndNegations().finally(() => {
        collapseTimeoutRef.current = setTimeout(() => {
          isCollapsingRef.current = false;
        }, 300);
      });
    }
  }, [parentId, collapseSelfAndNegations, isNewViewpointPage, isViewpointContext, originalViewpoint, wasInOriginalGraph]);

  const confirmCollapse = useCallback(async () => {
    setIsCollapsing(true);
    try {
      await collapseSelfAndNegations();
    } finally {
      setIsCollapsing(false);
      setIsConfirmDialogOpen(false);
    }
  }, [collapseSelfAndNegations]);

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

    setUndoStack(prevStack => prevStack.filter(state => {
      return !state.nodesToRestore.some(node =>
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

    setUndoStack(prevStack => prevStack.filter(state => state.topLevelNodeId !== id));

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

  const [hasDuplicates, setHasDuplicates] = useState(false);
  const setMergeDialogState = useSetAtom(mergeNodesDialogAtom);
  const mergeCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = useRef(false);
  const listenersActiveRef = useRef(false);

  const stableStateRef = useRef({
    hasOverlap: false,
    lastOverlapTime: 0,
    lastDialogCloseTime: 0
  });

  const findDuplicateNodes = useCallback(() => {
    const allNodes = getNodes();
    const duplicates = findOverlappingPoints(allNodes, 60);

    if (!duplicates.has(pointId)) return null;

    const nodeIds = duplicates.get(pointId) || [];
    if (nodeIds.length <= 1) return null;

    const duplicateNodeData: DuplicatePointNode[] = nodeIds.map(nodeId => {
      const nodeConnections = getEdges().filter(edge => edge.source === nodeId);
      const parentIds = nodeConnections.map(conn => {
        const parentNode = getNode(conn.target);
        return parentNode?.data?.pointId || conn.target;
      }) as (string | number)[];

      return {
        id: nodeId,
        pointId,
        parentIds: parentIds
      };
    });

    return duplicateNodeData;
  }, [getNodes, getEdges, pointId, getNode]);

  const checkIfDuplicatesExistForPointId = useCallback(() => {
    const allNodes = getNodes();
    let count = 0;
    for (const node of allNodes) {
      if (node.type === 'point' && node.data?.pointId === pointId) {
        count++;
        if (count > 1) return true;
      }
    }
    return false;
  }, [getNodes, pointId]);

  useEffect(() => {
    const hasInitialDuplicates = checkIfDuplicatesExistForPointId();

    const runOverlapCheck = () => {
      if (isDraggingRef.current) return;
      checkForOverlappingNodes();
    };

    const startInterval = () => {
      if (mergeCheckIntervalRef.current) clearInterval(mergeCheckIntervalRef.current);
      mergeCheckIntervalRef.current = setInterval(runOverlapCheck, 1500);
    };

    const stopInterval = () => {
      if (mergeCheckIntervalRef.current) {
        clearInterval(mergeCheckIntervalRef.current);
        mergeCheckIntervalRef.current = null;
      }
    };

    const checkForOverlappingNodes = () => {
      const currentDuplicates = findDuplicateNodes();
      const hasCurrentDuplicates = !!currentDuplicates && currentDuplicates.length > 1;

      setHasDuplicates(hasCurrentDuplicates);

      const currentTime = Date.now();

      if (hasCurrentDuplicates !== stableStateRef.current.hasOverlap) {
        stableStateRef.current.hasOverlap = hasCurrentDuplicates;

        if (hasCurrentDuplicates) {
          stableStateRef.current.lastOverlapTime = currentTime;
        }
      }

      if (hasCurrentDuplicates) {
        setMergeDialogState(state => {
          if (!state.isOpen) {
            return {
              isOpen: true,
              pointId: pointId,
              duplicateNodes: currentDuplicates,
              onClose: () => {

                stableStateRef.current.lastDialogCloseTime = Date.now();
              }
            };
          } else if (state.pointId === pointId) {
            // If dialog is already open for this point, update nodes
            return {
              ...state,
              duplicateNodes: currentDuplicates
            };
          }
          return state;
        });
      } else {
        setMergeDialogState(state => {
          if (state.isOpen && state.pointId === pointId) {
            return {
              ...state,
              isOpen: false
            };
          }
          return state;
        });
      }
    };

    const onDragStart = () => {
      isDraggingRef.current = true;
      stopInterval();
    };

    const onDragEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      checkForOverlappingNodes();
      startInterval();
    };

    const setupListenersAndInterval = () => {
      if (listenersActiveRef.current) return;
      document.addEventListener('mousedown', onDragStart);
      document.addEventListener('touchstart', onDragStart);
      document.addEventListener('mouseup', onDragEnd);
      document.addEventListener('touchend', onDragEnd);
      checkForOverlappingNodes();
      startInterval();
      listenersActiveRef.current = true;
    };

    const teardownListenersAndInterval = () => {
      if (!listenersActiveRef.current) return;
      stopInterval();
      document.removeEventListener('mousedown', onDragStart);
      document.removeEventListener('touchstart', onDragStart);
      document.removeEventListener('mouseup', onDragEnd);
      document.removeEventListener('touchend', onDragEnd);
      listenersActiveRef.current = false;
    };
    if (hasInitialDuplicates) {
      setupListenersAndInterval();
    } else {
      setMergeDialogState(state => {
        if (state.isOpen && state.pointId === pointId) {
          return { ...state, isOpen: false };
        }
        return state;
      });
    }

    return () => {
      teardownListenersAndInterval();
    };
  }, [findDuplicateNodes, setMergeDialogState, pointId, id, getNodes, checkIfDuplicatesExistForPointId]); // Added getNodes and helper dependency

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

  useEffect(() => {
    return () => {
      if (collapseTimeoutRef.current) {
        clearTimeout(collapseTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <div
        data-loading={pointData === undefined}
        className={cn(
          "relative bg-background border-2 min-h-28 w-64",
          // Base styles for all nodes
          "transition-all duration-200",
          // Even levels (negations) get rounded corners and subtle styling
          level % 2 === 0 && [
            "rounded-lg",
            "border-l-4"
          ],
          // Odd levels (options and their "grandchildren") get sharp corners
          level % 2 === 1 && [
            "rounded-none",
            "bg-background"
          ],
          "border-muted-foreground/60 dark:border-muted-foreground/40",
          endorsedByOp && "border-yellow-500 dark:border-yellow-500",
          hoveredPoint === pointId && "border-primary dark:border-primary",
          (!hasAnimationPlayed && (isExpanding || dataIsExpanding)) && "animate-node-expand",
          // Prevent text selection within the node
          "select-none"
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
          onClick={(e) => {
            if (e.altKey) {
              // Alt-click always expands all points
              expandNegations();
            } else {
              // Normal click shows dialog for 3+ points, expands directly for 2 or fewer
              if (!pointData) return;

              // Get negation IDs that haven't been expanded yet
              const possibleNegationIds = pointData.negationIds.filter(id =>
                // Don't include self-negations
                id !== pointId &&
                // Don't include already expanded negations
                !expandedNegationIds.includes(id)
              );

              // If 2 or fewer remaining points, just expand normally
              if (possibleNegationIds.length <= 2) {
                expandNegations();
              } else {
                // Show dialog for 3+ points
                setExpandDialogState({
                  isOpen: true,
                  points: pointData.negationIds
                    .filter(nid => nid !== pointId)
                    .map(nid => ({
                      pointId: nid,
                      parentId: pointId,
                      searchTerm: "",
                      dialogPosition: { x: 0, y: 0 },
                      isVisited: false,
                      onMarkAsRead: () => { },
                      onZoomToNode: () => { }
                    })),
                  parentNodeId: id,
                  onClose: () => {
                    // Do any cleanup needed after dialog closes
                  },
                  onSelectPoint: handleSelectPoint
                });
              }
            }
          }}
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
                "bg-muted/40 rounded-sm z-10 max-w-[300px] break-words"
              )}
              originalPosterId={originalPosterId}
              inGraphNode={true}
              graphNodeLevel={level}
              disablePopover={true}
              isSharing={isSharing}
            ></PointCard>
          </>
        ) : (
          <div className="w-full flex-grow h-32 bg-muted/40 animate-pulse" />
        )}
      </div>

      {/* Disconnect point confirmation dialog */}
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Point</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect this point? You won&apos;t be able to reopen it from the statement node, but you can always use keywords to find and add it again later via the add point button.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCollapsing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCollapse}
              disabled={isCollapsing}
              className="relative"
            >
              {isCollapsing ? (
                <>
                  <span className="opacity-0">Yes, disconnect it</span>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="size-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  </div>
                </>
              ) : (
                "Yes, disconnect it"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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

function findPathsInGraph(
  edges: any[],
  startId: string,
  endId: string
): number[][] {
  const paths: number[][] = [];
  const visited = new Set<string>();

  function dfs(currentId: string, path: string[]): void {
    if (currentId === endId) {
      paths.push([...path.map(id => parseInt(id))]);
      return;
    }

    visited.add(currentId);

    const neighbors = edges
      .filter(edge => edge.source === currentId)
      .map(edge => edge.target);

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path, neighbor]);
      }
    }

    // eslint-disable-next-line drizzle/enforce-delete-with-where
    visited.delete(currentId);
  }

  dfs(startId, [startId]);
  return paths;
}


