"use client";

import { AuthenticatedActionButton } from "@/components/AuthenticatedActionButton";
import { Button } from "@/components/ui/button";
import { POINT_MIN_LENGTH } from "@/constants/config";
import { cn } from "@/lib/cn";
import { Handle, Node, NodeProps, Position, useReactFlow } from "@xyflow/react";
import { XIcon } from "lucide-react";
import { nanoid } from "nanoid";
import { useState } from "react";
import { PointEditor } from "@/components/PointEditor";
import { useCredInput } from "@/hooks/useCredInput";
import { fetchPoint } from "@/actions/fetchPoint";
import { fetchUserEndorsements } from "@/actions/fetchUserEndorsements";
import { usePrivy } from "@privy-io/react-auth";
import {
  fetchSimilarPoints,
  SimilarPointsResult,
} from "@/actions/fetchSimilarPoints";
import { useDebounce } from "@uidotdev/usehooks";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { PointStats } from "@/components/PointStats";

/**
 * Simplified AddPointNode for RationaleCreator Preview
 */

export type PreviewAddPointNodeData = {
  parentId: string;
};

export type PreviewAddPointNode = Node<PreviewAddPointNodeData, "addPoint">;

export interface PreviewAddPointNodeProps extends Omit<NodeProps, "data"> {
  data: PreviewAddPointNodeData;
  positionAbsoluteX: number;
  positionAbsoluteY: number;
}

export const PreviewAddPointNode = ({
  id,
  data: { parentId },
  positionAbsoluteX,
  positionAbsoluteY,
}: PreviewAddPointNodeProps) => {
  const { deleteElements, addEdges, addNodes, getNode } = useReactFlow();
  const [content, setContent] = useState("");
  const { credInput, setCredInput, notEnoughCred } = useCredInput();
  const { user: privyUser } = usePrivy();
  const debouncedContent = useDebounce(content, 1000);

  const { data: similarPoints, isLoading } = useQuery({
    queryKey: ["preview-similar", debouncedContent],
    queryFn: async () => {
      if (debouncedContent.length < POINT_MIN_LENGTH) return [] as SimilarPointsResult[];
      return await fetchSimilarPoints({ query: debouncedContent });
    },
    enabled: debouncedContent.length >= POINT_MIN_LENGTH,
  });

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };

  const isParentStatement = getNode(parentId)?.type === "statement";
  const buttonText = isParentStatement ? "Add Option" : "Add Point";

  const canAddPoint = content.length >= POINT_MIN_LENGTH;

  const handleAdd = async () => {
    let nodeContent = content;
    let nodeCred = credInput;
    const numericId = Number(content.trim());
    if (!isNaN(numericId)) {
      // Content is a point ID: fetch point and user endorsement
      try {
        const existing = await fetchPoint(numericId);
        if (existing?.content) {
          nodeContent = existing.content;
        }
        if (privyUser?.id) {
          const endorsements = await fetchUserEndorsements(privyUser.id, [numericId]);
          nodeCred = endorsements?.[0]?.cred ?? 0;
        }
      } catch {
        // fallback to entered values
      }
    }

    const uniqueId = `previewpoint-${nanoid()}`;
    addNodes({
      id: uniqueId,
      type: "point",
      data: {
        content: nodeContent,
        cred: nodeCred > 0 ? nodeCred : undefined,
      },
      position: {
        x: positionAbsoluteX,
        y: positionAbsoluteY,
      },
    });

    addEdges({
      id: `edge-${nanoid()}`,
      source: parentId,
      sourceHandle: `${parentId}-add-handle`,
      target: uniqueId,
      targetHandle: `${uniqueId}-target`,
      type: "negation",
    });

    deleteElements({ nodes: [{ id }] });
  };

  return (
    <div
      className={cn(
        "relative bg-background flex flex-col gap-2 rounded-md border-2 border-dashed p-2 min-h-28 w-64"
      )}
    >
      {/* Incoming Connection Handle (Hidden Dot) */}
      <Handle
        type="target"
        position={Position.Top}
        id={`${id}-target`}
        className="opacity-0 pointer-events-none"
        isConnectable={true}
      />
      <Handle
        id={`${id}-delete-handle`}
        type="source"
        position={Position.Top}
        className="-z-10 pt-1 pb-0.5 px-2 translate-y-[-100%] -translate-x-1/2 size-fit bg-muted text-center border-2 border-b-0 rounded-t-full pointer-events-auto !cursor-pointer"
        isConnectable={false}
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
        allowZero={false}
      />

      <div className="flex justify-between gap-2">
        <div className="flex gap-2">
          <AuthenticatedActionButton
            className="rounded-md"
            onClick={handleAdd}
            disabled={!canAddPoint || (credInput > 0 && notEnoughCred)}
          >
            {buttonText}
          </AuthenticatedActionButton>
        </div>
        {isLoading && <Loader className="m-2" />}
        {similarPoints && similarPoints.length > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <Button size={"icon"}>{similarPoints.length}</Button>
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
                  {similarPoints.map((point: SimilarPointsResult, index: number) => (
                    <div
                      key={`similar-point-${point.pointId}-${index}`}
                      className="flex flex-col gap-2 p-4  hover:border-muted-foreground  w-full bg-background cursor-pointer border rounded-md"
                      onClick={() => {
                        const uniqueId = `${nanoid()}-${Date.now()}`;
                        addNodes({
                          id: uniqueId,
                          type: "point",
                          data: {
                            pointId: point.pointId,
                            content: point.content,
                            hasContent: true,
                          },
                          position: {
                            x: positionAbsoluteX,
                            y: positionAbsoluteY,
                          },
                        });
                        addEdges({
                          id: `edge-${nanoid()}`,
                          source: parentId,
                          sourceHandle: `${parentId}-add-handle`,
                          target: uniqueId,
                          targetHandle: `${uniqueId}-target`,
                          type: "negation",
                        });
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
