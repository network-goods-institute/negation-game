import {
  XIcon,
  ArrowDownIcon,
} from "lucide-react";
import { Position, NodeProps, useReactFlow, Node, Handle } from "@xyflow/react";
import { cn } from "@/lib/cn";
import { useCallback } from "react";
import { nanoid } from 'nanoid';

/**
 * Simplified PointNode for RationaleCreator Preview
 */

export type PreviewPointNodeData = {
  content: string;
};

export type PreviewPointNode = Node<PreviewPointNodeData, "point">;

export interface PreviewPointNodeProps extends Omit<NodeProps, "data"> {
  data: PreviewPointNodeData;
  positionAbsoluteX: number;
  positionAbsoluteY: number;
}

export const PreviewPointNode = ({
  data: { content },
  id,
  positionAbsoluteX,
  positionAbsoluteY,
}: PreviewPointNodeProps) => {

  const { deleteElements, addNodes, addEdges } = useReactFlow();

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  }, [deleteElements, id]);

  const handleAddClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newNodeId = `previewaddpoint-${nanoid()}`;
    addNodes({
      id: newNodeId,
      type: "addPoint",
      position: {
        x: positionAbsoluteX,
        y: positionAbsoluteY + 100,
      },
      data: {
        parentId: id,
      },
    });
    addEdges({
      id: `edge-${nanoid()}`,
      source: id,
      sourceHandle: `${id}-add-handle`,
      target: newNodeId,
      targetHandle: `${newNodeId}-target`,
      type: 'negation',
    });
  }, [addNodes, addEdges, id, positionAbsoluteX, positionAbsoluteY]);

  return (
    <>
      <div
        className={cn(
          "relative bg-background border-2 rounded-lg p-4 min-h-28 w-64",
          "border-muted-foreground/60 dark:border-muted-foreground/40",
          "select-none"
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
        {/* Top X Handle for Deletion */}
        <Handle
          id={`${id}-delete-handle`}
          type="source"
          position={Position.Top}
          className="pt-1 pb-0.5 px-2 translate-y-[-100%] -translate-x-1/2 size-fit bg-muted text-center border-2 border-b-0 rounded-t-full pointer-events-auto !cursor-pointer"
          isConnectable={false}
          onClick={handleDelete}
        >
          <XIcon className="size-4" />
        </Handle>

        {/* Content */}
        <div className="text-sm break-words">
          {content}
        </div>

        {/* Handle for adding a new point below (acts as the sole source handle) */}
        <Handle
          type="source"
          position={Position.Bottom}
          id={`${id}-add-handle`}
          className="pb-1 pt-0.5 px-2 translate-y-[100%] -translate-x-1/2 size-fit bg-muted text-center border-border border-2 rounded-b-full pointer-events-auto !cursor-pointer"
          isConnectable={false}
          onClick={handleAddClick}
        >
          <ArrowDownIcon className="size-4" />
        </Handle>
      </div>
    </>
  );
};


