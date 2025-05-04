"use client";

import { AuthenticatedActionButton } from "@/components/AuthenticatedActionButton";
import { Button } from "@/components/ui/button";
import { POINT_MIN_LENGTH } from "@/constants/config";
import { cn } from "@/lib/cn";
import { Handle, Node, NodeProps, Position, useReactFlow } from "@xyflow/react";
import { XIcon } from "lucide-react";
import { nanoid } from "nanoid";
import { useState, useEffect } from "react";
import { PointEditor } from "@/components/PointEditor";

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

  const handleContentChange = (newContent: string) => {
  };

  const isParentStatement = getNode(parentId)?.type === "statement";
  const buttonText = isParentStatement ? "Add Option" : "Add Point";

  const canAddPoint = content.length >= POINT_MIN_LENGTH;

  const handleAdd = () => {
    const uniqueId = `previewpoint-${nanoid()}`;

    addNodes({
      id: uniqueId,
      type: "point",
      data: { content },
      position: {
        x: positionAbsoluteX,
        y: positionAbsoluteY,
      },
    });

    // Correct edge direction: Parent Node (source) -> New Node (target)
    addEdges({
      id: `edge-${nanoid()}`,
      source: parentId, // Source is the parent node
      sourceHandle: `${parentId}-add-handle`, // originate from parent's arrow handle
      target: uniqueId, // Target is the new point node
      targetHandle: `${uniqueId}-target`, // connect to new node's top handle
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
        cred={0}
        setCred={() => { }}
        guidanceNotes={<></>}
        compact={true}
        extraCompact={isParentStatement}
        parentNodeType={isParentStatement ? "statement" : undefined}
      />
      <div className="flex justify-between gap-2">
        <AuthenticatedActionButton
          className="rounded-md"
          onClick={handleAdd}
          disabled={!canAddPoint}
        >
          {buttonText}
        </AuthenticatedActionButton>
      </div>
    </div>
  );
};
