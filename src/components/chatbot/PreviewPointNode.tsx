"use client";

import {
  XIcon,
  ArrowDownIcon,
  PencilIcon,
  SaveIcon,
} from "lucide-react";
import { Position, NodeProps, useReactFlow, Node, Handle } from "@xyflow/react";
import { cn } from "@/lib/cn";
import { useCallback, useState, useEffect } from "react";
import { nanoid } from 'nanoid';
import { EndorseIcon } from "@/components/icons/EndorseIcon";
import { NegateIcon } from "@/components/icons/NegateIcon";
import { useCredInput } from "@/hooks/useCredInput";
import { useToggle } from "@uidotdev/usehooks";
import { usePrivy } from "@privy-io/react-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CredInput } from "@/components/CredInput";
import { PreviewPointEditor } from "./PreviewPointEditor";

/**
 * Simplified PointNode for RationaleCreator Preview
 */

export type PreviewPointNodeData = {
  content: string;
  cred?: number;
};

export type PreviewPointNode = Node<PreviewPointNodeData, "point">;

export interface PreviewPointNodeProps extends Omit<NodeProps, "data"> {
  data: PreviewPointNodeData;
  positionAbsoluteX: number;
  positionAbsoluteY: number;
}

export const PreviewPointNode = ({
  data: { content, cred },
  id,
  positionAbsoluteX,
  positionAbsoluteY,
}: PreviewPointNodeProps) => {
  const { deleteElements, addNodes, addEdges, updateNodeData, getEdges } = useReactFlow();
  const [endorsePopoverOpen, toggleEndorsePopoverOpen] = useToggle(false);
  const { credInput, setCredInput, notEnoughCred } = useCredInput({
    resetWhen: !endorsePopoverOpen,
  });
  const { user: privyUser, login } = usePrivy();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [isSelling, setIsSelling] = useState(false);

  const hasPositiveCred = cred !== undefined && cred > 0;

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Recursively delete this node and its negation descendants only
    const edges = getEdges();
    const collectDescendants = (nodeId: string, collected: Set<string>) => {
      collected.add(nodeId);
      edges.forEach(edge => {
        // only follow negation edges downward
        if (edge.source === nodeId && edge.type === 'negation' && !collected.has(edge.target)) {
          collectDescendants(edge.target, collected);
        }
      });
    };
    const toDeleteSet = new Set<string>();
    collectDescendants(id, toDeleteSet);
    const nodesToDelete = Array.from(toDeleteSet).map(nodeId => ({ id: nodeId }));
    deleteElements({ nodes: nodesToDelete });
  }, [deleteElements, getEdges, id]);

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

  const handleEndorse = () => {
    const currentCred = cred || 0;
    let newCred: number;

    if (isSelling) {
      newCred = Math.max(0, currentCred - credInput);
    } else {
      newCred = currentCred + credInput;
    }

    if (newCred !== currentCred) {
      updateNodeData(id, { cred: newCred });
    }
    toggleEndorsePopoverOpen(false);
    setIsSelling(false);
    setCredInput(0);
  };

  const handleEditToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing) {
      updateNodeData(id, { content: editedContent });
    }
    setIsEditing(!isEditing);
  };

  useEffect(() => {
    if (!endorsePopoverOpen) {
      setIsSelling(false);
      setCredInput(0);
    }
  }, [endorsePopoverOpen, setIsSelling, setCredInput]);

  return (
    <>
      <div
        className={cn(
          "relative bg-background border-2 rounded-lg p-4 min-h-28 w-64",
          "border-muted-foreground/60 dark:border-muted-foreground/40",
          hasPositiveCred && "border-yellow-500 dark:border-yellow-500",
          "select-none",
          "pb-10"
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

        {/* Edit/Save Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full hover:bg-accent"
          onClick={handleEditToggle}
        >
          {isEditing ? (
            <SaveIcon className="h-4 w-4" />
          ) : (
            <PencilIcon className="h-4 w-4" />
          )}
        </Button>

        {/* Content */}
        <div className="text-sm break-words">
          {isEditing ? (
            <PreviewPointEditor
              content={editedContent}
              setContent={setEditedContent}
              className="min-h-[80px]"
              textareaProps={{
                autoFocus: true,
                onClick: (e) => e.stopPropagation()
              }}
              compact
              extraCompact
            />
          ) : (
            content
          )}
        </div>

        {/* Action Buttons */}
        <div className="absolute bottom-1.5 left-1.5 flex gap-sm text-muted-foreground">
          <Button
            variant="ghost"
            className="p-1 rounded-full size-fit hover:bg-negated/30"
            onClick={handleAddClick}
          >
            <NegateIcon />
          </Button>

          <Popover
            open={endorsePopoverOpen}
            onOpenChange={toggleEndorsePopoverOpen}
          >
            <PopoverTrigger asChild>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  if (privyUser === null) {
                    login();
                    return;
                  }
                  toggleEndorsePopoverOpen();
                }}
                className={cn(
                  "p-1 rounded-full size-fit gap-sm hover:bg-endorsed/30",
                  hasPositiveCred && "text-endorsed"
                )}
                variant="ghost"
              >
                <EndorseIcon
                  className={cn(hasPositiveCred && "fill-current")}
                />
                {hasPositiveCred && (
                  <span className="translate-y-[-1px] ml-1">{cred} cred</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[320px] p-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-3 w-full">
                <CredInput
                  credInput={credInput}
                  setCredInput={setCredInput}
                  notEnoughCred={notEnoughCred}
                  endorsementAmount={cred || 0}
                  isSelling={isSelling}
                  setIsSelling={setIsSelling}
                />
                <Button
                  className="w-full"
                  disabled={
                    credInput === 0 ||
                    (!isSelling && notEnoughCred) ||
                    (isSelling && credInput > (cred || 0))
                  }
                  onClick={handleEndorse}
                >
                  {isSelling ? 'Sell' : 'Endorse'}
                </Button>
                {notEnoughCred && !isSelling && (
                  <span className="text-destructive text-sm">
                    Not enough cred
                  </span>
                )}
                {isSelling && credInput > (cred || 0) && (
                  <span className="text-destructive text-sm">
                    Cannot sell more than endorsed
                  </span>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Handle for adding a new point below */}
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

        {/* Badge based on local cred */}
        {hasPositiveCred && (
          <Badge
            className="absolute hover:bg-yellow-600 bottom-1.5 right-1.5 text-yellow-500 text-xs font-medium bg-yellow-500/80 text-background dark:font-bold leading-none px-1 py-0.5 rounded-[6px] align-middle"
          >
            {cred} cred
          </Badge>
        )}
      </div>
    </>
  );
};


