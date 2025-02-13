import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";
import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { PointCard } from "@/components/PointCard";
import { useEditMode } from "@/components/graph/EditModeContext";
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
  useHandleConnections,
  useReactFlow,
  useUpdateNodeInternals,
} from "@xyflow/react";
import { useAtom, useSetAtom } from "jotai";
import { Trash2Icon, XIcon } from "lucide-react";
import { Edge } from "@xyflow/react";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useMemo, useState } from "react";
import { find } from "remeda";
import { AuthenticatedActionButton } from "@/components/ui/button";
import { deletedPointIdsAtom } from "@/app/s/[space]/viewpoint/viewpointAtoms";
import { useViewpoint } from "@/queries/useViewpoint";
import { useParams } from "next/navigation";
import { collapsedPointIdsAtom } from "@/app/s/[space]/viewpoint/viewpointAtoms";

export type PointNodeData = {
  pointId: number;
  parentId?: string;
  expandOnInit?: boolean;
};

export type PointNode = Node<PointNodeData, "point">;

export interface PointNodeProps extends Omit<NodeProps, "data"> {
  data: PointNodeData;
  onDelete?: (params: { nodes: Node[]; edges: Edge[] }) => void;
}

export const PointNode = ({
  data: { pointId, parentId, expandOnInit },
  id,
  onDelete,
}: PointNodeProps) => {
  const [hoveredPoint, setHoveredPoint] = useAtom(hoveredPointIdAtom);
  const [shouldExpandOnInit, setShouldExpandOnInit] = useState(
    expandOnInit ?? false
  );
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
    getEdges,
    deleteElements,
  } = useReactFlow();

  const params = useParams();
  const viewpointId = params.viewpointId as string;
  const editMode = useEditMode();
  const isViewpointContext = !!viewpointId;
  const { data: originalViewpoint } = useViewpoint(isViewpointContext ? viewpointId : "DISABLED");
  const { originalPosterId } = useOriginalPoster();

  const wasInOriginalViewpoint = isViewpointContext ? originalViewpoint?.originalPointIds?.includes(pointId) : true;

  const isAddressingStatement = parentId === "statement";
  // When in edit mode, allow expansion for all nodes; otherwise, use the normal filtering logic.
  const canExpand = editMode ? true : wasInOriginalViewpoint;

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

  const { isLoading, data: pointData } = usePointData(pointId);
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

  const [deletedPointIds, setDeletedPointIds] = useAtom(deletedPointIdsAtom);
  const [collapsedPointIds, setCollapsedPointIds] = useAtom(collapsedPointIdsAtom);

  const expandNegations = useCallback(() => {
    if (!isViewpointContext || editMode) {
      const nonDeletedNegationIds =
        pointData?.negationIds.filter((id) => !deletedPointIds.has(id)) ?? [];

      const localExpandedNegationIds = [
        ...getHandleConnections({ type: "target", nodeId: id }).map((c) => {
          const node = getNode(c.source)! as PointNode;
          return node.data.pointId;
        }),
        ...(parentId ? [parentId] : []),
      ];

      const currentNode = getNode(id)!;

      for (const [i, negationId] of nonDeletedNegationIds.entries()) {
        if (localExpandedNegationIds.includes(negationId)) continue;
        const nodeId = nanoid();
        addNodes({
          id: nodeId,
          data: { pointId: negationId, parentId: pointId },
          type: "point",
          position: {
            x: currentNode.position.x + i * 20,
            y:
              currentNode.position.y +
              (currentNode?.measured?.height ?? 200) +
              100 +
              20 * i,
          },
        });
        addEdges({
          id: nanoid(),
          target: id,
          source: nodeId,
          type: "negation",
        });
      }
      return;
    }

    if (!pointData || (!editMode && !canExpand)) {
      return;
    }

    const currentNode = getNode(id)!;
    const localExpandedNegationIds = [
      ...getHandleConnections({ type: "target", nodeId: id }).map((c) => {
        const node = getNode(c.source)! as PointNode;
        return node.data.pointId;
      }),
      ...(parentId ? [parentId] : []),
    ];

    const expandableNegationIds = pointData.negationIds
      .filter((id) => !deletedPointIds.has(id))
      .filter((id) => originalViewpoint?.originalPointIds?.includes(id))
      .filter((id) => !localExpandedNegationIds.includes(id));

    for (const [i, negationId] of expandableNegationIds.entries()) {
      const nodeId = nanoid();
      addNodes({
        id: nodeId,
        data: { pointId: negationId, parentId: pointId },
        type: "point",
        position: {
          x: currentNode.position.x + i * 20,
          y:
            currentNode.position.y +
            (currentNode?.measured?.height ?? 200) +
            100 +
            20 * i,
        },
      });
      addEdges({
        id: nanoid(),
        target: id,
        source: nodeId,
        type: "negation",
      });
    }

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
    isViewpointContext,
    editMode,
    pointData,
    deletedPointIds,
    getHandleConnections,
    id,
    getNode,
    parentId,
    addNodes,
    addEdges,
    setCollapsedPointIds,
    originalViewpoint,
    canExpand,
    pointId,
  ]);

  useEffect(() => {
    if (!shouldExpandOnInit || pointData === undefined) return;

    // FIXME: this is causing duplicates on strict mode. Couldn't track down the issue
    expandNegations();
    setShouldExpandOnInit(false);
  }, [shouldExpandOnInit, pointData, expandNegations]);

  const expandedNegationIds = [
    ...getHandleConnections({ type: "target", nodeId: id }).map((c) => {
      const node = getNode(c.source)! as PointNode;
      return node.data.pointId;
    }),
    ...(parentId ? [parentId] : []),
  ];

  const collapsedNegations = pointData
    ? (pointData.negationIds
      .filter(id => !deletedPointIds.has(id))
      .filter(id => !isViewpointContext || editMode || originalViewpoint?.originalPointIds?.includes(id))
      .filter(id => !expandedNegationIds.includes(id))
      .length)
    : 0;

  const collapseSelfAndNegations = useCallback(async () => {
    const removeNestedNegations = async (nodeId: string) => {
      const incomingConnections = getHandleConnections({
        type: "target",
        nodeId,
      });
      const nodeIds = incomingConnections.map((c) => c.source);
      const edgeIds = incomingConnections.map((c) => c.edgeId);

      if (nodeIds.length > 0) nodeIds.forEach(removeNestedNegations);

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

    // Filter out deleted points
    const nonDeletedNegationIds = pointData?.negationIds.filter(
      (id) => !deletedPointIds.has(id)
    ) ?? [];

    for (const negationId of nonDeletedNegationIds) {
      prefetchPoint(negationId);
      originalPosterId &&
        prefetchUserEndorsements(originalPosterId, negationId);
    }
  }, [
    deleteElements,
    getHandleConnections,
    id,
    pointData,
    deletedPointIds,
    prefetchPoint,
    originalPosterId,
    prefetchUserEndorsements,
    setCollapsedPointIds,
    getNode,
    pointId,
  ]);

  const handleDelete = () => {
    if (onDelete) {
      const currentNodes = getNodes();
      const currentEdges = getEdges();

      // Do not allow deletion of the "statement" node.
      if (id === "statement") return;

      // Old deletion method: BFS to find all child nodes
      const nodesToRemove = new Set<string>([id]);
      const edgesToRemove = new Set<string>();

      // Find all edges connected to this node (both directions)
      const connectedEdges = currentEdges.filter(edge =>
        edge.source === id || edge.target === id
      );
      // Add all connected edges to removal set
      connectedEdges.forEach(edge => {
        edgesToRemove.add(edge.id);
      });

      // BFS to find all CHILDREN (using reverse edge direction, where this node is the TARGET)
      const queue = [id];
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const childEdges = currentEdges.filter(
          edge => edge.target === currentId && edge.source !== "statement"
        );
        childEdges.forEach(edge => {
          const childNodeId = edge.source;
          if (!nodesToRemove.has(childNodeId)) {
            nodesToRemove.add(childNodeId);
            queue.push(childNodeId);
          }
        });
      }

      const newNodes = currentNodes.filter(node => !nodesToRemove.has(node.id));
      const newEdges = currentEdges.filter(edge => !edgesToRemove.has(edge.id));

      // Update the deletedPointIds atom with the pointIds from the nodes we're removing.
      setDeletedPointIds((prev) => {
        const newSet = new Set(prev);
        nodesToRemove.forEach(nodeId => {
          const node = getNode(nodeId);
          if (node && node.type === "point") {
            newSet.add(node.data.pointId as number);
          }
        });
        return newSet;
      });

      onDelete({ nodes: newNodes, edges: newEdges });
    }
  };

  return (
    <div
      data-loading={isLoading}
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
          collapsedNegations === 0 || !canExpand
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
          id={`${id}-outgoing-handle`}
          type="source"
          position={Position.Top}
          className={
            isAddressingStatement && !editMode
              ? "invisible"
              : "-z-10 pt-1 pb-0.5 px-2 translate-y-[-100%]  -translate-x-1/2  size-fit bg-muted text-center border-2 border-b-0 rounded-t-full pointer-events-auto !cursor-pointer"
          }
          onClick={
            isAddressingStatement && !editMode
              ? undefined
              : collapseSelfAndNegations
          }
        >
          <XIcon className="size-4" />
        </Handle>
      )}
      {editMode && (
        <AuthenticatedActionButton
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1 z-50"
          onClick={handleDelete}
        >
          <Trash2Icon className="size-4" />
        </AuthenticatedActionButton>
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
              isRedundant && "opacity-30 hover:opacity-100",
              editMode && "pr-8"
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
