"use client";

import { cn } from "@/lib/cn";
import {
  Handle,
  Node,
  NodeProps,
  Position,
  useReactFlow,
} from "@xyflow/react";
import { ArrowDownIcon, PencilIcon, SaveIcon } from "lucide-react";
import { nanoid } from 'nanoid';
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Simplified StatementNode for RationaleCreator Preview
 */

export type PreviewStatementNodeData = {
  statement: string;
  linkUrl?: string;
};

export type PreviewStatementNode = Node<PreviewStatementNodeData, "statement">;

export interface PreviewStatementNodeProps extends Omit<NodeProps, "data"> {
  data: PreviewStatementNodeData;
  positionAbsoluteX: number;
  positionAbsoluteY: number;
}

export const PreviewStatementNode = ({
  data: { statement },
  id,
  positionAbsoluteX,
  positionAbsoluteY,
}: PreviewStatementNodeProps) => {
  const { addNodes, addEdges, updateNodeData } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [editedStatement, setEditedStatement] = useState(statement);

  const handleAddClick = () => {
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
      type: 'statement'
    });
  };

  const handleEditToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing) {
      // Save changes
      updateNodeData(id, { statement: editedStatement });
    }
    setIsEditing(!isEditing);
  };

  return (
    <div
      className={cn(
        "relative bg-accent/20 rounded-md border-2 min-h-18 w-96 flex items-center p-4 justify-center flex-grow",
        "select-none"
      )}
    >
      {/* Edit/Save Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full hover:bg-accent/80"
        onClick={handleEditToggle}
      >
        {isEditing ? (
          <SaveIcon className="h-4 w-4" />
        ) : (
          <PencilIcon className="h-4 w-4" />
        )}
      </Button>

      {/* Incoming Connection Handle (Hidden Dot) */}
      <Handle
        type="target"
        position={Position.Top}
        id={`${id}-target`}
        className="opacity-0 pointer-events-none"
        isConnectable={true}
      />

      {/* Content */}
      <div className="text-accent-foreground font-medium text-center">
        {isEditing ? (
          <Textarea
            value={editedStatement}
            onChange={(e) => setEditedStatement(e.target.value)}
            className="min-h-[80px] resize-none bg-transparent border-none focus-visible:ring-0 text-center"
            placeholder="Enter the topic or question this rationale explores..."
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          statement
        )}
      </div>

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
  );
};
