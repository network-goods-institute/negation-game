"use client";

import {
  fetchSimilarPoints,
  SimilarPointsResult,
} from "@/actions/fetchSimilarPoints";
import { PointEditor } from "@/components/PointEditor";
import { PointStats } from "@/components/PointStats";
import { AuthenticatedActionButton } from "@/components/ui/AuthenticatedActionButton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { POINT_MIN_LENGTH } from "@/constants/config";
import { useCredInput } from "@/hooks/useCredInput";
import { cn } from "@/lib/cn";
import { useMakePoint } from "@/mutations/useMakePoint";
import { usePrefetchPoint } from "@/queries/usePointData";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { Handle, Node, NodeProps, Position, useReactFlow } from "@xyflow/react";
import { XIcon } from "lucide-react";
import { nanoid } from "nanoid";
import { useState, useMemo, useEffect } from "react";
import { collapsedPointIdsAtom } from "@/atoms/viewpointAtoms";
import { useAtomValue, useSetAtom } from "jotai";

export type AddPointNodeData = {
  parentId: string;
  content: string;
  hasContent: boolean;
};

export type AddPointNode = Node<AddPointNodeData, "addPoint">;

export interface AddPointNodeProps extends Omit<NodeProps, "data"> {
  data: AddPointNodeData;
}

