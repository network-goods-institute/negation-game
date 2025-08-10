"use client";

import {
  fetchSimilarPoints,
  SimilarPointsResult,
} from "@/actions/points/fetchSimilarPoints";
import { PointEditor } from "@/components/editor/PointEditor";
import { PointStats } from "@/components/cards/pointcard/PointStats";
import { AuthenticatedActionButton } from "@/components/editor/AuthenticatedActionButton";
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
import { useCredInput } from "@/hooks/ui/useCredInput";
import { cn } from "@/lib/utils/cn";
import { useMakePoint } from "@/mutations/points/useMakePoint";
import { usePrefetchPoint } from "@/queries/points/usePointData";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { Handle, Node, NodeProps, Position, useReactFlow } from "@xyflow/react";
import { XIcon, Search } from "lucide-react";
import { nanoid } from "nanoid";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { collapsedPointIdsAtom } from "@/atoms/viewpointAtoms";
import { useSetAtom } from "jotai";
import { reviewProposedPointAction, type PointReviewResults } from "@/actions/ai/reviewProposedPointAction";
import { ReviewPointDialog } from "@/components/dialogs/ReviewPointDialog";
import { useMutation } from "@tanstack/react-query";

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
  data: { parentId, content: dataContent = "", hasContent },
  positionAbsoluteX,
  positionAbsoluteY,
}: AddPointNodeProps) => {
  const { deleteElements, addEdges, addNodes, getNode, getNodes, updateNodeData } = useReactFlow();
  const [content, setContent] = useState(dataContent);
  useEffect(() => {
    if (dataContent !== content) {
      setContent(dataContent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataContent]);
  const debouncedContent = useDebounce(content, 1000);
  const { credInput, setCredInput } = useCredInput();
  const setCollapsedPointIds = useSetAtom(collapsedPointIdsAtom);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewResults, setReviewResults] = useState<PointReviewResults | null>(null);
  const [lastReviewedContent, setLastReviewedContent] = useState<string>("");
  const [hasContentBeenReviewed, setHasContentBeenReviewed] = useState(false);

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

    return new Set(
      nodes.map(node => node.data.pointId)
    );
  }, [getNodes]);

  const { data: similarPoints, isLoading } = useQuery({
    queryKey: ["similarPoints", debouncedContent] as const,
    queryFn: async ({ queryKey: [, query] }) => {
      if (!query) return [] as SimilarPointsResult[];

      const similarPoints = await fetchSimilarPoints({ query });

      similarPoints.forEach((point) => {
        prefetchPoint(point.pointId);
      });

      return similarPoints;
    },
    enabled: debouncedContent.length >= POINT_MIN_LENGTH,
  });

  const { mutateAsync: makePoint, isPending: isMakingPoint } = useMakePoint();
  const canMakePoint = content.length >= POINT_MIN_LENGTH && !isMakingPoint && !isLoading;

  const { mutateAsync: reviewPoint, isPending: isReviewing } = useMutation({
    mutationFn: reviewProposedPointAction,
    onSuccess: (results) => {
      setReviewResults(results);
      setReviewDialogOpen(true);
      setLastReviewedContent(content);
      setHasContentBeenReviewed(true);
    },
  });

  const prefetchPoint = usePrefetchPoint();

  const similarPointsToShow = similarPoints ?? [];

  const createPoint = useCallback(async () => {
    const pointId = await makePoint({ content, cred: credInput });
    // Generate a guaranteed unique ID by combining nanoid with timestamp
    const uniqueId = `${nanoid()}-${Date.now()}`;
    addNodes({
      id: uniqueId,
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
      source: uniqueId,
      target: parentNode ? parentNode.id : parentId,
      type: parentId === 'statement' ? 'statement' : 'negation',
    });
    // Delayed needed to avoid race condition
    setTimeout(() => {
      deleteElements({ nodes: [{ id }] });
    }, 50);
  }, [makePoint, content, credInput, addNodes, parentId, positionAbsoluteX, positionAbsoluteY, getNode, addEdges, deleteElements, id]);

  const submitOrReview = useCallback(async () => {
    if (isMakingPoint || isReviewing) return;
    if (hasContentBeenReviewed && content === lastReviewedContent) {
      await createPoint();
    } else {
      const parentNode = getNode(parentId);
      const parentContent = parentNode?.data?.content as string | undefined;
      await reviewPoint({
        pointContent: content,
        parentContent: isParentStatement ? parentContent : undefined,
      });
    }
  }, [isMakingPoint, isReviewing, hasContentBeenReviewed, content, lastReviewedContent, getNode, parentId, reviewPoint, isParentStatement, createPoint]);

  const handleButtonClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (event.altKey) {
      await createPoint();
    } else {
      await submitOrReview();
    }
  };

  const handleTextareaKeyDown = (_e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd+Enter submission removed
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setContent(suggestion);
    setLastReviewedContent(suggestion);
    setHasContentBeenReviewed(true);
    setReviewDialogOpen(false);
  };

  const handleSubmitOriginal = async () => {
    // Keep original text and return to editor; allow user to submit after review
    setLastReviewedContent(content);
    setHasContentBeenReviewed(true);
    setReviewDialogOpen(false);
  };

  const handleSelectExisting = (pointId: number) => {
    // Remove from collapsed set if it was there
    setCollapsedPointIds(prev => {
      const newSet = new Set(prev);
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      newSet.delete(pointId);
      return newSet;
    });

    // Generate a guaranteed unique ID by combining nanoid with timestamp
    const uniqueId = `${nanoid()}-${Date.now()}`;

    // Add the existing point in its new position
    addNodes({
      id: uniqueId,
      data: { pointId, parentId, content, hasContent: true },
      type: "point",
      position: {
        x: positionAbsoluteX,
        y: positionAbsoluteY,
      },
    });

    addEdges({
      id: nanoid(),
      source: uniqueId,
      target: parentId,
      type: parentId === 'statement' ? 'statement' : 'negation',
    });

    // Remove the add point node
    deleteElements({ nodes: [{ id }] });
    setReviewDialogOpen(false);
  };

  return (
    <div
      className={cn(
        "relative bg-background flex flex-col gap-2 rounded-md border-2 border-dashed p-2 min-h-28 w-80"
      )}
    >
      <button
        onClick={() => {
          deleteElements({ nodes: [{ id }] });
        }}
        className="absolute -top-2 -right-2 transform translate-x-[10px] -translate-y-1/2 w-8 h-8 bg-background border-2 border-muted-foreground rounded-full flex items-center justify-center pointer-events-auto z-20 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        title="Cancel point creation"
      >
        <XIcon className="size-4" />
      </button>
      <Handle
        id={`${id}-outgoing-handle`}
        type="source"
        position={Position.Top}
        className="opacity-0 pointer-events-none"
        isConnectable={true}
        isConnectableStart={true}
        isConnectableEnd={true}
      />

      <PointEditor
        className="w-full h-fit"
        content={content}
        setContent={handleContentChange}
        cred={credInput}
        setCred={setCredInput}
        textareaProps={{ onKeyDown: handleTextareaKeyDown }}
        guidanceNotes={<></>}
        compact={true}
        extraCompact={isParentStatement}
        parentNodeType={isParentStatement ? "statement" : undefined}
      />
      <div className="flex justify-between gap-2">
        <div className="flex gap-2">
          <AuthenticatedActionButton
            className="rounded-md"
            onClick={handleButtonClick}
            disabled={!canMakePoint}
            rightLoading={isMakingPoint || isReviewing}
            title={isParentStatement ? "Click to review option, Alt+click to skip review" : "Click to review point, Alt+click to skip review"}
          >
            {buttonText}
          </AuthenticatedActionButton>
        </div>
        {isLoading && <Loader className="m-2" />}
        {similarPointsToShow.length > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Search className="h-3 w-3" />
                <span className="text-xs">{similarPointsToShow.length} existing</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="w-96 p-2  bg-muted rounded-md overflow-clip">
              <DialogTitle className="text-center mt-2">
                Choose Existing Point
              </DialogTitle>
              <DialogDescription className="text-center text-sm text-muted-foreground">
                Select an existing point instead of creating a new one
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
                  {similarPointsToShow.map((point: SimilarPointsResult, index: number) => (
                    <div
                      key={`similar-point-${point.pointId}-${index}`}
                      className="flex flex-col gap-2 p-4  hover:border-muted-foreground  w-full bg-background cursor-pointer border rounded-md"
                      onClick={() => {
                        // Remove from collapsed set if it was there
                        setCollapsedPointIds(prev => {
                          const newSet = new Set(prev);
                          // eslint-disable-next-line drizzle/enforce-delete-with-where
                          newSet.delete(point.pointId);
                          return newSet;
                        });

                        // Generate a guaranteed unique ID by combining nanoid with timestamp
                        const uniqueId = `${nanoid()}-${Date.now()}`;

                        // Add the point in its new position
                        addNodes({
                          id: uniqueId,
                          data: { pointId: point.pointId, parentId, content: point.content, hasContent: true },
                          type: "point",
                          position: {
                            x: positionAbsoluteX,
                            y: positionAbsoluteY,
                          },
                        });

                        addEdges({
                          id: nanoid(),
                          source: uniqueId,
                          target: parentId,
                          type: parentId === 'statement' ? 'statement' : 'negation',
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
                        showSignalBars={true}
                        allCredValues={similarPointsToShow.map(p => p.cred)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <ReviewPointDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        reviewResults={reviewResults}
        isLoading={isReviewing}
        onSelectSuggestion={handleSelectSuggestion}
        onSubmitOriginal={handleSubmitOriginal}
        onSelectExisting={handleSelectExisting}
        pointContent={content}
        isOption={isParentStatement}
      />
    </div>
  );
};
