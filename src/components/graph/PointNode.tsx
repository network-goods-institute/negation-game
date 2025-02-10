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
  useStore,
  useStoreApi,
  useUpdateNodeInternals,
} from "@xyflow/react";
import { useAtom, useSetAtom } from "jotai";
import { Trash2Icon, XIcon } from "lucide-react";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useMemo, useState } from "react";
import { find } from "remeda";
import { AuthenticatedActionButton } from "@/components/ui/button";
import { deletedPointIdsAtom } from "@/app/s/[space]/viewpoint/viewpointAtoms";

export type PointNodeData = {
  pointId: number;
  parentId?: string;
  expandOnInit?: boolean;
};

export type PointNode = Node<PointNodeData, "point">;

export interface PointNodeProps extends Omit<NodeProps, "data"> {
  data: PointNodeData;
  onDelete?: (nodeId: string) => void;
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

  const outgoingConnections = useHandleConnections({
    type: "source",
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
  const { originalPosterId } = useOriginalPoster();
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

  const isAddressingStatement = parentId === "statement";
  const editMode = useEditMode();

  const [deletedPointIds] = useAtom(deletedPointIdsAtom);

  const expandNegations = useCallback(() => {
    if (!pointData) return;

    const expandedNegationIds = [
      ...getHandleConnections({ type: "target", nodeId: id }).map((c) => {
        const node = getNode(c.source)! as PointNode;
        return node.data.pointId;
      }),
      ...(parentId ? [parentId] : []),
    ];

    const currentNode = getNode(id)!;

    // Filter out deleted points before expanding
    const nonDeletedNegationIds = pointData.negationIds.filter(
      (id) => !deletedPointIds.has(id)
    );

    for (const [i, negationId] of nonDeletedNegationIds.entries()) {
      if (expandedNegationIds.includes(negationId)) continue;
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
  }, [
    pointData,
    getHandleConnections,
    id,
    parentId,
    getNode,
    addNodes,
    pointId,
    addEdges,
    deletedPointIds,
  ]);

  useEffect(() => {
    if (!shouldExpandOnInit || pointData === undefined) return;

    // FIXME: this is causing duplicates on strict mode. Couldn't track down the issue
    expandNegations();
    setShouldExpandOnInit(false);
  }, [shouldExpandOnInit, pointData, expandNegations]);

  const collapsedNegations = pointData
    ? // Filter out deleted negations first
    (pointData.negationIds.filter(id => !deletedPointIds.has(id)).length -
      incomingConnections.length -
      outgoingConnections.filter((c) => c.target !== "statement").length)
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

      await deleteElements({
        nodes: nodeIds.map((id) => ({ id })),
        edges: edgeIds.map((id) => ({ id })),
      });
    };

    await removeNestedNegations(id).then(() =>
      deleteElements({ nodes: [{ id }] })
    );

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
  ]);

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
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(id);
          }}
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