export const AddPointNode = ({
  id,
  data: { parentId },
  positionAbsoluteX,
  positionAbsoluteY,
}: AddPointNodeProps) => {
  const { deleteElements, addEdges, addNodes, getNode, getNodes, getEdges, updateNodeData } = useReactFlow();
  const [content, setContent] = useState("");
  const debouncedContent = useDebounce(content, 1000);
  const { credInput, setCredInput } = useCredInput();
  const collapsedPointIds = useAtomValue(collapsedPointIdsAtom);
  const setCollapsedPointIds = useSetAtom(collapsedPointIdsAtom);

  useEffect(() => {
    updateNodeData(id, { parentId, content, hasContent: content.length > 0 });
  }, [content, id, parentId, updateNodeData]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };

  const parentNode = getNode(parentId);
  const isParentStatement = parentNode?.type === "statement";
  const buttonText = isParentStatement ? "Make Option" : "Make Point";

  const existingPointIds = useMemo(() => {
    const nodes = getNodes().filter((node): node is Node<{ pointId: number }> =>
      node.type === "point" && typeof node.data?.pointId === "number"
    );

    // Get IDs of points that are visible (not collapsed)
    return new Set(
      nodes
        .filter(node => !collapsedPointIds.has(node.data.pointId))
        .map(node => node.data.pointId)
    );
  }, [getNodes, collapsedPointIds]);

  const { data: similarPoints, isLoading } = useQuery({
    queryKey: ["similarPoints", debouncedContent] as const,
    queryFn: async ({ queryKey: [, query] }) => {
      if (!query) return [] as SimilarPointsResult[];

      const similarPoints = await fetchSimilarPoints({ query });

      // Filter out points that are visible in the graph (not collapsed)
      const filteredPoints = similarPoints.filter(point => !existingPointIds.has(point.pointId));

      filteredPoints.forEach((point) => {
        prefetchPoint(point.pointId);
      });

      return filteredPoints;
    },
    enabled: debouncedContent.length >= POINT_MIN_LENGTH,
  });

  const { mutateAsync: makePoint, isPending: isMakingPoint } = useMakePoint();
  const canMakePoint = content.length >= POINT_MIN_LENGTH && !isMakingPoint;

  const prefetchPoint = usePrefetchPoint();

  const filteredSimilarPoints = similarPoints ?? [];

  return (
    <div
      className={cn(
        "relative bg-background flex flex-col gap-2 rounded-md border-2 border-dashed p-2 min-h-28 w-64"
      )}
    >
      <Handle
        id={`${id}-outgoing-handle`}
        type="source"
        position={Position.Top}
        className="-z-10 pt-1 pb-0.5 px-2 translate-y-[-100%]  -translate-x-1/2  size-fit bg-muted text-center border-2 border-b-0 rounded-t-full pointer-events-auto !cursor-pointer"
        onClick={() => {
          deleteElements({ nodes: [{ id }] });
        }}
      >
        <XIcon className="size-4" />
      </Handle>

      <PointEditor
        className="w-full h-fit"
        content={content}
        setContent={handleContentChange}
        cred={credInput}
        setCred={setCredInput}
        guidanceNotes={<></>}
        compact={true}
        extraCompact={isParentStatement}
        parentNodeType={isParentStatement ? "statement" : undefined}
      />
      <div className="flex justify-between gap-2">
        <div className="flex gap-2">
          <AuthenticatedActionButton
            className="rounded-md"
            onClick={() => {
              makePoint({ content, cred: credInput }).then((pointId) => {
                const newId = nanoid();
                addNodes({
                  id: newId,
                  data: { pointId, parentId, content, hasContent: true },
                  type: "point",
                  position: {
                    x: positionAbsoluteX,
                    y: positionAbsoluteY,
                  },
                });
                const parentNode = getNode(parentId);
                const edgeId = nanoid();
                addEdges({
                  id: edgeId,
                  source: newId,
                  target: parentNode ? parentNode.id : parentId,
                  type: "negation",
                });
                // Delayed needed to avoid race condition
                setTimeout(() => {
                  deleteElements({ nodes: [{ id }] });
                }, 50);
              }).catch(error => {
              });
            }}
            disabled={!canMakePoint}
            rightLoading={isMakingPoint}
          >
            {buttonText}
          </AuthenticatedActionButton>
        </div>
        {isLoading && <Loader className="m-2" />}
        {filteredSimilarPoints.length > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <Button size={"icon"}>{filteredSimilarPoints.length}</Button>
            </DialogTrigger>
            <DialogContent className="w-96 p-2  bg-muted rounded-md overflow-clip">
              <DialogTitle className="text-center mt-2">
                Similar Points
              </DialogTitle>
              <DialogDescription className="hidden">
                Similar points to the one you are adding
              </DialogDescription>
              <DialogClose asChild>
                <Button
                  size={"icon"}
                  className="absolute top-2 right-2"
                  variant={"ghost"}
                >
                  <XIcon className="size-5" />
                </Button>
              </DialogClose>
              <div className="overflow-y-auto max-h-96 shadow-inner rounded-md">
                <div className="flex flex-col gap-2 z-10">
                  {filteredSimilarPoints.map((point: SimilarPointsResult) => (
                    <div
                      key={point.pointId}
                      className="flex flex-col gap-2 p-4  hover:border-muted-foreground  w-full bg-background cursor-pointer border rounded-md"
                      onClick={() => {
                        // First find and remove any existing instances of this point
                        const existingNodes = getNodes().filter((node): node is Node<{ pointId: number }> =>
                          node.type === "point" && node.data.pointId === point.pointId
                        );
                        const existingEdges = getEdges().filter(edge =>
                          existingNodes.some(node => node.id === edge.source || node.id === edge.target)
                        );

                        if (existingNodes.length > 0) {
                          // Remove existing nodes and their edges
                          deleteElements({
                            nodes: existingNodes.map(n => ({ id: n.id })),
                            edges: existingEdges.map(e => ({ id: e.id }))
                          });
                        }

                        // Remove from collapsed set if it was there
                        setCollapsedPointIds(prev => {
                          const newSet = new Set(prev);
                          // eslint-disable-next-line drizzle/enforce-delete-with-where
                          newSet.delete(point.pointId);
                          return newSet;
                        });

                        // Add the point in its new position
                        const newId = nanoid();
                        addNodes({
                          id: newId,
                          data: { pointId: point.pointId, parentId, content: point.content, hasContent: true },
                          type: "point",
                          position: {
                            x: positionAbsoluteX,
                            y: positionAbsoluteY,
                          },
                        });

                        addEdges({
                          id: nanoid(),
                          source: newId,
                          target: parentId,
                          type: "negation",
                        });

                        // Remove the add point node
                        deleteElements({ nodes: [{ id }] });
                      }}
                    >
                      <span className="flex-grow text-sm">{point.content}</span>
                      <PointStats
                        favor={point.favor}
                        amountNegations={point.amountNegations}
                        amountSupporters={point.amountSupporters}
                        cred={point.cred}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};
